import { formatCurrency } from "../lib/format";

interface BudgetProgressProps {
  title: string;
  spent: number;
  budget: number;
  icon?: React.ReactNode;
}

export function BudgetProgress({ title, spent, budget, icon }: BudgetProgressProps) {
  const ratio = budget > 0 ? Math.min(spent / budget, 1) : 0;
  const over = spent > budget;

  return (
    <div className="budget-progress" data-over={over || undefined}>
      <div className="budget-progress__header">
        <span className="budget-progress__title">
          {icon}
          {title}
        </span>
        <span className="budget-progress__amounts">
          {formatCurrency(spent)} / {formatCurrency(budget)}
        </span>
      </div>
      <div className="budget-progress__track">
        <div
          className="budget-progress__fill"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      {over && (
        <p className="budget-progress__over">
          已超出預算 {formatCurrency(spent - budget)}
        </p>
      )}
    </div>
  );
}
