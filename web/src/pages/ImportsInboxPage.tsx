import { useCallback, useEffect, useMemo, useState } from "react";
import { CategoryIcon } from "../components/CategoryIcon";
import {
  deleteInboxImport,
  listInboxImports,
  putInboxImport,
} from "../db/database";
import { localNowIso } from "../lib/datetime";
import { formatCurrency, parseAmount } from "../lib/format";
import { annotateInboxDuplicates } from "../lib/import/inbox";
import { suggestCategoryId } from "../lib/import/suggestCategory";
import type { InboxImportItem } from "../lib/import/inboxTypes";
import { useLedger } from "../store/LedgerContext";
import type { TransactionType } from "../types";
import { TRANSACTION_TYPE_LABEL } from "../types";

interface ImportsInboxPageProps {
  onClose: () => void;
  highlightId?: string | null;
  onConsumedHighlight?: () => void;
}

export function ImportsInboxPage({
  onClose,
  highlightId,
  onConsumedHighlight,
}: ImportsInboxPageProps) {
  const { categories, transactions, upsertTransaction, loading } = useLedger();
  const [items, setItems] = useState<InboxImportItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(highlightId ?? null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const raw = await listInboxImports();
    const pending = raw.filter((i) => i.status === "pending");
    setItems(annotateInboxDuplicates(pending, transactions));
  }, [transactions]);

  useEffect(() => {
    if (loading) return;
    void refresh();
  }, [loading, refresh]);

  useEffect(() => {
    if (highlightId) setExpandedId(highlightId);
  }, [highlightId]);

  const pendingCount = items.length;

  const categoryChips = useMemo(
    () => (type: TransactionType) => categories.filter((c) => c.type === type),
    [categories],
  );

  async function skipItem(id: string) {
    const row = items.find((i) => i.id === id);
    if (!row) return;
    await putInboxImport({ ...row, status: "skipped" });
    if (expandedId === id) setExpandedId(null);
    if (highlightId === id) onConsumedHighlight?.();
    await refresh();
  }

  async function confirmItem(
    id: string,
    patch: { amount: number; type: TransactionType; categoryId: string; note: string },
  ) {
    setBusy(true);
    setError(null);
    try {
      await upsertTransaction({
        amount: patch.amount,
        type: patch.type,
        categoryId: patch.categoryId,
        date: items.find((i) => i.id === id)?.date ?? localNowIso(),
        note: patch.note,
      });
      await deleteInboxImport(id);
      if (highlightId === id) onConsumedHighlight?.();
      setExpandedId(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="import-page" data-testid="imports-inbox-page">
      <header className="toolbar toolbar--sheet">
        <button type="button" className="btn-text" onClick={onClose}>返回</button>
        <h1>匯入紀錄</h1>
        <span className="inbox-count" data-testid="inbox-pending-count">
          {pendingCount}
        </span>
      </header>

      <div className="import-body pad-horizontal">
        <p className="muted">
          來自通知捷徑的待確認項目。確認後才會寫入帳本；與既有交易重複的項目可略過或合併。
        </p>

        {pendingCount === 0 && (
          <p className="center muted" data-testid="inbox-empty">目前沒有待匯入項目</p>
        )}

        <ul className="inbox-list">
          {items.map((row) => (
            <InboxRow
              key={row.id}
              row={row}
              expanded={expandedId === row.id}
              onToggle={() =>
                setExpandedId((cur) => (cur === row.id ? null : row.id))
              }
              categories={categoryChips(row.type)}
              allCategories={categories}
              transactions={transactions}
              onSkip={() => void skipItem(row.id)}
              onConfirm={(patch) => void confirmItem(row.id, patch)}
              busy={busy}
            />
          ))}
        </ul>

        {error && (
          <p className="form-error" role="alert">{error}</p>
        )}
      </div>
    </div>
  );
}

function InboxRow({
  row,
  expanded,
  onToggle,
  categories,
  allCategories,
  transactions,
  onSkip,
  onConfirm,
  busy,
}: {
  row: InboxImportItem;
  expanded: boolean;
  onToggle: () => void;
  categories: ReturnType<typeof useLedger>["categories"];
  allCategories: ReturnType<typeof useLedger>["categories"];
  transactions: ReturnType<typeof useLedger>["transactions"];
  onSkip: () => void;
  onConfirm: (patch: {
    amount: number;
    type: TransactionType;
    categoryId: string;
    note: string;
  }) => void;
  busy: boolean;
}) {
  const [type, setType] = useState<TransactionType>(row.type);
  const [amountText, setAmountText] = useState(
    row.amount != null ? String(row.amount) : "",
  );
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState(row.merchant);

  const isDup = Boolean(row.duplicateLedgerTxId);
  const dupTx = transactions.find((t) => t.id === row.duplicateLedgerTxId);

  const suggested = useMemo(
    () =>
      suggestCategoryId(row.merchant, row.merchant, type, allCategories, transactions) ??
      categories.find((c) => c.name === (type === "income" ? "其他收入" : "其他"))?.id ??
      categories[0]?.id ??
      "",
    [row.merchant, type, allCategories, transactions, categories],
  );

  useEffect(() => {
    const valid = categories.some((c) => c.id === categoryId);
    if (suggested && (!categoryId || !valid)) {
      setCategoryId(suggested);
      return;
    }
    if (!valid && categories[0]) setCategoryId(categories[0].id);
  }, [type, categories, categoryId, suggested]);

  const merchantLabel = row.merchant.trim() || "（未解析商戶）";
  const amountPreview =
    parseAmount(amountText) != null && parseAmount(amountText)! > 0
      ? formatCurrency(parseAmount(amountText)!)
      : null;

  return (
    <li
      className={`inbox-row ${isDup ? "inbox-row--dup" : ""} ${expanded ? "inbox-row--open" : ""}`}
      data-testid="inbox-row"
      data-inbox-id={row.id}
    >
      <button type="button" className="inbox-row__summary" onClick={onToggle}>
        <div>
          <p className="inbox-row__merchant">{merchantLabel}</p>
          <p className="inbox-row__meta muted">
            {row.source === "notification" ? "通知" : "捷徑"}
            {isDup && " · 可能重複"}
          </p>
        </div>
        <span className="inbox-row__amount tabular">
          {row.amount != null ? formatCurrency(row.amount) : "—"}
        </span>
      </button>

      {expanded && (
        <div className="inbox-row__detail" data-testid="inbox-row-detail">
          {row.amountMissing && (
            <div className="deeplink-banner" data-testid="deeplink-missing-amount">
              未解析到金額，請手動輸入
            </div>
          )}
          {isDup && dupTx && (
            <p className="inbox-dup-hint" data-testid="inbox-duplicate-hint">
              與帳本「{dupTx.note || "（無備註）"}」{formatCurrency(dupTx.amount)} 相似，可略過避免重複。
            </p>
          )}

          <label className="field field--hero">
            <span>金額</span>
            <div className="amount-input amount-input--hero">
              <span className="amount-input__prefix">HK$</span>
              <input
                inputMode="decimal"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                data-testid="tx-amount"
              />
            </div>
            {amountPreview && <p className="amount-preview">{amountPreview}</p>}
          </label>

          <label className="field">
            <span>商戶／備註</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} />
          </label>

          <div className="field">
            <span>類型</span>
            <div className="segmented segmented--pill">
              {(["expense", "income"] as TransactionType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={type === t ? "active" : ""}
                  onClick={() => setType(t)}
                >
                  {TRANSACTION_TYPE_LABEL[t]}
                </button>
              ))}
            </div>
            <div className="category-chips">
              {categories.map((c) => (
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

          <details className="deeplink-debug" data-testid="deeplink-raw-params">
            <summary>原始資料</summary>
            <pre>{row.rawParamsDebug}</pre>
          </details>

          <div className="inbox-row__actions">
            <button
              type="button"
              className="btn-secondary"
              data-testid="inbox-skip"
              disabled={busy}
              onClick={onSkip}
            >
              略過
            </button>
            {isDup ? (
              <button
                type="button"
                className="btn-primary"
                data-testid="inbox-merge-skip"
                disabled={busy}
                onClick={onSkip}
              >
                合併（略過重複）
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary"
                data-testid="deeplink-confirm-save"
                disabled={busy}
                onClick={() => {
                  const amount = parseAmount(amountText);
                  if (amount == null || amount <= 0 || !categoryId) return;
                  onConfirm({ amount, type, categoryId, note: note.trim() });
                }}
              >
                確認入帳
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
