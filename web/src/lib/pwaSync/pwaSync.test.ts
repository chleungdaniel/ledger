import { describe, expect, it } from "vitest";
import { decodeSyncCode, encodeSyncCode, type GzipFn, type GunzipFn } from "./codec";

/** Identity codec for unit tests (browser e2e covers real gzip). */
const testGzip: GzipFn = (json) => new TextEncoder().encode(json);
const testGunzip: GunzipFn = (bytes) => new TextDecoder().decode(bytes);
import { mergeSyncPayload, recordsFromTransactions } from "./merge";
import type { SyncPayload } from "./types";
import type { Category, Transaction } from "../../types";

const sampleCategories: Category[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "飲食",
    type: "expense",
    iconName: "fork-knife",
    isSeeded: true,
    sortOrder: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

const sampleTx: Transaction = {
  id: "22222222-2222-4222-8222-222222222222",
  amount: 42,
  type: "expense",
  categoryId: sampleCategories[0].id,
  date: "2026-03-01T12:00:00.000Z",
  note: "Coffee",
  createdAt: "2026-03-01T12:00:00.000Z",
  updatedAt: "2026-03-01T12:00:00.000Z",
};

function payloadFromTx(tx: Transaction): SyncPayload {
  return {
    v: 1,
    exportedAt: "2026-03-02T00:00:00.000Z",
    transactions: recordsFromTransactions([tx], sampleCategories, [tx.id]),
  };
}

describe("pwaSync codec", () => {
  it("round-trips gzip base64 payload", () => {
    const payload = payloadFromTx(sampleTx);
    const code = encodeSyncCode(payload, testGzip);
    expect(code.startsWith("LEDGERSYNC1:")).toBe(true);
    const decoded = decodeSyncCode(code, testGunzip);
    expect(decoded.transactions[0].id).toBe(sampleTx.id);
    expect(decoded.transactions[0].amount).toBe(42);
  });
});

describe("pwaSync merge", () => {
  it("adds new transactions and maps categories", () => {
    const payload = payloadFromTx(sampleTx);
    const result = mergeSyncPayload([], [], payload);
    expect(result.added).toBe(1);
    expect(result.transactions).toHaveLength(1);
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].name).toBe("飲食");
  });

  it("dedupes by id on repeat paste", () => {
    const payload = payloadFromTx(sampleTx);
    const first = mergeSyncPayload(sampleCategories, [sampleTx], payload);
    expect(first.added).toBe(0);
    expect(first.skipped).toBe(1);
  });

  it("dedupes by amount+date+note when id differs", () => {
    const payload = payloadFromTx({
      ...sampleTx,
      id: "33333333-3333-4333-8333-333333333333",
    });
    const result = mergeSyncPayload(sampleCategories, [sampleTx], payload);
    expect(result.added).toBe(0);
    expect(result.skipped).toBe(1);
  });
});
