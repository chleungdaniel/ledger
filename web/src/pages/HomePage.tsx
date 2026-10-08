import { useMemo, useState } from "react";
import { BudgetProgress } from "../components/BudgetProgress";
import { TransactionRow } from "../components/TransactionRow";
import { monthSummary, totalBudgetForMonth } from "../lib/analytics";
import { formatCurrency, formatMonthYear, yearMonthFromDate } from "../lib/format";
import { useLedger } from "../store/LedgerContext";
import type { Transaction } from "../types";
import { TransactionFormPage } from "./TransactionFormPage";

export function HomePage() {
  const { loading, categories, transactions, budgets } = useLedger();
  const now = new Date();
  const { year, month } = yearMonthFromDate(now);

  const [formType, setFormType] = useState<"expense" | "income" | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const summary = useMemo(
    () => monthSummary(transactions, year, month),
    [transactions, year, month],
  );
  const totalBudget = useMemo(
    () => totalBudgetForMonth(budgets, year, month),
    [budgets, year, month],
  );
  const recent = useMemo(() => transactions.slice(0, 20), [transactions]);

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  if (formType || editing) {
    return (
      <TransactionFormPage
        initialType={formType ?? "expense"}
        transaction={editing ?? undefined}
        onClose={() => {
          setFormType(null);
          setEditing(null);
        }}
      />
    );
  }

  return (
    <div className="page" data-testid="home-page">
      <header className="page-header">
        <h1>記帳</h1>
        <p className="subtitle">{formatMonthYear(year, month)}</p>
      </header>

      {loading ? (
        <p className="muted center">載入中…</p>
      ) : (
        <>
          <section className="card overview-card">
            <div className="stat-row">
              <div>
                <div className="stat-label">本月支出</div>
                <div className="stat-value">{formatCurrency(summary.totalExpense)}</div>
              </div>
              <div>
                <div className="stat-label">本月收入</div>
                <div className="stat-value income">{formatCurrency(summary.totalIncome)}</div>
              </div>
            </div>

            {totalBudget != null ? (
              <BudgetProgress
                title="本月預算"
                spent={summary.totalExpense}
                budget={totalBudget}
              />
            ) : (
              <p className="hint">尚未設定本月總預算，可至「預算」分頁新增。</p>
            )}

            <div className="balance-row">
              <span>結餘</span>
              <strong className={summary.balance >= 0 ? "income" : "over"}>
                {formatCurrency(summary.balance, true)}
              </strong>
            </div>
          </section>

          <section className="section">
            <h2>快速記帳</h2>
            <div className="quick-actions">
              <button
                type="button"
                className="btn-quick expense"
                data-testid="quick-expense"
                onClick={() => setFormType("expense")}
              >
                支出
              </button>
              <button
                type="button"
                className="btn-quick income"
                onClick={() => setFormType("income")}
              >
                收入
              </button>
            </div>
          </section>

          <section className="section">
            <h2>最近交易</h2>
            {recent.length === 0 ? (
              <div className="empty-state">
                <p>尚無交易</p>
                <p className="muted">點擊上方按鈕記錄第一筆收入或支出。</p>
              </div>
            ) : (
              <div className="list-card">
                {recent.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    transaction={tx}
                    category={categoryMap.get(tx.categoryId)}
                    onClick={() => setEditing(tx)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
