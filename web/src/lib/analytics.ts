import type { Category, MonthlyBudget, Transaction } from "../types";

export interface MonthSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export interface MonthBalancePoint {
  year: number;
  month: number;
  label: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  cumulativeBalance: number;
}

export interface CategorySpend {
  category: Category;
  spent: number;
  budget: number | null;
}

export type ReportPeriod = "month" | "year" | "all";

export function transactionsInYear(
  transactions: Transaction[],
  year: number,
  type?: "expense" | "income",
): Transaction[] {
  return transactions
    .filter((t) => new Date(t.date).getFullYear() === year)
    .filter((t) => (type ? t.type === type : true))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function summaryFromTransactions(transactions: Transaction[]): MonthSummary {
  let totalIncome = 0;
  let totalExpense = 0;
  for (const t of transactions) {
    if (t.type === "income") totalIncome += t.amount;
    else totalExpense += t.amount;
  }
  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
  };
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

export function allTimeSummary(transactions: Transaction[]): MonthSummary {
  let totalIncome = 0;
  let totalExpense = 0;
  for (const t of transactions) {
    if (t.type === "income") totalIncome += t.amount;
    else totalExpense += t.amount;
  }
  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
  };
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
  return expenseBreakdownFromExpenses(expenseTxs, categories, budgets, year, month);
}

export function expenseByCategoryAllTime(
  transactions: Transaction[],
  categories: Category[],
): CategorySpend[] {
  const expenseTxs = transactions.filter((t) => t.type === "expense");
  return expenseBreakdownFromExpenses(expenseTxs, categories);
}

function expenseBreakdownFromExpenses(
  expenseTxs: Transaction[],
  categories: Category[],
  budgets?: MonthlyBudget[],
  year?: number,
  month?: number,
): CategorySpend[] {
  const spentMap = new Map<string, number>();
  for (const t of expenseTxs) {
    spentMap.set(t.categoryId, (spentMap.get(t.categoryId) ?? 0) + t.amount);
  }
  const budgetMap = new Map<string, number>();
  if (budgets && year != null && month != null) {
    for (const b of budgets) {
      if (b.year === year && b.month === month && b.categoryId) {
        budgetMap.set(b.categoryId, b.amount);
      }
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

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Per-month 結餘 plus running cumulative total (chronological). */
export function monthBalanceTimeline(
  transactions: Transaction[],
): MonthBalancePoint[] {
  const locale = "zh-Hant-HK";
  const buckets = new Map<string, { year: number; month: number; income: number; expense: number }>();

  for (const t of transactions) {
    const d = new Date(t.date);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const key = monthKey(year, month);
    const row = buckets.get(key) ?? { year, month, income: 0, expense: 0 };
    if (t.type === "income") row.income += t.amount;
    else row.expense += t.amount;
    buckets.set(key, row);
  }

  const now = new Date();
  const endYear = now.getFullYear();
  const endMonth = now.getMonth() + 1;

  let startYear = endYear;
  let startMonth = endMonth;
  if (transactions.length > 0) {
    const earliest = transactions.reduce((min, t) =>
      new Date(t.date).getTime() < new Date(min.date).getTime() ? t : min,
    );
    startYear = new Date(earliest.date).getFullYear();
    startMonth = new Date(earliest.date).getMonth() + 1;
  }

  const keys: string[] = [];
  let y = startYear;
  let m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    keys.push(monthKey(y, m));
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }

  let cumulative = 0;
  const points: MonthBalancePoint[] = [];
  for (const key of keys) {
    const row = buckets.get(key);
    const year = row?.year ?? Number(key.slice(0, 4));
    const month = row?.month ?? Number(key.slice(5, 7));
    const totalIncome = row?.income ?? 0;
    const totalExpense = row?.expense ?? 0;
    const balance = totalIncome - totalExpense;
    cumulative += balance;
    const label = new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
    }).format(new Date(year, month - 1, 1));
    points.push({
      year,
      month,
      label,
      totalIncome,
      totalExpense,
      balance,
      cumulativeBalance: cumulative,
    });
  }
  return points;
}
