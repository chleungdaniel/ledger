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
  pwaSyncExportedAt?: string;
}

export interface MonthlyBudget {
  id: string;
  year: number;
  month: number;
  amount: number;
  categoryId: string | null;
  createdAt: string;
}

export interface OpeningBalanceSetting {
  amount: number;
  updatedAt: string;
}

export type InboxImportItem = Record<string, unknown> & { id: string; createdAt: string };

export interface LedgerBackup {
  version: 1;
  exportedAt: string;
  categories: Category[];
  transactions: Transaction[];
  budgets: MonthlyBudget[];
}