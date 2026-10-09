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
import { mergeSyncPayload, type SyncPayload } from "../lib/pwaSync";
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
  markTransactionsPwaExported: (ids: string[]) => Promise<void>;
  removeTransactions: (ids: string[]) => Promise<void>;
  mergePwaSync: (payload: SyncPayload) => Promise<{
    added: number;
    skipped: number;
    addedTransactionIds: string[];
    addedCategoryIds: string[];
  }>;
  undoPwaSyncMerge: (transactionIds: string[], categoryIds: string[]) => Promise<void>;
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
        pwaSyncExportedAt: existing?.pwaSyncExportedAt,
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

  const markTransactionsPwaExported = useCallback(
    async (ids: string[]) => {
      const stamp = new Date().toISOString();
      const idSet = new Set(ids);
      for (const tx of transactions) {
        if (!idSet.has(tx.id)) continue;
        await putTransaction({ ...tx, pwaSyncExportedAt: stamp });
      }
      await refresh();
    },
    [refresh, transactions],
  );

  const removeTransactions = useCallback(
    async (ids: string[]) => {
      for (const id of ids) {
        await deleteTransaction(id);
      }
      await refresh();
    },
    [refresh],
  );

  const mergePwaSync = useCallback(
    async (payload: SyncPayload) => {
      const result = mergeSyncPayload(categories, transactions, payload);
      const oldCatIds = new Set(categories.map((c) => c.id));
      const oldTxIds = new Set(transactions.map((t) => t.id));
      const addedCategoryIds: string[] = [];
      const addedTransactionIds: string[] = [];
      for (const c of result.categories) {
        if (!oldCatIds.has(c.id)) {
          await putCategory(c);
          addedCategoryIds.push(c.id);
        }
      }
      for (const t of result.transactions) {
        if (!oldTxIds.has(t.id)) {
          await putTransaction(t);
          addedTransactionIds.push(t.id);
        }
      }
      await refresh();
      return {
        added: result.added,
        skipped: result.skipped,
        addedTransactionIds,
        addedCategoryIds,
      };
    },
    [categories, refresh, transactions],
  );

  const undoPwaSyncMerge = useCallback(
    async (transactionIds: string[], categoryIds: string[]) => {
      for (const id of transactionIds) {
        await deleteTransaction(id);
      }
      await refresh();
      const data = await loadAllData();
      for (const id of categoryIds) {
        const inUse = data.transactions.some((t) => t.categoryId === id);
        if (!inUse) await deleteCategory(id);
      }
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
      markTransactionsPwaExported,
      removeTransactions,
      mergePwaSync,
      undoPwaSyncMerge,
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
      markTransactionsPwaExported,
      removeTransactions,
      mergePwaSync,
      undoPwaSyncMerge,
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
