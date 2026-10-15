import { useEffect, useMemo, useRef, useState } from "react";
import { CategoryIcon } from "./CategoryIcon";
import type { DeepLinkPayload } from "../lib/deeplink";
import { localNowIso } from "../lib/datetime";
import { formatCurrency, parseAmount } from "../lib/format";
import { suggestCategoryId } from "../lib/import/suggestCategory";
import { useLedger } from "../store/LedgerContext";
import type { TransactionType } from "../types";
import { TRANSACTION_TYPE_LABEL } from "../types";

interface DeepLinkConfirmSheetProps {
  deepLink: DeepLinkPayload;
  onClose: () => void;
  onSaved?: () => void;
}

export function DeepLinkConfirmSheet({
  deepLink,
  onClose,
  onSaved,
}: DeepLinkConfirmSheetProps) {
  const { categories, transactions, upsertTransaction } = useLedger();
  const [visible, setVisible] = useState(false);
  const [type, setType] = useState<TransactionType>(deepLink.type);
  const [amountText, setAmountText] = useState(
    deepLink.amount != null ? String(deepLink.amount) : "",
  );
  const [categoryId, setCategoryId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  const filtered = categories.filter((c) => c.type === type);

  const suggestedCategoryId = useMemo(() => {
    const fallback = categories.find(
      (c) =>
        c.type === type && c.name === (type === "income" ? "其他收入" : "其他"),
    );
    return (
      suggestCategoryId(
        deepLink.merchant,
        deepLink.merchant,
        type,
        categories,
        transactions,
      ) ?? fallback?.id ?? null
    );
  }, [categories, transactions, deepLink.merchant, type]);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    if (suggestedCategoryId && categoryId !== suggestedCategoryId) {
      const stillValid = filtered.some((c) => c.id === categoryId);
      if (!categoryId || !stillValid) {
        setCategoryId(suggestedCategoryId);
        return;
      }
    }
    if (!filtered.some((c) => c.id === categoryId)) {
      const other = filtered.find((c) =>
        c.name === (type === "income" ? "其他收入" : "其他"),
      );
      setCategoryId(other?.id ?? filtered[0]?.id ?? "");
    }
  }, [type, filtered, categoryId, suggestedCategoryId]);

  useEffect(() => {
    if (deepLink.amountMissing) {
      const t = window.setTimeout(() => amountInputRef.current?.focus(), 80);
      return () => window.clearTimeout(t);
    }
  }, [deepLink.amountMissing]);

  const merchantLabel = deepLink.merchant.trim() || "（未收到商戶名稱）";
  const parsedAmount = parseAmount(amountText);
  const amountPreview =
    parsedAmount != null && parsedAmount > 0
      ? formatCurrency(parsedAmount)
      : null;

  function dismiss() {
    setVisible(false);
    window.setTimeout(onClose, 220);
  }

  async function confirmSave() {
    const amount = parseAmount(amountText);
    if (amount === null || amount <= 0) {
      setError("請輸入有效金額");
      amountInputRef.current?.focus();
      return;
    }
    if (!categoryId) {
      setError("請選擇分類");
      return;
    }
    await upsertTransaction({
      amount,
      type,
      categoryId,
      date: deepLink.date ?? localNowIso(),
      note: deepLink.merchant.trim(),
    });
    onSaved?.();
    dismiss();
  }

  const selectedCategory = categories.find((c) => c.id === categoryId);

  return (
    <div
      className={`sheet-root deeplink-confirm ${visible ? "sheet-root--open" : ""}`}
      data-testid="deeplink-confirm-sheet"
    >
      <button
        type="button"
        className="sheet-backdrop"
        aria-label="關閉"
        onClick={dismiss}
      />
      <div
        className="sheet-panel sheet-panel--confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="deeplink-confirm-title"
      >
        <div className="sheet-grabber" aria-hidden />
        <header className="deeplink-confirm__header">
          <h1 id="deeplink-confirm-title">確認入帳</h1>
          <p className="deeplink-confirm__subtitle">捷徑帶入的交易，請核對後儲存</p>
        </header>

        <div className="deeplink-confirm__body">
          {deepLink.amountMissing && (
            <div
              className="deeplink-banner"
              role="status"
              data-testid="deeplink-missing-amount"
            >
              捷徑未傳入金額，請輸入
            </div>
          )}

          <div className="deeplink-confirm__merchant" data-testid="deeplink-confirm-merchant">
            <span className="deeplink-confirm__label">商戶</span>
            <p className="deeplink-confirm__merchant-name">{merchantLabel}</p>
          </div>

          <label className="field field--hero deeplink-confirm__amount">
            <span>金額</span>
            <div className="amount-input amount-input--hero">
              <span className="amount-input__prefix">HK$</span>
              <input
                ref={amountInputRef}
                inputMode="decimal"
                placeholder="0"
                value={amountText}
                onChange={(e) => {
                  setAmountText(e.target.value);
                  setError(null);
                }}
                data-testid="tx-amount"
                autoFocus={!deepLink.amountMissing}
              />
            </div>
            {amountPreview && (
              <p className="amount-preview" data-testid="deeplink-confirm-amount-preview">
                {amountPreview}
              </p>
            )}
          </label>

          <div className="field">
            <span>建議分類</span>
            <div className="segmented segmented--pill deeplink-confirm__type">
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
            {selectedCategory && (
              <p className="deeplink-confirm__category-hint muted">
                將記入「{selectedCategory.name}」
              </p>
            )}
          </div>

          <details className="deeplink-debug" data-testid="deeplink-raw-params">
            <summary>收到的資料</summary>
            <pre>{deepLink.rawParamsDebug}</pre>
          </details>

          {error && (
            <p className="form-error" role="alert" data-testid="deeplink-confirm-error">
              {error}
            </p>
          )}
        </div>

        <footer className="deeplink-confirm__actions">
          <button
            type="button"
            className="btn-secondary deeplink-confirm__cancel"
            data-testid="deeplink-confirm-cancel"
            onClick={dismiss}
          >
            取消
          </button>
          <button
            type="button"
            className="btn-primary deeplink-confirm__save"
            data-testid="deeplink-confirm-save"
            onClick={() => void confirmSave()}
          >
            確認入帳
          </button>
        </footer>
      </div>
    </div>
  );
}
