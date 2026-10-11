import { useRef, useState } from "react";
import { CategoryIcon } from "../CategoryIcon";
import type { DayGroup } from "../../lib/groupByDay";
import { formatCurrency } from "../../lib/format";
import type { Category, Transaction } from "../../types";

interface HomeTransactionGroupsProps {
  groups: DayGroup[];
  categoryMap: Map<string, Category>;
  hideAmounts: boolean;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
}

export function HomeTransactionGroups({
  groups,
  categoryMap,
  hideAmounts,
  onEdit,
  onDelete,
}: HomeTransactionGroupsProps) {
  if (groups.length === 0) {
    return (
      <div className="hk-empty" data-testid="home-empty">
        <p>尚無交易</p>
        <p className="muted">點下方 ＋ 記錄第一筆。</p>
      </div>
    );
  }

  return (
    <div className="hk-day-list">
      {groups.map((group) => (
        <section
          key={group.dateKey}
          className="hk-day-card"
          data-testid="home-day-group"
          data-day={group.dateKey}
        >
          <header className="hk-day-card__head">
            <span>{group.label}</span>
            <span
              className={`hk-day-card__net tabular ${group.net >= 0 ? "income" : "expense"}`}
              data-testid="home-day-net"
            >
              {hideAmounts ? "••••" : formatCurrency(group.net, true)}
            </span>
          </header>
          {group.transactions.map((tx) => (
            <SwipeRow
              key={tx.id}
              transaction={tx}
              category={categoryMap.get(tx.categoryId)}
              hideAmounts={hideAmounts}
              onEdit={() => onEdit(tx)}
              onDelete={() => onDelete(tx)}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

function SwipeRow({
  transaction,
  category,
  hideAmounts,
  onEdit,
  onDelete,
}: {
  transaction: Transaction;
  category?: Category;
  hideAmounts: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const startX = useRef(0);
  const [offset, setOffset] = useState(0);

  const title = transaction.note.trim() || category?.name || "交易";
  const subtitle = transaction.note.trim() ? category?.name : undefined;
  const signed =
    transaction.type === "income"
      ? formatCurrency(transaction.amount, true)
      : formatCurrency(-transaction.amount, true);

  return (
    <div className="hk-swipe-row">
      <button
        type="button"
        className="hk-tx-row"
        style={{ transform: `translateX(${offset}px)` }}
        onClick={onEdit}
        onTouchStart={(e) => {
          startX.current = e.touches[0].clientX;
        }}
        onTouchMove={(e) => {
          const dx = e.touches[0].clientX - startX.current;
          setOffset(Math.min(0, Math.max(-88, dx)));
        }}
        onTouchEnd={() => {
          if (offset < -48) onDelete();
          setOffset(0);
        }}
      >
        <CategoryIcon name={category?.iconName ?? "other"} size="md" />
        <div className="hk-tx-row__text">
          <strong>{title}</strong>
          {subtitle && <span className="muted">{subtitle}</span>}
        </div>
        <span className={`hk-tx-row__amt tabular ${transaction.type === "income" ? "income" : "expense"}`}>
          {hideAmounts ? "•••" : signed}
        </span>
      </button>
      <button
        type="button"
        className="hk-swipe-delete"
        data-testid="home-swipe-delete"
        aria-label="刪除"
        onClick={onDelete}
      >
        刪除
      </button>
    </div>
  );
}
