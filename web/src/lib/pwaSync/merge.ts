import { newId } from "../format";
import type { Category, Transaction } from "../../types";
import type { SyncPayload, SyncTransactionRecord } from "./types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidTransactionId(id: string): boolean {
  return UUID_RE.test(id);
}

function fuzzyKey(tx: { amount: number; date: string; note: string }): string {
  const day = tx.date.slice(0, 10);
  return `${day}|${tx.amount}|${tx.note.trim()}`;
}

function findCategory(
  categories: Category[],
  name: string,
  type: Category["type"],
): Category | undefined {
  return categories.find((c) => c.name === name && c.type === type);
}

function defaultIconForType(type: Category["type"]): string {
  return type === "income" ? "plus" : "other";
}

export interface MergeSyncResult {
  categories: Category[];
  transactions: Transaction[];
  added: number;
  skipped: number;
}

export function mergeSyncPayload(
  categories: Category[],
  transactions: Transaction[],
  payload: SyncPayload,
): MergeSyncResult {
  const nextCategories = [...categories];
  const nextTransactions = [...transactions];
  const idSet = new Set(nextTransactions.map((t) => t.id));
  const fuzzySet = new Set(nextTransactions.map((t) => fuzzyKey(t)));

  let added = 0;
  let skipped = 0;

  for (const row of payload.transactions) {
    if (!isValidTransactionId(row.id)) {
      skipped++;
      continue;
    }
    if (idSet.has(row.id)) {
      skipped++;
      continue;
    }
    const fuzzy = fuzzyKey(row);
    if (fuzzySet.has(fuzzy)) {
      skipped++;
      continue;
    }

    let category = findCategory(nextCategories, row.categoryName, row.categoryType);
    if (!category) {
      const now = new Date().toISOString();
      category = {
        id: newId(),
        name: row.categoryName,
        type: row.categoryType,
        iconName: defaultIconForType(row.categoryType),
        isSeeded: false,
        sortOrder: Date.now(),
        createdAt: now,
      };
      nextCategories.push(category);
    }

    const now = new Date().toISOString();
    const tx: Transaction = {
      id: row.id,
      amount: row.amount,
      type: row.type,
      categoryId: category.id,
      date: row.date,
      note: row.note ?? "",
      createdAt: row.createdAt || now,
      updatedAt: row.updatedAt || row.createdAt || now,
    };
    nextTransactions.push(tx);
    idSet.add(tx.id);
    fuzzySet.add(fuzzyKey(tx));
    added++;
  }

  nextTransactions.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return { categories: nextCategories, transactions: nextTransactions, added, skipped };
}

export function recordsFromTransactions(
  transactions: Transaction[],
  categories: Category[],
  ids: string[],
): SyncTransactionRecord[] {
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const idSet = new Set(ids);
  return transactions
    .filter((t) => idSet.has(t.id))
    .map((t) => {
      const cat = catMap.get(t.categoryId);
      return {
        id: t.id,
        amount: t.amount,
        type: t.type,
        categoryName: cat?.name ?? "其他",
        categoryType: cat?.type ?? t.type,
        date: t.date,
        note: t.note,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      };
    });
}

export function previewSyncPayload(payload: SyncPayload): {
  count: number;
  totalExpense: number;
  totalIncome: number;
} {
  let totalExpense = 0;
  let totalIncome = 0;
  for (const t of payload.transactions) {
    if (t.type === "expense") totalExpense += t.amount;
    else totalIncome += t.amount;
  }
  return { count: payload.transactions.length, totalExpense, totalIncome };
}
