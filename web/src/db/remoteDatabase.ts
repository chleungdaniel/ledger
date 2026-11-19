import type { OpeningBalanceSetting } from "../lib/openingBalance";
import type { InboxImportItem } from "../lib/import/inboxTypes";
import type { Category, LedgerBackup, MonthlyBudget, Transaction } from "../types";
import { apiGet, apiSend } from "./remoteClient";

type DataPayload = {
  categories: Category[];
  transactions: Transaction[];
  budgets: MonthlyBudget[];
  openingBalance: OpeningBalanceSetting | null;
  meta?: { transactionCount?: number; indexedDbMigratedAt?: string | null };
};

export async function loadAllData(): Promise<{
  categories: Category[];
  transactions: Transaction[];
  budgets: MonthlyBudget[];
  openingBalance: OpeningBalanceSetting | null;
}> {
  const data = await apiGet<DataPayload>("/api/data");
  return {
    categories: data.categories,
    transactions: data.transactions,
    budgets: data.budgets,
    openingBalance: data.openingBalance,
  };
}

export async function fetchRemoteMeta(): Promise<{
  transactionCount: number;
  indexedDbMigratedAt: string | null;
}> {
  const data = await apiGet<DataPayload>("/api/data");
  return {
    transactionCount: data.meta?.transactionCount ?? data.transactions.length,
    indexedDbMigratedAt: data.meta?.indexedDbMigratedAt ?? null,
  };
}

export async function getOpeningBalance(): Promise<OpeningBalanceSetting | null> {
  const data = await loadAllData();
  return data.openingBalance;
}

export async function setOpeningBalance(
  setting: OpeningBalanceSetting | null,
): Promise<void> {
  await apiSend("/api/opening-balance", "PUT", setting);
}

export async function putCategory(category: Category): Promise<void> {
  await apiSend(`/api/categories/${encodeURIComponent(category.id)}`, "PUT", category);
}

export async function deleteCategory(id: string): Promise<void> {
  await apiSend(`/api/categories/${encodeURIComponent(id)}`, "DELETE");
}

export async function putTransaction(transaction: Transaction): Promise<void> {
  await apiSend(
    `/api/transactions/${encodeURIComponent(transaction.id)}`,
    "PUT",
    transaction,
  );
}

export async function deleteTransaction(id: string): Promise<void> {
  await apiSend(`/api/transactions/${encodeURIComponent(id)}`, "DELETE");
}

export async function putBudget(budget: MonthlyBudget): Promise<void> {
  await apiSend(`/api/budgets/${encodeURIComponent(budget.id)}`, "PUT", budget);
}

export async function deleteBudget(id: string): Promise<void> {
  await apiSend(`/api/budgets/${encodeURIComponent(id)}`, "DELETE");
}

export async function listInboxImports(): Promise<InboxImportItem[]> {
  const data = await apiGet<{ items: InboxImportItem[] }>("/api/import-inbox");
  return data.items;
}

export async function putInboxImport(item: InboxImportItem): Promise<void> {
  await apiSend(`/api/import-inbox/${encodeURIComponent(item.id)}`, "PUT", item);
}

export async function deleteInboxImport(id: string): Promise<void> {
  await apiSend(`/api/import-inbox/${encodeURIComponent(id)}`, "DELETE");
}

export async function getInboxAutoConfirm(): Promise<boolean> {
  const data = await apiGet<{ enabled: boolean }>("/api/import-inbox/auto-confirm");
  return data.enabled;
}

export async function setInboxAutoConfirm(enabled: boolean): Promise<void> {
  await apiSend("/api/import-inbox/auto-confirm", "PUT", { enabled });
}

export async function exportBackup(): Promise<LedgerBackup> {
  const data = await loadAllData();
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    categories: data.categories,
    transactions: data.transactions,
    budgets: data.budgets,
  };
}

export async function importBackup(backup: LedgerBackup): Promise<void> {
  await apiSend("/api/import-replace", "POST", backup);
}

export async function migrateIndexedDbBackup(backup: LedgerBackup): Promise<{
  addedCategories: number;
  addedTransactions: number;
  addedBudgets: number;
  skippedTransactions: number;
}> {
  return apiSend("/api/migrate-indexeddb", "POST", backup);
}