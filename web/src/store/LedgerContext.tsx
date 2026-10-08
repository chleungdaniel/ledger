import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  deleteBudget,
  deleteCategory,
  deleteTransaction,
  exportBackup,
  importBackup,
  loadAllData,
  putBudget,
  putCategory,
  putTransaction,
} from "../db/database";
import { newId } from "../lib/format";
import type {
  Category,
  LedgerBackup,
  MonthlyBudget,
  Transaction,
  TransactionType,
} from "../types";

interface LedgerState {
  loading: boolean;
  categories: Category[];
  transactions: Transaction[];
  budgets: MonthlyBudget[];
  refresh: () => Promise<void>;
  upsertTransaction: (
    input: Omit<Transaction, "id" | "createdAt" | "updatedAt"> & { id?: string },
  ) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  upsertCategory: (
    input: Omit<Category, "id" | "createdAt"> & { id?: string },
  ) => Promise<void>;
  removeCategory: (id: string) => Promise<{ ok: true } | { ok: false; reason: string }>;
  upsertBudget: (
    input: Omit<MonthlyBudget, "id" | "createdAt"> & { id?: string },
  ) => Promise<void>;
  removeBudget: (id: string) => Promise<void>;
  exportData: () => Promise<LedgerBackup>;
  importData: (backup: LedgerBackup) => Promise<void>;
}

const LedgerContext = createContext<LedgerState | null>(null);

export function LedgerProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<MonthlyBudget[]>([]);

  const refresh = useCallback(async () => {
    const data = await loadAllData();
    setCategories(data.categories);
    setTransactions(data.transactions);
    setBudgets(data.budgets);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const upsertTransaction = useCallback(
    async (
      input: Omit<Transaction, "id" | "createdAt" | "updatedAt"> & { id?: string },
    ) => {
      const now = new Date().toISOString();
      const existing = input.id
        ? transactions.find((t) => t.id === input.id)
        : undefined;
      const tx: Transaction = {
        id: input.id ?? newId(),
        amount: input.amount,
        type: input.type,
        categoryId: input.categoryId,
        date: input.date,
        note: input.note,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      await putTransaction(tx);
      await refresh();
    },
    [refresh, transactions],
  );

  const removeTransaction = useCallback(
    async (id: string) => {
      await deleteTransaction(id);
      await refresh();
    },
    [refresh],
  );

  const upsertCategory = useCallback(
    async (input: Omit<Category, "id" | "createdAt"> & { id?: string }) => {
      const existing = input.id
        ? categories.find((c) => c.id === input.id)
        : undefined;
      const category: Category = {
        id: input.id ?? newId(),
        name: input.name,
        type: input.type,
        iconName: input.iconName,
        isSeeded: input.isSeeded ?? false,
        sortOrder: input.sortOrder ?? Date.now(),
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      };
      await putCategory(category);
      await refresh();
    },
    [categories, refresh],
  );

  const removeCategory = useCallback(
    async (id: string) => {
      const count = transactions.filter((t) => t.categoryId === id).length;
      if (count > 0) {
        const cat = categories.find((c) => c.id === id);
        return {
          ok: false as const,
          reason: `「${cat?.name ?? "此分類"}」已有 ${count} 筆交易，無法刪除。`,
        };
      }
      await deleteCategory(id);
      const related = budgets.filter((b) => b.categoryId === id);
      for (const b of related) await deleteBudget(b.id);
      await refresh();
      return { ok: true as const };
    },
    [budgets, categories, refresh, transactions],
  );

  const upsertBudget = useCallback(
    async (input: Omit<MonthlyBudget, "id" | "createdAt"> & { id?: string }) => {
      const existing = input.id
        ? budgets.find((b) => b.id === input.id)
        : budgets.find(
            (b) =>
              b.year === input.year &&
              b.month === input.month &&
              b.categoryId === input.categoryId,
          );
      const budget: MonthlyBudget = {
        id: input.id ?? existing?.id ?? newId(),
        year: input.year,
        month: input.month,
        amount: input.amount,
        categoryId: input.categoryId,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      };
      await putBudget(budget);
      await refresh();
    },
    [budgets, refresh],
  );

  const removeBudget = useCallback(
    async (id: string) => {
      await deleteBudget(id);
      await refresh();
    },
    [refresh],
  );

  const exportData = useCallback(async () => exportBackup(), []);

  const importData = useCallback(
    async (backup: LedgerBackup) => {
      await importBackup(backup);
      await refresh();
    },
    [refresh],
  );

  const value = useMemo(
    () => ({
      loading,
      categories,
      transactions,
      budgets,
      refresh,
      upsertTransaction,
      removeTransaction,
      upsertCategory,
      removeCategory,
      upsertBudget,
      removeBudget,
      exportData,
      importData,
    }),
    [
      loading,
      categories,
      transactions,
      budgets,
      refresh,
      upsertTransaction,
      removeTransaction,
      upsertCategory,
      removeCategory,
      upsertBudget,
      removeBudget,
      exportData,
      importData,
    ],
  );

  return (
    <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>
  );
}

export function useLedger(): LedgerState {
  const ctx = useContext(LedgerContext);
  if (!ctx) throw new Error("useLedger must be used within LedgerProvider");
  return ctx;
}

export type { TransactionType };
