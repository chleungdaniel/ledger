import { formatCurrency } from "../lib/format";
import type { Category, Transaction } from "../types";
import { CategoryIcon } from "./CategoryIcon";

interface TransactionRowProps {
  transaction: Transaction;
  category?: Category;
  onClick?: () => void;
}

export function TransactionRow({ transaction, category, onClick }: TransactionRowProps) {
  const signed =
    transaction.type === "income"
      ? `+${formatCurrency(transaction.amount)}`
      : `-${formatCurrency(transaction.amount)}`;

  return (
    <button type="button" className="tx-row" onClick={onClick}>
      <CategoryIcon name={category?.iconName ?? "other"} />
      <div className="tx-row__body">
        <div className="tx-row__title">{category?.name ?? "未分類"}</div>
        <div className="tx-row__meta">
          {new Date(transaction.date).toLocaleDateString("zh-Hant-HK")}
          {transaction.note ? ` · ${transaction.note}` : ""}
        </div>
      </div>
      <div
        className={`tx-row__amount ${transaction.type === "income" ? "income" : ""}`}
      >
        {signed}
      </div>
    </button>
  );
}
