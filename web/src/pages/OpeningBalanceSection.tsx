import { useEffect, useState } from "react";
import { formatCurrency } from "../lib/format";
import { parseOpeningBalanceInput } from "../lib/openingBalance";
import { useLedger } from "../store/LedgerContext";

export function OpeningBalanceSection() {
  const { openingBalance, setOpeningBalanceAmount } = useLedger();
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) {
      setInput(
        openingBalance != null ? String(openingBalance.amount) : "",
      );
    }
  }, [openingBalance, editing]);

  async function handleSave() {
    const trimmed = input.trim();
    if (!trimmed) {
      setSaving(true);
      try {
        await setOpeningBalanceAmount(null);
        setEditing(false);
        setError(null);
      } finally {
        setSaving(false);
      }
      return;
    }
    const amount = parseOpeningBalanceInput(trimmed);
    if (amount === null) {
      setError("請輸入有效金額（可含小數與逗號）。");
      return;
    }
    setSaving(true);
    try {
      await setOpeningBalanceAmount(amount);
      setEditing(false);
      setError(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="section" data-testid="opening-balance-section">
      <h3 className="settings-subheading" data-testid="opening-balance-heading">
        期初結餘
      </h3>
      <div className="card backup-card">
        <p className="hint">
          記帳開始前的結餘，只會加在「所有結餘」，不會算作收入或影響每月報表。
        </p>
        {!editing ? (
          <>
            <p className="opening-balance__value tabular" data-testid="opening-balance-display">
              {openingBalance != null
                ? formatCurrency(openingBalance.amount)
                : "尚未設定"}
            </p>
            <div className="opening-balance__actions">
              <button
                type="button"
                className="btn-primary"
                data-testid="opening-balance-edit"
                onClick={() => setEditing(true)}
              >
                {openingBalance != null ? "編輯" : "設定"}
              </button>
              {openingBalance != null && (
                <button
                  type="button"
                  className="btn-secondary"
                  data-testid="opening-balance-clear"
                  onClick={() => void setOpeningBalanceAmount(null)}
                >
                  清除
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <label className="field">
              <span>金額 (HKD)</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="例如 95232.4"
                value={input}
                data-testid="opening-balance-input"
                onChange={(e) => {
                  setInput(e.target.value);
                  setError(null);
                }}
              />
            </label>
            {error && (
              <p className="hint hint--warn" role="alert" data-testid="opening-balance-error">
                {error}
              </p>
            )}
            <div className="opening-balance__actions">
              <button
                type="button"
                className="btn-primary"
                data-testid="opening-balance-save"
                disabled={saving}
                onClick={() => void handleSave()}
              >
                儲存
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setEditing(false);
                  setError(null);
                }}
              >
                取消
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
