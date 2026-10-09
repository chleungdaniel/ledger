import { describe, expect, it, beforeEach } from "vitest";
import { saveFxRates } from "./fxSettings";
import {
  OCTOPUS_OCR_FIXTURE,
  parseWalletOcrText,
  WALLET_OCR_FIXTURE,
} from "./parseWalletOcr";

const REF = new Date("2026-10-09T15:00:00+08:00");

describe("parseWalletOcrText", () => {
  beforeEach(() => {
    saveFxRates({ TWD: 0.25 });
  });

  it("parses credit card wallet rows with relative and absolute dates", () => {
    const rows = parseWalletOcrText(WALLET_OCR_FIXTURE, REF);
    const merchants = rows.map((r) => r.merchant);
    expect(merchants).toContain("燒肉 Like");
    expect(merchants).toContain("Five Guys");
    expect(merchants).toContain("Uber");

    const like = rows.find((r) => r.merchant === "燒肉 Like");
    expect(like?.amount).toBe(261.8);
    expect(like?.type).toBe("expense");

    const uber = rows.find((r) => r.merchant === "Uber");
    expect(uber?.amount).toBe(45.5);
    expect(new Date(uber!.date).getMinutes()).toBe(30);

    const park = rows.find((r) => r.merchant.includes("PARKnSHOP"));
    expect(park?.amount).toBe(120);

    const tw = rows.find((r) => r.originalCurrency === "TWD");
    expect(tw?.originalAmount).toBe(147);
    expect(tw?.amount).toBe(36.75);
  });

  it("parses octopus rows, refunds, and skips 旅程中", () => {
    const rows = parseWalletOcrText(OCTOPUS_OCR_FIXTURE, REF);
    expect(rows.length).toBe(2);
    const fare = rows.find((r) => r.amount === 7.9);
    expect(fare?.type).toBe("expense");
    expect(fare?.note).toMatch(/鐵路|巴士/);

    const refund = rows.find((r) => r.type === "income");
    expect(refund?.amount).toBe(4.3);
  });
});
