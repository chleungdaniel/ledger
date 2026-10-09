import { describe, expect, it } from "vitest";
import { resolveWalletDate } from "./parseDates";

const REF = new Date("2026-10-09T15:00:00+08:00");

describe("resolveWalletDate", () => {
  it("resolves 昨日 and 30分鐘前", () => {
    const y = resolveWalletDate("昨日", REF)!;
    expect(y.getDate()).toBe(8);
    const m = resolveWalletDate("30分鐘前", REF)!;
    expect(m.getMinutes()).toBe(30);
  });

  it("resolves weekday to most recent past occurrence", () => {
    const t = resolveWalletDate("星期二", REF)!;
    expect(t.getDay()).toBe(2);
    expect(t.getTime()).toBeLessThan(REF.getTime());
  });

  it("tolerates OCR spaces in weekday and 分鐘前", () => {
    const t = resolveWalletDate("星期 二", REF)!;
    expect(t.getDay()).toBe(2);
    const m = resolveWalletDate("31 分 鐘 前", REF)!;
    expect(m.getMinutes()).toBe(29);
  });

  it("parses d/m/y", () => {
    const d = resolveWalletDate("26/9/2026", REF)!;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(26);
  });
});
