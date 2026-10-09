import { describe, expect, it, beforeEach } from "vitest";
import { saveFxRates } from "./fxSettings";
import {
  OCTOPUS_OCR_FIXTURE,
  parseWalletOcrText,
  REAL_CARD_OCR,
  REAL_OCTOPUS_OCR,
  WALLET_OCR_FIXTURE,
} from "./parseWalletOcr";

const REF = new Date("2026-10-09T09:00:00+08:00");

function hktMonthDay(iso: string): string {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
  const [, mm, dd] = f.split("-");
  return `${mm}-${dd}`;
}

describe("parseWalletOcrText", () => {
  beforeEach(() => {
    saveFxRates({ TWD: 0.25 });
  });

  it("parses simplified wallet fixture", () => {
    const rows = parseWalletOcrText(WALLET_OCR_FIXTURE, REF);
    expect(rows.length).toBeGreaterThanOrEqual(4);
    const tw = rows.find((r) => r.originalCurrency === "TWD");
    expect(tw?.originalAmount).toBe(147);
    expect(tw?.amount).toBe(36.75);
  });

  it("parses simplified octopus fixture", () => {
    const rows = parseWalletOcrText(OCTOPUS_OCR_FIXTURE, REF);
    expect(rows.length).toBe(2);
    expect(rows.some((r) => r.type === "income")).toBe(true);
  });

  it("parses real iPhone Wallet card OCR (10 rows incl. flagged amount)", () => {
    const rows = parseWalletOcrText(REAL_CARD_OCR, REF);
    expect(rows).toHaveLength(10);

    const expectRow = (
      index: number,
      merchant: RegExp | string,
      amount: number,
      opts: {
        type?: "expense" | "income";
        originalAmount?: number;
        originalCurrency?: string;
        md?: string;
        invalid?: boolean;
      } = {},
    ) => {
      const r = rows[index];
      if (typeof merchant === "string") expect(r.merchant).toContain(merchant);
      else expect(r.merchant).toMatch(merchant);
      if (opts.invalid) {
        expect(r.amountInvalid).toBe(true);
        expect(r.selected).toBe(false);
        expect(r.parseWarning).toBeTruthy();
      } else {
        expect(r.amount).toBe(amount);
        expect(r.originalCurrency).toBe(opts.originalCurrency);
        if (opts.originalAmount != null) expect(r.originalAmount).toBe(opts.originalAmount);
        if (opts.type) expect(r.type).toBe(opts.type);
        if (opts.md) expect(hktMonthDay(r.date)).toBe(opts.md);
        expect(r.note).not.toMatch(/（HK /);
      }
    };

    expectRow(0, /minimelts/i, 90, { md: "10-06" });
    expectRow(1, "燒肉 Like", 261.8, { md: "10-06" });
    expectRow(2, /PARKnSHOP/i, 133.5, { md: "10-05" });
    expectRow(3, /Vincenzo/i, 682, { md: "10-04" });
    expectRow(4, "Five Guys", 288, { md: "10-03" });
    expectRow(5, "Uber", 306.7, { md: "09-26" });
    expectRow(6, "Uber", 360.13, { md: "09-26" });
    expectRow(7, "Uber", 36.75, { originalAmount: 147, originalCurrency: "TWD", md: "09-24" });
    expectRow(8, "Uber", 113.5, { originalAmount: 454, originalCurrency: "TWD", md: "09-24" });
    expectRow(9, "Uber", 0, { md: "09-23", invalid: true });
  });

  it("parses real Octopus OCR (10 rows, skips 旅程中)", () => {
    const rows = parseWalletOcrText(REAL_OCTOPUS_OCR, REF);
    expect(rows).toHaveLength(10);

    expect(rows[0].merchant).toBe("新界太和");
    expect(rows[0].type).toBe("income");
    expect(rows[0].amount).toBe(4.3);
    expect(new Date(rows[0].date).getMinutes()).toBe(29);

    expect(rows[1].merchant).toContain("大埔");
    expect(rows[1].amount).toBe(12.1);

    const wed = rows.filter((r) => hktMonthDay(r.date) === "10-07" && r.merchant === "鐵路");
    expect(wed).toHaveLength(2);
    expect(wed.every((r) => r.amount === 7.9)).toBe(true);

    const yday = rows.filter((r) => hktMonthDay(r.date) === "10-08");
    expect(yday.length).toBeGreaterThanOrEqual(5);
  });
});
