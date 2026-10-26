import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { createSeedCategories, V2_CATEGORY_MIGRATIONS } from "../data/seed";
import { isValidTransactionId } from "../lib/pwaSync/merge";
import { newId } from "../lib/format";
import type { OpeningBalanceSetting } from "../lib/openingBalance";
import type { InboxImportItem } from "../lib/import/inboxTypes";
import type { Category, LedgerBackup, MonthlyBudget, Transaction } from "../types";

const OPENING_BALANCE_META_KEY = "openingBalance";
const INBOX_AUTO_CONFIRM_META_KEY = "importInboxAutoConfirm";

interface LedgerDB extends DBSchema {
  categories: {
    key: string;
    value: Category;
  };
  transactions: {
    key: string;
    value: Transaction;
  };
  budgets: {
    key: string;
    value: MonthlyBudget;
  };
  meta: {
    key: string;
    value: { key: string; value: string };
  };
  importInbox: {
    key: string;
    value: InboxImportItem;
  };
}

const DB_NAME = "ledger-pwa";
const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase<LedgerDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<LedgerDB>> {
  if (!dbPromise) {
    dbPromise = openDB<LedgerDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains("categories")) {
          db.createObjectStore("categories", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("transactions")) {
          db.createObjectStore("transactions", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("budgets")) {
          db.createObjectStore("budgets", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("importInbox")) {
          db.createObjectStore("importInbox", { keyPath: "id" });
        }
        if (oldVersion > 0 && oldVersion < 2) {
          // v2 category migration runs after upgrade via migrateV2Categories
        }
      },
    }).then(async (db) => {
      await seedIfNeeded(db);
      await migrateV2Categories(db);
      await migrateTransactionIds(db);
      return db;
    });
  }
  return dbPromise;
}

async function migrateV2Categories(db: IDBPDatabase<LedgerDB>): Promise<void> {
  const done = await db.get("meta", "migrationV2Categories");
  if (done?.value === "true") return;

  const existing = await db.getAll("categories");
  const now = new Date().toISOString();
  for (const template of V2_CATEGORY_MIGRATIONS) {
    const has = existing.some(
      (c) => c.name === template.name && c.type === template.type,
    );
    if (has) continue;
    await db.put("categories", {
      ...template,
      id: newId(),
      createdAt: now,
    });
  }
  await db.put("meta", { key: "migrationV2Categories", value: "true" });
}

async function migrateTransactionIds(db: IDBPDatabase<LedgerDB>): Promise<void> {
  const done = await db.get("meta", "migrationTransactionUuids");
  if (done?.value === "true") return;

  const txs = await db.getAll("transactions");
  for (const tx of txs) {
    if (isValidTransactionId(tx.id)) continue;
    const repaired: Transaction = { ...tx, id: newId() };
    await db.delete("transactions", tx.id);
    await db.put("transactions", repaired);
  }
  await db.put("meta", { key: "migrationTransactionUuids", value: "true" });
}

async function seedIfNeeded(db: IDBPDatabase<LedgerDB>): Promise<void> {
  const seeded = await db.get("meta", "seeded");
  if (seeded?.value === "true") return;
  const count = await db.count("categories");
  if (count > 0) {
    await db.put("meta", { key: "seeded", value: "true" });
    return;
  }
  const categories = createSeedCategories();
  const tx = db.transaction("categories", "readwrite");
  for (const c of categories) {
    await tx.store.put(c);
  }
  await tx.done;
  await db.put("meta", { key: "seeded", value: "true" });
}

export async function loadAllData(): Promise<{
  categories: Category[];
  transactions: Transaction[];
  budgets: MonthlyBudget[];
  openingBalance: OpeningBalanceSetting | null;
}> {
  const db = await getDb();
  const [categories, transactions, budgets, openingBalance] = await Promise.all([
    db.getAll("categories"),
    db.getAll("transactions"),
    db.getAll("budgets"),
    getOpeningBalance(),
  ]);
  categories.sort((a, b) => a.sortOrder - b.sortOrder);
  transactions.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  return { categories, transactions, budgets, openingBalance };
}

export async function getOpeningBalance(): Promise<OpeningBalanceSetting | null> {
  const db = await getDb();
  const row = await db.get("meta", OPENING_BALANCE_META_KEY);
  if (!row?.value) return null;
  try {
    const parsed = JSON.parse(row.value) as OpeningBalanceSetting;
    if (typeof parsed.amount !== "number" || !Number.isFinite(parsed.amount)) {
      return null;
    }
    if (typeof parsed.updatedAt !== "string" || !parsed.updatedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function setOpeningBalance(
  setting: OpeningBalanceSetting | null,
): Promise<void> {
  const db = await getDb();
  if (setting === null) {
    await db.delete("meta", OPENING_BALANCE_META_KEY);
    return;
  }
  await db.put("meta", {
    key: OPENING_BALANCE_META_KEY,
    value: JSON.stringify(setting),
  });
}

export async function putCategory(category: Category): Promise<void> {
  const db = await getDb();
  await db.put("categories", category);
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("categories", id);
}

export async function putTransaction(transaction: Transaction): Promise<void> {
  const db = await getDb();
  await db.put("transactions", transaction);
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("transactions", id);
}

export async function putBudget(budget: MonthlyBudget): Promise<void> {
  const db = await getDb();
  await db.put("budgets", budget);
}

export async function deleteBudget(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("budgets", id);
}

export async function listInboxImports(): Promise<InboxImportItem[]> {
  const db = await getDb();
  const rows = await db.getAll("importInbox");
  rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return rows;
}

export async function putInboxImport(item: InboxImportItem): Promise<void> {
  const db = await getDb();
  await db.put("importInbox", item);
}

export async function deleteInboxImport(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("importInbox", id);
}

export async function getInboxAutoConfirm(): Promise<boolean> {
  const db = await getDb();
  const row = await db.get("meta", INBOX_AUTO_CONFIRM_META_KEY);
  return row?.value === "true";
}

export async function setInboxAutoConfirm(enabled: boolean): Promise<void> {
  const db = await getDb();
  await db.put("meta", {
    key: INBOX_AUTO_CONFIRM_META_KEY,
    value: enabled ? "true" : "false",
  });
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
  const db = await getDb();
  const tx = db.transaction(
    ["categories", "transactions", "budgets", "meta"],
    "readwrite",
  );
  await tx.objectStore("categories").clear();
  await tx.objectStore("transactions").clear();
  await tx.objectStore("budgets").clear();
  for (const c of backup.categories) await tx.objectStore("categories").put(c);
  for (const t of backup.transactions) await tx.objectStore("transactions").put(t);
  for (const b of backup.budgets) await tx.objectStore("budgets").put(b);
  await tx.objectStore("meta").put({ key: "seeded", value: "true" });
  await tx.done;
}
