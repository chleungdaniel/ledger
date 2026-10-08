import { useEffect, useState } from "react";
import { parseAmount } from "../lib/format";
import { useLedger } from "../store/LedgerContext";
import type { Transaction, TransactionType } from "../types";
import { TRANSACTION_TYPE_LABEL } from "../types";

interface TransactionFormPageProps {
  initialType?: TransactionType;
  transaction?: Transaction;
  onClose: () => void;
  onSaved?: () => void;
}

export function TransactionFormPage({
  initialType = "expense",
  transaction,
  onClose,
  onSaved,
}: TransactionFormPageProps) {
  const { categories, upsertTransaction, removeTransaction } = useLedger();
  const [type, setType] = useState<TransactionType>(transaction?.type ?? initialType);
  const [amountText, setAmountText] = useState(
    transaction ? String(transaction.amount) : "",
  );
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? "");
  const [date, setDate] = useState(
    transaction
      ? transaction.date.slice(0, 16)
      : new Date().toISOString().slice(0, 16),
  );
  const [note, setNote] = useState(transaction?.note ?? "");
  const [error, setError] = useState<string | null>(null);

  const filtered = categories.filter((c) => c.type === type);

  useEffect(() => {
    if (!filtered.some((c) => c.id === categoryId)) {
      setCategoryId(filtered[0]?.id ?? "");
    }
  }, [type, filtered, categoryId]);

  const title = transaction
    ? "編輯交易"
    : type === "expense"
      ? "新增支出"
      : "新增收入";

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
    onClose();
  }

  return (
    <div className="full-screen-form">
      <header className="toolbar">
        <button type="button" className="btn-text" onClick={onClose}>取消</button>
        <h1>{title}</h1>
        <button type="button" className="btn-text btn-text--primary" onClick={() => void save()}>
          儲存
        </button>
      </header>

      <div className="form-stack">
        <div className="segmented">
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

        <label className="field">
          <span>金額</span>
          <div className="amount-input">
            <span>HK$</span>
            <input
              inputMode="decimal"
              placeholder="0"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              data-testid="tx-amount"
            />
          </div>
        </label>

        <label className="field">
          <span>分類</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            data-testid="tx-category"
          >
            {filtered.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

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
            onClick={() => void removeTransaction(transaction.id).then(onClose)}
          >
            刪除此交易
          </button>
        )}
      </div>
    </div>
  );
}
