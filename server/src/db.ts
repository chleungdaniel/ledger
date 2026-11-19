import pg from "pg";
import type {
  Category,
  InboxImportItem,
  LedgerBackup,
  MonthlyBudget,
  OpeningBalanceSetting,
  Transaction,
} from "./types.js";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes("sslmode=require")
        ? { rejectUnauthorized: false }
        : undefined,
    });
  }
  return pool;
}

export async function runMigrations(): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS ledger_users (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ledger_categories (
        user_id TEXT NOT NULL REFERENCES ledger_users(id) ON DELETE CASCADE,
        id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
        icon_name TEXT NOT NULL,
        is_seeded BOOLEAN NOT NULL DEFAULT FALSE,
        sort_order BIGINT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (user_id, id)
      );

      CREATE TABLE IF NOT EXISTS ledger_transactions (
        user_id TEXT NOT NULL REFERENCES ledger_users(id) ON DELETE CASCADE,
        id TEXT NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
        category_id TEXT NOT NULL,
        date TIMESTAMPTZ NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        pwa_sync_exported_at TIMESTAMPTZ,
        PRIMARY KEY (user_id, id)
      );

      CREATE TABLE IF NOT EXISTS ledger_budgets (
        user_id TEXT NOT NULL REFERENCES ledger_users(id) ON DELETE CASCADE,
        id TEXT NOT NULL,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        category_id TEXT,
        created_at TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (user_id, id)
      );

      CREATE TABLE IF NOT EXISTS ledger_meta (
        user_id TEXT NOT NULL REFERENCES ledger_users(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        PRIMARY KEY (user_id, key)
      );

      CREATE TABLE IF NOT EXISTS ledger_import_inbox (
        user_id TEXT NOT NULL REFERENCES ledger_users(id) ON DELETE CASCADE,
        id TEXT NOT NULL,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (user_id, id)
      );
    `);
  } finally {
    client.release();
  }
}

async function ensureUser(userId: string): Promise<void> {
  await getPool().query(
    `INSERT INTO ledger_users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`,
    [userId],
  );
}

function rowToCategory(row: Record<string, unknown>): Category {
  return {
    id: String(row.id),
    name: String(row.name),
    type: row.type as Category["type"],
    iconName: String(row.icon_name),
    isSeeded: Boolean(row.is_seeded),
    sortOrder: Number(row.sort_order),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

function rowToTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: String(row.id),
    amount: Number(row.amount),
    type: row.type as Transaction["type"],
    categoryId: String(row.category_id),
    date: new Date(String(row.date)).toISOString(),
    note: String(row.note ?? ""),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    pwaSyncExportedAt: row.pwa_sync_exported_at
      ? new Date(String(row.pwa_sync_exported_at)).toISOString()
      : undefined,
  };
}

function rowToBudget(row: Record<string, unknown>): MonthlyBudget {
  return {
    id: String(row.id),
    year: Number(row.year),
    month: Number(row.month),
    amount: Number(row.amount),
    categoryId: row.category_id ? String(row.category_id) : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export async function loadAllData(userId: string): Promise<{
  categories: Category[];
  transactions: Transaction[];
  budgets: MonthlyBudget[];
  openingBalance: OpeningBalanceSetting | null;
}> {
  await ensureUser(userId);
  const pool = getPool();
  const [categoriesRes, txRes, budgetsRes, metaRes] = await Promise.all([
    pool.query(
      `SELECT * FROM ledger_categories WHERE user_id = $1 ORDER BY sort_order`,
      [userId],
    ),
    pool.query(
      `SELECT * FROM ledger_transactions WHERE user_id = $1 ORDER BY date DESC`,
      [userId],
    ),
    pool.query(`SELECT * FROM ledger_budgets WHERE user_id = $1`, [userId]),
    pool.query(`SELECT value FROM ledger_meta WHERE user_id = $1 AND key = 'openingBalance'`, [
      userId,
    ]),
  ]);

  let openingBalance: OpeningBalanceSetting | null = null;
  const obRow = metaRes.rows[0]?.value;
  if (obRow) {
    try {
      openingBalance = JSON.parse(String(obRow)) as OpeningBalanceSetting;
    } catch {
      openingBalance = null;
    }
  }

  return {
    categories: categoriesRes.rows.map(rowToCategory),
    transactions: txRes.rows.map(rowToTransaction),
    budgets: budgetsRes.rows.map(rowToBudget),
    openingBalance,
  };
}

export async function getMeta(userId: string, key: string): Promise<string | null> {
  await ensureUser(userId);
  const res = await getPool().query(
    `SELECT value FROM ledger_meta WHERE user_id = $1 AND key = $2`,
    [userId, key],
  );
  return res.rows[0] ? String(res.rows[0].value) : null;
}

export async function setMeta(userId: string, key: string, value: string): Promise<void> {
  await ensureUser(userId);
  await getPool().query(
    `INSERT INTO ledger_meta (user_id, key, value) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value`,
    [userId, key, value],
  );
}

export async function deleteMeta(userId: string, key: string): Promise<void> {
  await getPool().query(`DELETE FROM ledger_meta WHERE user_id = $1 AND key = $2`, [
    userId,
    key,
  ]);
}

export async function setOpeningBalance(
  userId: string,
  setting: OpeningBalanceSetting | null,
): Promise<void> {
  if (setting === null) {
    await deleteMeta(userId, "openingBalance");
    return;
  }
  await setMeta(userId, "openingBalance", JSON.stringify(setting));
}

export async function putCategory(userId: string, category: Category): Promise<void> {
  await ensureUser(userId);
  await getPool().query(
    `INSERT INTO ledger_categories
      (user_id, id, name, type, icon_name, is_seeded, sort_order, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (user_id, id) DO UPDATE SET
       name = EXCLUDED.name,
       type = EXCLUDED.type,
       icon_name = EXCLUDED.icon_name,
       is_seeded = EXCLUDED.is_seeded,
       sort_order = EXCLUDED.sort_order`,
    [
      userId,
      category.id,
      category.name,
      category.type,
      category.iconName,
      category.isSeeded,
      category.sortOrder,
      category.createdAt,
    ],
  );
}

export async function deleteCategory(userId: string, id: string): Promise<void> {
  await getPool().query(`DELETE FROM ledger_categories WHERE user_id = $1 AND id = $2`, [
    userId,
    id,
  ]);
}

export async function putTransaction(userId: string, transaction: Transaction): Promise<void> {
  await ensureUser(userId);
  await getPool().query(
    `INSERT INTO ledger_transactions
      (user_id, id, amount, type, category_id, date, note, created_at, updated_at, pwa_sync_exported_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (user_id, id) DO UPDATE SET
       amount = EXCLUDED.amount,
       type = EXCLUDED.type,
       category_id = EXCLUDED.category_id,
       date = EXCLUDED.date,
       note = EXCLUDED.note,
       updated_at = EXCLUDED.updated_at,
       pwa_sync_exported_at = EXCLUDED.pwa_sync_exported_at`,
    [
      userId,
      transaction.id,
      transaction.amount,
      transaction.type,
      transaction.categoryId,
      transaction.date,
      transaction.note,
      transaction.createdAt,
      transaction.updatedAt,
      transaction.pwaSyncExportedAt ?? null,
    ],
  );
}

export async function deleteTransaction(userId: string, id: string): Promise<void> {
  await getPool().query(`DELETE FROM ledger_transactions WHERE user_id = $1 AND id = $2`, [
    userId,
    id,
  ]);
}

export async function putBudget(userId: string, budget: MonthlyBudget): Promise<void> {
  await ensureUser(userId);
  await getPool().query(
    `INSERT INTO ledger_budgets
      (user_id, id, year, month, amount, category_id, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (user_id, id) DO UPDATE SET
       year = EXCLUDED.year,
       month = EXCLUDED.month,
       amount = EXCLUDED.amount,
       category_id = EXCLUDED.category_id`,
    [
      userId,
      budget.id,
      budget.year,
      budget.month,
      budget.amount,
      budget.categoryId,
      budget.createdAt,
    ],
  );
}

export async function deleteBudget(userId: string, id: string): Promise<void> {
  await getPool().query(`DELETE FROM ledger_budgets WHERE user_id = $1 AND id = $2`, [userId, id]);
}

export async function listInboxImports(userId: string): Promise<InboxImportItem[]> {
  await ensureUser(userId);
  const res = await getPool().query(
    `SELECT payload, created_at FROM ledger_import_inbox WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
  return res.rows.map((row) => {
    const item = row.payload as InboxImportItem;
    return { ...item, createdAt: new Date(String(row.created_at)).toISOString() };
  });
}

export async function putInboxImport(userId: string, item: InboxImportItem): Promise<void> {
  await ensureUser(userId);
  await getPool().query(
    `INSERT INTO ledger_import_inbox (user_id, id, payload, created_at)
     VALUES ($1, $2, $3::jsonb, $4)
     ON CONFLICT (user_id, id) DO UPDATE SET payload = EXCLUDED.payload`,
    [userId, item.id, JSON.stringify(item), item.createdAt],
  );
}

export async function deleteInboxImport(userId: string, id: string): Promise<void> {
  await getPool().query(`DELETE FROM ledger_import_inbox WHERE user_id = $1 AND id = $2`, [
    userId,
    id,
  ]);
}

export async function countTransactions(userId: string): Promise<number> {
  const res = await getPool().query(
    `SELECT COUNT(*)::int AS c FROM ledger_transactions WHERE user_id = $1`,
    [userId],
  );
  return Number(res.rows[0]?.c ?? 0);
}

/** Merge IndexedDB / backup payload into Postgres without wiping existing rows. */
export async function mergeBackup(userId: string, backup: LedgerBackup): Promise<{
  addedCategories: number;
  addedTransactions: number;
  addedBudgets: number;
  skippedTransactions: number;
}> {
  await ensureUser(userId);
  const existing = await loadAllData(userId);
  const catIds = new Set(existing.categories.map((c) => c.id));
  const txIds = new Set(existing.transactions.map((t) => t.id));
  const budgetIds = new Set(existing.budgets.map((b) => b.id));

  let addedCategories = 0;
  let addedTransactions = 0;
  let addedBudgets = 0;
  let skippedTransactions = 0;

  for (const c of backup.categories) {
    if (catIds.has(c.id)) continue;
    await putCategory(userId, c);
    addedCategories += 1;
  }
  for (const t of backup.transactions) {
    if (txIds.has(t.id)) {
      skippedTransactions += 1;
      continue;
    }
    await putTransaction(userId, t);
    addedTransactions += 1;
  }
  for (const b of backup.budgets) {
    if (budgetIds.has(b.id)) continue;
    await putBudget(userId, b);
    addedBudgets += 1;
  }

  await setMeta(userId, "indexedDbMigratedAt", new Date().toISOString());
  return { addedCategories, addedTransactions, addedBudgets, skippedTransactions };
}

export async function importBackupReplace(userId: string, backup: LedgerBackup): Promise<void> {
  await ensureUser(userId);
  await getPool().query(`DELETE FROM ledger_transactions WHERE user_id = $1`, [userId]);
  await getPool().query(`DELETE FROM ledger_categories WHERE user_id = $1`, [userId]);
  await getPool().query(`DELETE FROM ledger_budgets WHERE user_id = $1`, [userId]);
  for (const c of backup.categories) {
    await putCategory(userId, c);
  }
  for (const t of backup.transactions) {
    await putTransaction(userId, t);
  }
  for (const b of backup.budgets) {
    await putBudget(userId, b);
  }
  await setMeta(userId, "seeded", "true");
}