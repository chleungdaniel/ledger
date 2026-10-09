import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { createSeedCategories, V2_CATEGORY_MIGRATIONS } from "../data/seed";
import { newId } from "../lib/format";
import type { Category, LedgerBackup, MonthlyBudget, Transaction } from "../types";

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
}

const DB_NAME = "ledger-pwa";
const DB_VERSION = 2;

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
        if (oldVersion > 0 && oldVersion < 2) {
          // v2 category migration runs after upgrade via migrateV2Categories
        }
      },
    }).then(async (db) => {
      await seedIfNeeded(db);
      await migrateV2Categories(db);
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
}> {
  const db = await getDb();
  const [categories, transactions, budgets] = await Promise.all([
    db.getAll("categories"),
    db.getAll("transactions"),
    db.getAll("budgets"),
  ]);
  categories.sort((a, b) => a.sortOrder - b.sortOrder);
  transactions.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  return { categories, transactions, budgets };
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
