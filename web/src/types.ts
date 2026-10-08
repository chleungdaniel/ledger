export type TransactionType = "expense" | "income";

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  iconName: string;
  isSeeded: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  date: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyBudget {
  id: string;
  year: number;
  month: number;
  amount: number;
  categoryId: string | null;
  createdAt: string;
}

export interface LedgerBackup {
  version: 1;
  exportedAt: string;
  categories: Category[];
  transactions: Transaction[];
  budgets: MonthlyBudget[];
}

export const TRANSACTION_TYPE_LABEL: Record<TransactionType, string> = {
  expense: "支出",
  income: "收入",
};
