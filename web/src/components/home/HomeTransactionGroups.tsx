import { useRef, useState } from "react";
import { CategoryIcon } from "../CategoryIcon";
import type { DayGroup } from "../../lib/groupByDay";
import { formatCurrency } from "../../lib/format";
import type { Category, Transaction } from "../../types";

const SWIPE_WIDTH = 88;
const SWIPE_SNAP = 48;

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
            <span className="hk-day-card__date" data-testid="home-day-label">
              {group.label}
            </span>
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
  const lastTranslate = useRef(0);
  const [dragDx, setDragDx] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const note = transaction.note.trim();
  const title = note ? note : category?.name || "交易";
  const subtitle = note ? category?.name : undefined;
  const signed =
    transaction.type === "income"
      ? formatCurrency(transaction.amount, true)
      : formatCurrency(-transaction.amount, true);

  const base = revealed ? -SWIPE_WIDTH : 0;
  const translateX = Math.min(0, Math.max(-SWIPE_WIDTH, base + dragDx));
  lastTranslate.current = translateX;
  const revealDelete = revealed || translateX < -12;

  function close() {
    setRevealed(false);
    setDragDx(0);
  }

  return (
    <div
      className={`hk-swipe-row${revealed ? " hk-swipe-row--open" : ""}${revealDelete ? " hk-swipe-row--reveal" : ""}`}
      data-testid="home-swipe-row"
    >
      <button
        type="button"
        className="hk-swipe-delete"
        data-testid="home-swipe-delete"
        aria-hidden={!revealDelete}
        tabIndex={revealDelete ? 0 : -1}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
          close();
        }}
      >
        刪除
      </button>
      <button
        type="button"
        className="hk-tx-row"
        style={{ transform: `translateX(${translateX}px)` }}
        onClick={() => {
          if (revealed) {
            close();
            return;
          }
          onEdit();
        }}
        onTouchStart={(e) => {
          startX.current = e.touches[0].clientX;
          setDragDx(0);
        }}
        onTouchMove={(e) => {
          setDragDx(e.touches[0].clientX - startX.current);
        }}
        onTouchEnd={() => {
          if (lastTranslate.current < -SWIPE_SNAP) setRevealed(true);
          else close();
          setDragDx(0);
        }}
      >
        <CategoryIcon name={category?.iconName ?? "other"} size="md" />
        <div className="hk-tx-row__text">
          <strong>{title}</strong>
          {subtitle && <span className="muted hk-tx-row__subtitle">{subtitle}</span>}
        </div>
        <span
          className={`hk-tx-row__amt tabular ${transaction.type === "income" ? "income" : "expense"}`}
          data-testid="home-tx-amount"
        >
          {hideAmounts ? "•••" : signed}
        </span>
      </button>
    </div>
  );
}
