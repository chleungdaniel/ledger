import { isLiveAppMode } from "../lib/appMode";
import type { OpeningBalanceSetting } from "../lib/openingBalance";
import type { InboxImportItem } from "../lib/import/inboxTypes";
import type { Category, LedgerBackup, MonthlyBudget, Transaction } from "../types";

type StoreApi = {
  loadAllData: () => Promise<{
    categories: Category[];
    transactions: Transaction[];
    budgets: MonthlyBudget[];
    openingBalance: OpeningBalanceSetting | null;
  }>;
  getOpeningBalance: () => Promise<OpeningBalanceSetting | null>;
  setOpeningBalance: (setting: OpeningBalanceSetting | null) => Promise<void>;
  putCategory: (category: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  putTransaction: (transaction: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  putBudget: (budget: MonthlyBudget) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  listInboxImports: () => Promise<InboxImportItem[]>;
  putInboxImport: (item: InboxImportItem) => Promise<void>;
  deleteInboxImport: (id: string) => Promise<void>;
  getInboxAutoConfirm: () => Promise<boolean>;
  setInboxAutoConfirm: (enabled: boolean) => Promise<void>;
  exportBackup: () => Promise<LedgerBackup>;
  importBackup: (backup: LedgerBackup) => Promise<void>;
};

let modulePromise: Promise<StoreApi> | null = null;

async function getModule(): Promise<StoreApi> {
  if (!modulePromise) {
    modulePromise = (isLiveAppMode()
      ? import("./remoteDatabase")
      : import("./database")) as Promise<StoreApi>;
  }
  return modulePromise;
}

export async function loadAllData() {
  return (await getModule()).loadAllData();
}

export async function getOpeningBalance() {
  return (await getModule()).getOpeningBalance();
}

export async function setOpeningBalance(setting: OpeningBalanceSetting | null) {
  return (await getModule()).setOpeningBalance(setting);
}

export async function putCategory(category: Category) {
  return (await getModule()).putCategory(category);
}

export async function deleteCategory(id: string) {
  return (await getModule()).deleteCategory(id);
}

export async function putTransaction(transaction: Transaction) {
  return (await getModule()).putTransaction(transaction);
}

export async function deleteTransaction(id: string) {
  return (await getModule()).deleteTransaction(id);
}

export async function putBudget(budget: MonthlyBudget) {
  return (await getModule()).putBudget(budget);
}

export async function deleteBudget(id: string) {
  return (await getModule()).deleteBudget(id);
}

export async function listInboxImports() {
  return (await getModule()).listInboxImports();
}

export async function putInboxImport(item: InboxImportItem) {
  return (await getModule()).putInboxImport(item);
}

export async function deleteInboxImport(id: string) {
  return (await getModule()).deleteInboxImport(id);
}

export async function getInboxAutoConfirm() {
  return (await getModule()).getInboxAutoConfirm();
}

export async function setInboxAutoConfirm(enabled: boolean) {
  return (await getModule()).setInboxAutoConfirm(enabled);
}

export async function exportBackup() {
  return (await getModule()).exportBackup();
}

export async function importBackup(backup: LedgerBackup) {
  return (await getModule()).importBackup(backup);
}