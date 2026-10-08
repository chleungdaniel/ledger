import { useMemo, useState } from "react";
import { BudgetProgress } from "../components/BudgetProgress";
import { CategoryIcon } from "../components/CategoryIcon";
import {
  categoryBudget,
  expenseByCategory,
  monthSummary,
  totalBudgetForMonth,
} from "../lib/analytics";
import { formatMonthYear, parseAmount } from "../lib/format";
import { useLedger } from "../store/LedgerContext";
import type { Category, MonthlyBudget } from "../types";

export function BudgetPage() {
  const { categories, transactions, budgets, upsertBudget, removeBudget } =
    useLedger();
  const [monthDate, setMonthDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [editor, setEditor] = useState<
    { kind: "total" } | { kind: "category"; category: Category } | null
  >(null);

  const [y, m] = monthDate.split("-").map(Number);
  const year = y;
  const month = m;

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === "expense"),
    [categories],
  );
  const monthExpense = useMemo(
    () => monthSummary(transactions, year, month).totalExpense,
    [transactions, year, month],
  );
  const totalBudget = useMemo(
    () => totalBudgetForMonth(budgets, year, month),
    [budgets, year, month],
  );
  const totalBudgetRow = useMemo(
    () => budgets.find((b) => b.year === year && b.month === month && b.categoryId === null),
    [budgets, year, month],
  );
  const spends = useMemo(
    () => expenseByCategory(transactions, categories, budgets, year, month),
    [transactions, categories, budgets, year, month],
  );

  if (editor) {
    const existing: MonthlyBudget | undefined =
      editor.kind === "total"
        ? totalBudgetRow
        : categoryBudget(budgets, year, month, editor.category.id);

    return (
      <BudgetEditor
        title={
          editor.kind === "total"
            ? `總預算 · ${formatMonthYear(year, month)}`
            : `${editor.category.name} · ${formatMonthYear(year, month)}`
        }
        existing={existing}
        onClose={() => setEditor(null)}
        onSave={async (amount) => {
          await upsertBudget({
            id: existing?.id,
            year,
            month,
            amount,
            categoryId: editor.kind === "total" ? null : editor.category.id,
          });
          setEditor(null);
        }}
        onRemove={
          existing
            ? async () => {
                await removeBudget(existing.id);
                setEditor(null);
              }
            : undefined
        }
      />
    );
  }

  return (
    <div className="page" data-testid="budget-page">
      <header className="page-header">
        <h1>預算</h1>
      </header>

      <label className="field pad-horizontal">
        <span>月份</span>
        <input
          type="month"
          value={monthDate}
          onChange={(e) => setMonthDate(e.target.value)}
          data-testid="budget-month"
        />
      </label>

      <section className="section">
        <h2>總預算</h2>
        <div className="card">
          {totalBudget != null && totalBudgetRow ? (
            <>
              <BudgetProgress
                title="全部支出"
                spent={monthExpense}
                budget={totalBudget}
              />
              <button
                type="button"
                className="list-action"
                data-testid="edit-total-budget"
                onClick={() => setEditor({ kind: "total" })}
              >
                調整總預算
              </button>
            </>
          ) : (
            <>
              <p className="hint">尚未設定總預算（可選）</p>
              <button
                type="button"
                className="btn-primary"
                data-testid="set-total-budget"
                onClick={() => setEditor({ kind: "total" })}
              >
                設定總預算
              </button>
            </>
          )}
        </div>
      </section>

      <section className="section">
        <h2>分類預算</h2>
        <div className="list-card">
          {expenseCategories.map((cat) => {
            const spent = spends.find((s) => s.category.id === cat.id)?.spent ?? 0;
            const bud = categoryBudget(budgets, year, month, cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                className="budget-cat-row"
                data-testid={`budget-cat-${cat.name}`}
                onClick={() => setEditor({ kind: "category", category: cat })}
              >
                {bud ? (
                  <BudgetProgress
                    title={cat.name}
                    spent={spent}
                    budget={bud.amount}
                    icon={<CategoryIcon name={cat.iconName} />}
                  />
                ) : (
                  <div className="budget-cat-row__unset">
                    <CategoryIcon name={cat.iconName} />
                    <span>{cat.name}</span>
                    <span className="muted">未設定</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function BudgetEditor({
  title,
  existing,
  onClose,
  onSave,
  onRemove,
}: {
  title: string;
  existing?: MonthlyBudget;
  onClose: () => void;
  onSave: (amount: number) => Promise<void>;
  onRemove?: () => Promise<void>;
}) {
  const [amountText, setAmountText] = useState(existing ? String(existing.amount) : "");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="full-screen-form">
      <header className="toolbar">
        <button type="button" className="btn-text" onClick={onClose}>取消</button>
        <h1>設定預算</h1>
        <button
          type="button"
          className="btn-text btn-text--primary"
          data-testid="save-budget"
          onClick={() => {
            const amount = parseAmount(amountText);
            if (amount === null || amount <= 0) {
              setError("金額必須大於 0");
              return;
            }
            void onSave(amount);
          }}
        >
          儲存
        </button>
      </header>
      <div className="form-stack">
        <p className="hint">{title}</p>
        <label className="field">
          <span>預算金額</span>
          <div className="amount-input">
            <span>HK$</span>
            <input
              inputMode="decimal"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              data-testid="budget-amount"
            />
          </div>
        </label>
        {error && <p className="form-error">{error}</p>}
        {onRemove && (
          <button type="button" className="btn-danger" onClick={() => void onRemove()}>
            移除此預算
          </button>
        )}
      </div>
    </div>
  );
}
