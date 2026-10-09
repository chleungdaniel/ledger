import { useEffect, useRef, useState } from "react";
import { CategoryIcon } from "../components/CategoryIcon";
import { parseAmount, formatCurrency } from "../lib/format";
import { useLedger } from "../store/LedgerContext";
import type { Transaction, TransactionType } from "../types";
import { TRANSACTION_TYPE_LABEL } from "../types";

export interface TransactionFormPreset {
  type?: TransactionType;
  amount?: number | null;
  note?: string;
  date?: string | null;
  categoryId?: string | null;
  autoSave?: boolean;
  fromDeepLink?: boolean;
  amountMissingBanner?: boolean;
  debugRawParams?: string;
}

interface TransactionFormPageProps {
  initialType?: TransactionType;
  transaction?: Transaction;
  preset?: TransactionFormPreset;
  onClose: () => void;
  onSaved?: () => void;
}

export function TransactionFormPage({
  initialType = "expense",
  transaction,
  preset,
  onClose,
  onSaved,
}: TransactionFormPageProps) {
  const { categories, upsertTransaction, removeTransaction } = useLedger();
  const [type, setType] = useState<TransactionType>(
    transaction?.type ?? preset?.type ?? initialType,
  );
  const [amountText, setAmountText] = useState(
    transaction
      ? String(transaction.amount)
      : preset?.amount != null
        ? String(preset.amount)
        : "",
  );
  const [categoryId, setCategoryId] = useState(
    transaction?.categoryId ?? preset?.categoryId ?? "",
  );
  const [date, setDate] = useState(
    transaction
      ? transaction.date.slice(0, 16)
      : preset?.date
        ? preset.date.slice(0, 16)
        : new Date().toISOString().slice(0, 16),
  );
  const [note, setNote] = useState(transaction?.note ?? preset?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  const filtered = categories.filter((c) => c.type === type);
  const autoSaveOnce = useRef(false);
  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    if (preset?.amountMissingBanner) {
      const t = window.setTimeout(() => amountInputRef.current?.focus(), 80);
      return () => window.clearTimeout(t);
    }
  }, [preset?.amountMissingBanner]);

  useEffect(() => {
    if (
      preset?.categoryId &&
      filtered.some((c) => c.id === preset.categoryId)
    ) {
      setCategoryId(preset.categoryId);
      return;
    }
    if (!filtered.some((c) => c.id === categoryId)) {
      const other = filtered.find((c) =>
        c.name === (type === "income" ? "其他收入" : "其他"),
      );
      setCategoryId(other?.id ?? filtered[0]?.id ?? "");
    }
  }, [type, filtered, categoryId, preset?.categoryId]);

  const title = transaction
    ? "編輯交易"
    : type === "expense"
      ? "新增支出"
      : "新增收入";

  function closeSheet() {
    setVisible(false);
    window.setTimeout(onClose, 220);
  }

  async function save() {
    const amount = parseAmount(amountText);
    if (amount === null || amount <= 0) {
      setError("金額必須大於 0");
      return;
    }
    if (!categoryId) {
      setError("請選擇分類");
      return;
    }
    await upsertTransaction({
      id: transaction?.id,
      amount,
      type,
      categoryId,
      date: new Date(date).toISOString(),
      note: note.trim(),
    });
    onSaved?.();
    closeSheet();
  }

  useEffect(() => {
    if (!preset?.autoSave || autoSaveOnce.current || transaction) return;
    if (!categoryId || !amountText) return;
    const amount = parseAmount(amountText);
    if (amount == null || amount <= 0) return;
    autoSaveOnce.current = true;
    void save();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot auto save on open
  }, [preset?.autoSave, categoryId, amountText, transaction]);

  const preview =
    parseAmount(amountText) != null && parseAmount(amountText)! > 0
      ? formatCurrency(parseAmount(amountText)!)
      : null;

  return (
    <div
      className={`sheet-root ${visible ? "sheet-root--open" : ""}`}
      data-testid={preset?.fromDeepLink ? "tx-form-deeplink" : "tx-form-sheet"}
    >
      <button
        type="button"
        className="sheet-backdrop"
        aria-label="關閉"
        onClick={closeSheet}
      />
      <div className="sheet-panel" role="dialog" aria-modal="true" aria-labelledby="tx-form-title">
        <div className="sheet-grabber" aria-hidden />
        <header className="toolbar toolbar--sheet">
          <button type="button" className="btn-text" onClick={closeSheet}>
            取消
          </button>
          <h1 id="tx-form-title">{title}</h1>
          <button
            type="button"
            className="btn-text btn-text--primary"
            data-testid="tx-save"
            onClick={() => void save()}
          >
            儲存
          </button>
        </header>

        <div className="form-stack">
          {preset?.amountMissingBanner && (
            <div
              className="deeplink-banner"
              role="status"
              data-testid="deeplink-missing-amount"
            >
              捷徑未傳入金額，請輸入
            </div>
          )}
          {preset?.debugRawParams && (
            <details className="deeplink-debug" data-testid="deeplink-raw-params">
              <summary>收到的資料</summary>
              <pre>{preset.debugRawParams}</pre>
            </details>
          )}
          <div className="segmented segmented--pill">
            {(["expense", "income"] as TransactionType[]).map((t) => (
              <button
                key={t}
                type="button"
                className={type === t ? "active" : ""}
                data-type={t}
                onClick={() => setType(t)}
              >
                {TRANSACTION_TYPE_LABEL[t]}
              </button>
            ))}
          </div>

          <label className="field field--hero">
            <span>金額</span>
            <div className="amount-input amount-input--hero">
              <span className="amount-input__prefix">HK$</span>
              <input
                ref={amountInputRef}
                inputMode="decimal"
                placeholder="0"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                data-testid="tx-amount"
                autoFocus={!preset?.amountMissingBanner}
              />
            </div>
            {preview && <p className="amount-preview">{preview}</p>}
          </label>

          <div className="field">
            <span>分類</span>
            <div className="category-chips" data-testid="tx-category-chips">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`category-chip ${categoryId === c.id ? "active" : ""}`}
                  data-testid={`tx-cat-${c.name}`}
                  onClick={() => setCategoryId(c.id)}
                >
                  <CategoryIcon name={c.iconName} size="sm" />
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <label className="field">
            <span>日期</span>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          <label className="field">
            <span>備註</span>
            <textarea
              rows={3}
              placeholder="選填"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>

          {error && <p className="form-error" role="alert">{error}</p>}

          {transaction && (
            <button
              type="button"
              className="btn-danger"
              onClick={() => void removeTransaction(transaction.id).then(closeSheet)}
            >
              刪除此交易
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
