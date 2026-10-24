import { describe, expect, it } from "vitest";
import type { Transaction } from "../../types";
import {
  importRecordsMatch,
  markDuplicates,
  normalizeImportMerchantLabel,
  repeatedScreenshotBatchIndices,
} from "./duplicates";
import type { ImportCandidate } from "./types";
import {
  parseWalletOcrText,
  WALLET_OCTOPUS_SCREENSHOT_C_OCR,
} from "./parseWalletOcr";

const REF = new Date("2026-10-24T12:21:00+08:00");

function candidate(
  partial: Partial<ImportCandidate> & Pick<ImportCandidate, "amount" | "type" | "date" | "merchant" | "note">,
): ImportCandidate {
  return {
    id: "c1",
    currency: "HKD",
    categoryId: null,
    selected: true,
    isDuplicate: false,
    ...partial,
  };
}

const tx = (partial: Partial<Transaction> & Pick<Transaction, "amount" | "type" | "date" | "note">): Transaction => ({
  id: "11111111-1111-4111-8111-111111111111",
  categoryId: "cat",
  createdAt: partial.date,
  updatedAt: partial.date,
  ...partial,
});

describe("importRecordsMatch", () => {
  it("matches same 帳務 with OCR spacing differences", () => {
    const day = "2026-10-21T04:00:00.000Z";
    const a = candidate({
      amount: 7.2,
      type: "expense",
      date: day,
      merchant: "B 新界太和",
      note: "新界太和 · 巴士",
    });
    const b = candidate({
      id: "c2",
      amount: 7.2,
      type: "expense",
      date: day,
      merchant: "新界太和",
      note: "新界 太和 · 巴士",
    });
    expect(importRecordsMatch(a, b)).toBe(true);
    expect(normalizeImportMerchantLabel("B 新界太和", "新界太和 · 巴士")).toBe(
      normalizeImportMerchantLabel("新界太和", "新界 太和 · 巴士"),
    );
  });

  it("does not match same amount on different merchants", () => {
    const day = "2026-10-21T04:00:00.000Z";
    const a = candidate({
      amount: 7.9,
      type: "expense",
      date: day,
      merchant: "鐵路",
      note: "鐵路",
    });
    const b = candidate({
      id: "c2",
      amount: 7.9,
      type: "expense",
      date: day,
      merchant: "新界太和",
      note: "新界太和 · 巴士",
    });
    expect(importRecordsMatch(a, b)).toBe(false);
  });

  it("does not match same merchant on different days", () => {
    const a = candidate({
      amount: 7.9,
      type: "expense",
      date: "2026-10-21T04:00:00.000Z",
      merchant: "鐵路",
      note: "鐵路",
    });
    const b = candidate({
      id: "c2",
      amount: 7.9,
      type: "expense",
      date: "2026-10-20T04:00:00.000Z",
      merchant: "鐵路",
      note: "鐵路",
    });
    expect(importRecordsMatch(a, b)).toBe(false);
  });
});

describe("markDuplicates", () => {
  it("marks second identical OCR dump in one batch as duplicate screenshot", () => {
    const once = parseWalletOcrText(WALLET_OCTOPUS_SCREENSHOT_C_OCR, REF);
    const combined = [...once, ...parseWalletOcrText(WALLET_OCTOPUS_SCREENSHOT_C_OCR, REF)];
    expect(repeatedScreenshotBatchIndices(combined).size).toBe(once.length);
    const marked = markDuplicates(combined, []);
    expect(marked.filter((r) => !r.isDuplicate)).toHaveLength(once.length);
    expect(marked.filter((r) => r.duplicateSource === "batch")).toHaveLength(once.length);
  });

  it("keeps two same-day 鐵路 rows from one screenshot (not batch-collapsed)", () => {
    const once = parseWalletOcrText(WALLET_OCTOPUS_SCREENSHOT_C_OCR, REF);
    const rails = once.filter((r) => r.merchant === "鐵路");
    expect(rails).toHaveLength(2);
    const marked = markDuplicates(once, []);
    expect(marked.filter((r) => r.merchant === "鐵路" && !r.isDuplicate)).toHaveLength(2);
  });

  it("marks candidate duplicate when already in ledger", () => {
    const parsed = parseWalletOcrText(WALLET_OCTOPUS_SCREENSHOT_C_OCR, REF);
    const first = parsed[0];
    const existing = [
      tx({
        amount: first.amount,
        type: first.type,
        date: first.date,
        note: first.note,
      }),
    ];
    const marked = markDuplicates([first], existing);
    expect(marked[0].isDuplicate).toBe(true);
    expect(marked[0].duplicateSource).toBe("ledger");
    expect(marked[0].selected).toBe(false);
  });

  it("keeps genuinely different transactions in the same batch", () => {
    const parsed = parseWalletOcrText(WALLET_OCTOPUS_SCREENSHOT_C_OCR, REF);
    const rail = parsed.find((r) => r.merchant === "鐵路");
    const bus = parsed.find((r) => r.merchant === "新界大埔");
    expect(rail).toBeTruthy();
    expect(bus).toBeTruthy();
    const marked = markDuplicates([rail!, bus!], []);
    expect(marked.every((r) => !r.isDuplicate)).toBe(true);
  });
});
