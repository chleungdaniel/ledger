import type { Category, MonthlyBudget, Transaction } from "../types";

export interface MonthSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export interface CategorySpend {
  category: Category;
  spent: number;
  budget: number | null;
}

export function transactionsInMonth(
  transactions: Transaction[],
  year: number,
  month: number,
  type?: "expense" | "income",
): Transaction[] {
  return transactions
    .filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    })
    .filter((t) => (type ? t.type === type : true))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function monthSummary(
  transactions: Transaction[],
  year: number,
  month: number,
): MonthSummary {
  const txs = transactionsInMonth(transactions, year, month);
  let totalIncome = 0;
  let totalExpense = 0;
  for (const t of txs) {
    if (t.type === "income") totalIncome += t.amount;
    else totalExpense += t.amount;
  }
  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
  };
}

export function expenseByCategory(
  transactions: Transaction[],
  categories: Category[],
  budgets: MonthlyBudget[],
  year: number,
  month: number,
): CategorySpend[] {
  const expenseTxs = transactionsInMonth(transactions, year, month, "expense");
  const spentMap = new Map<string, number>();
  for (const t of expenseTxs) {
    spentMap.set(t.categoryId, (spentMap.get(t.categoryId) ?? 0) + t.amount);
  }
  const budgetMap = new Map<string, number>();
  for (const b of budgets) {
    if (b.year === year && b.month === month && b.categoryId) {
      budgetMap.set(b.categoryId, b.amount);
    }
  }
  const result: CategorySpend[] = [];
  for (const [categoryId, spent] of spentMap) {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) continue;
    result.push({
      category,
      spent,
      budget: budgetMap.get(categoryId) ?? null,
    });
  }
  return result.sort((a, b) => b.spent - a.spent);
}

export function totalBudgetForMonth(
  budgets: MonthlyBudget[],
  year: number,
  month: number,
): number | null {
  const total = budgets.find(
    (b) => b.year === year && b.month === month && b.categoryId === null,
  );
  return total ? total.amount : null;
}

export function categoryBudget(
  budgets: MonthlyBudget[],
  year: number,
  month: number,
  categoryId: string,
): MonthlyBudget | undefined {
  return budgets.find(
    (b) =>
      b.year === year &&
      b.month === month &&
      b.categoryId === categoryId,
  );
}

export function transactionCountForCategory(
  transactions: Transaction[],
  categoryId: string,
): number {
  return transactions.filter((t) => t.categoryId === categoryId).length;
}
