import { describe, expect, it } from "vitest";
import { parseDeepLink } from "../deeplink";
import {
  annotateInboxDuplicates,
  inboxFingerprint,
  inboxItemFromDeepLink,
  inboxMatchesLedger,
  inboxMatchesPending,
} from "./inbox";
import type { Transaction } from "../../types";

const tx = (
  partial: Partial<Transaction> & Pick<Transaction, "amount" | "type" | "date" | "note">,
): Transaction => ({
  id: "11111111-1111-4111-8111-111111111111",
  categoryId: "cat",
  createdAt: partial.date,
  updatedAt: partial.date,
  ...partial,
});

describe("inboxItemFromDeepLink", () => {
  it("parses Octopus notification text into inbox row", () => {
    const dl = parseDeepLink("?add=1&text=鐵路%3AHK%247.90&type=expense");
    expect(dl).not.toBeNull();
    const item = inboxItemFromDeepLink(dl!, "notification", "2026-10-26T08:00:00.000Z");
    expect(item.amount).toBe(7.9);
    expect(item.merchant).toBe("鐵路");
    expect(item.amountMissing).toBe(false);
    expect(item.fingerprint).toContain("7.90");
  });
});

describe("inbox dedup", () => {
  const day = "2026-10-26T08:00:00.000Z";

  it("matches ledger by amount day merchant", () => {
    const dl = parseDeepLink("?add=1&text=鐵路%3AHK%247.90");
    const item = inboxItemFromDeepLink(dl!, "notification", day);
    const ledger = tx({
      amount: 7.9,
      type: "expense",
      date: "2026-10-26T08:10:00.000Z",
      note: "鐵路",
    });
    expect(inboxMatchesLedger(item, ledger)).toBe(true);
  });

  it("does not match outside time window on same day", () => {
    const dl = parseDeepLink("?add=1&text=鐵路%3AHK%247.90");
    const item = inboxItemFromDeepLink(dl!, "notification", day);
    const ledger = tx({
      amount: 7.9,
      type: "expense",
      date: "2026-10-26T20:00:00.000Z",
      note: "鐵路",
    });
    expect(inboxMatchesLedger(item, ledger, 30 * 60 * 1000)).toBe(false);
  });

  it("collapses duplicate pending notifications", () => {
    const dl = parseDeepLink("?add=1&text=鐵路%3AHK%247.90");
    const a = inboxItemFromDeepLink(dl!, "notification", day);
    const b = inboxItemFromDeepLink(dl!, "notification", day);
    expect(inboxMatchesPending(a, b)).toBe(true);
    const marked = annotateInboxDuplicates([a, b], []);
    expect(marked[1].duplicateLedgerTxId).toBe(marked[0].id);
  });

  it("fingerprint stable for same payload", () => {
    const fp1 = inboxFingerprint(7.9, "鐵路", "expense", day, "鐵路：HK$7.90");
    const fp2 = inboxFingerprint(7.9, "鐵路", "expense", day, "鐵路：HK$7.90");
    expect(fp1).toBe(fp2);
  });
});
