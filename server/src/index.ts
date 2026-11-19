import compression from "compression";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { requireUserId, resolveUserId } from "./auth.js";
import {
  countTransactions,
  deleteBudget,
  deleteCategory,
  deleteInboxImport,
  deleteTransaction,
  getMeta,
  importBackupReplace,
  listInboxImports,
  loadAllData,
  mergeBackup,
  putBudget,
  putCategory,
  putInboxImport,
  putTransaction,
  runMigrations,
  setMeta,
  setOpeningBalance,
} from "./db.js";
import { createSeedCategories } from "./seed.js";
import type {
  Category,
  InboxImportItem,
  LedgerBackup,
  MonthlyBudget,
  OpeningBalanceSetting,
  Transaction,
} from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 8080);
const STATIC_DIR =
  process.env.LEDGER_STATIC_DIR ?? path.resolve(__dirname, "../../web/dist");

async function seedIfNeeded(userId: string): Promise<void> {
  const seeded = await getMeta(userId, "seeded");
  if (seeded === "true") return;
  const data = await loadAllData(userId);
  if (data.categories.length > 0) {
    await setMeta(userId, "seeded", "true");
    return;
  }
  for (const c of createSeedCategories()) {
    await putCategory(userId, c);
  }
  await setMeta(userId, "seeded", "true");
}

function isLedgerBackup(body: unknown): body is LedgerBackup {
  if (!body || typeof body !== "object") return false;
  const b = body as LedgerBackup;
  return (
    b.version === 1 &&
    Array.isArray(b.categories) &&
    Array.isArray(b.transactions) &&
    Array.isArray(b.budgets)
  );
}

function authMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  try {
    requireUserId(req);
    next();
  } catch {
    res.status(401).json({ error: "unauthorized", message: "請以 Cursor 帳號登入後再試。" });
  }
}

const app = express();
app.disable("x-powered-by");
app.use(compression());
app.use(express.json({ limit: "4mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, storage: process.env.DATABASE_URL ? "postgres" : "missing-db" });
});

app.get("/api/me", (req, res) => {
  const userId = resolveUserId(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  res.json({
    userId,
    email: typeof req.headers["x-cursor-user-email"] === "string"
      ? req.headers["x-cursor-user-email"]
      : undefined,
  });
});

app.use("/api", authMiddleware);

app.get("/api/data", async (req, res, next) => {
  try {
    const userId = requireUserId(req);
    await seedIfNeeded(userId);
    const data = await loadAllData(userId);
    const txCount = await countTransactions(userId);
    res.json({
      ...data,
      meta: {
        transactionCount: txCount,
        indexedDbMigratedAt: await getMeta(userId, "indexedDbMigratedAt"),
      },
    });
  } catch (e) {
    next(e);
  }
});

app.post("/api/migrate-indexeddb", async (req, res, next) => {
  try {
    const userId = requireUserId(req);
    if (!isLedgerBackup(req.body)) {
      res.status(400).json({ error: "invalid_backup" });
      return;
    }
    const result = await mergeBackup(userId, req.body);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

app.post("/api/import-replace", async (req, res, next) => {
  try {
    const userId = requireUserId(req);
    if (!isLedgerBackup(req.body)) {
      res.status(400).json({ error: "invalid_backup" });
      return;
    }
    await importBackupReplace(userId, req.body);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

app.put("/api/opening-balance", async (req, res, next) => {
  try {
    const userId = requireUserId(req);
    const body = req.body as OpeningBalanceSetting | null;
    await setOpeningBalance(userId, body);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

app.put("/api/categories/:id", async (req, res, next) => {
  try {
    const userId = requireUserId(req);
    await putCategory(userId, req.body as Category);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

app.delete("/api/categories/:id", async (req, res, next) => {
  try {
    const userId = requireUserId(req);
    await deleteCategory(userId, req.params.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

app.put("/api/transactions/:id", async (req, res, next) => {
  try {
    const userId = requireUserId(req);
    await putTransaction(userId, req.body as Transaction);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

app.delete("/api/transactions/:id", async (req, res, next) => {
  try {
    const userId = requireUserId(req);
    await deleteTransaction(userId, req.params.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

app.put("/api/budgets/:id", async (req, res, next) => {
  try {
    const userId = requireUserId(req);
    await putBudget(userId, req.body as MonthlyBudget);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

app.delete("/api/budgets/:id", async (req, res, next) => {
  try {
    const userId = requireUserId(req);
    await deleteBudget(userId, req.params.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

app.get("/api/import-inbox", async (req, res, next) => {
  try {
    const userId = requireUserId(req);
    const items = await listInboxImports(userId);
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

app.put("/api/import-inbox/:id", async (req, res, next) => {
  try {
    const userId = requireUserId(req);
    await putInboxImport(userId, req.body as InboxImportItem);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

app.delete("/api/import-inbox/:id", async (req, res, next) => {
  try {
    const userId = requireUserId(req);
    await deleteInboxImport(userId, req.params.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

app.get("/api/import-inbox/auto-confirm", async (req, res, next) => {
  try {
    const userId = requireUserId(req);
    const value = await getMeta(userId, "importInboxAutoConfirm");
    res.json({ enabled: value === "true" });
  } catch (e) {
    next(e);
  }
});

app.put("/api/import-inbox/auto-confirm", async (req, res, next) => {
  try {
    const userId = requireUserId(req);
    const enabled = Boolean((req.body as { enabled?: boolean }).enabled);
    await setMeta(userId, "importInboxAutoConfirm", enabled ? "true" : "false");
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

app.use(
  express.static(STATIC_DIR, {
    index: false,
    maxAge: "1h",
  }),
);

app.get(/^(?!\/api\/).*/, (_req, res) => {
  const indexPath = path.join(STATIC_DIR, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res
      .status(503)
      .type("html")
      .send(
        "<!doctype html><html lang='zh-Hant'><body><p>記帳 Live App：請先建置前端（web/dist）。</p></body></html>",
      );
  }
});

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  },
);

async function main(): Promise<void> {
  if (process.env.DATABASE_URL) {
    await runMigrations();
  } else {
    console.warn("DATABASE_URL is not set; API persistence is unavailable.");
  }
  app.listen(PORT, () => {
    console.log(`記帳 Live App server listening on :${PORT}`);
  });
}

void main();