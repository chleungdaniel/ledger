import { describe, expect, it } from "vitest";
import { parseScreenshotOcrText } from "./parseScreenshotOcr";
import { CITI_MIXED_DATE_OCR, MULTI_DAY_WALLET_OCR } from "./parseWalletOcr";

const MULTI_DAY_REF = new Date("2026-10-22T12:00:00+08:00");

const PAYME_MULTI_DAY_OCR = `
港幣 0.00
2026年10月21日
lunch
- 71.00
2026年10月18日
Trip.com 限時優惠
- 239.00
2026年10月15日
lunch
- 71.00
主頁 向商店付款 我的帳戶
`.trim();

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

describe("parseScreenshotOcrText", () => {
  it("routes PayMe OCR with multiple date section headers", () => {
    const rows = parseScreenshotOcrText(PAYME_MULTI_DAY_OCR, MULTI_DAY_REF);
    expect(rows).toHaveLength(3);
    const dates = rows.map((r) => hktMonthDay(r.date)).sort();
    expect(dates).toEqual(["10-15", "10-18", "10-21"]);
    expect(rows.find((r) => hktMonthDay(r.date) === "10-21")?.amount).toBe(71);
    expect(rows.find((r) => hktMonthDay(r.date) === "10-18")?.amount).toBe(239);
  });

  it("routes wallet OCR with multi-day Octopus labels", () => {
    const rows = parseScreenshotOcrText(MULTI_DAY_WALLET_OCR, MULTI_DAY_REF);
    const byDay = new Map<string, number>();
    for (const r of rows) {
      const key = hktMonthDay(r.date);
      byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }
    expect(byDay.get("10-21")).toBe(8);
    expect(byDay.get("10-20")).toBe(6);
  });

  it("routes Citi-style wallet OCR with mixed date markers", () => {
    const rows = parseScreenshotOcrText(CITI_MIXED_DATE_OCR, MULTI_DAY_REF);
    expect(rows.map((r) => hktMonthDay(r.date))).toEqual([
      "10-19",
      "10-18",
      "10-17",
      "10-16",
      "10-15",
    ]);
  });
});
