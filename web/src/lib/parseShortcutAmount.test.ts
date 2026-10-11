import { describe, expect, it } from "vitest";
import { decodeParamValue, parseShortcutAmount } from "./parseShortcutAmount";
import { parseDeepLink } from "./deeplink";

describe("parseShortcutAmount", () => {
  it("parses HK$ and currency variants", () => {
    expect(parseShortcutAmount("HK$7.90").amount).toBe(7.9);
    expect(parseShortcutAmount("$7.90").amount).toBe(7.9);
    expect(parseShortcutAmount("7.90 HKD").amount).toBe(7.9);
    expect(parseShortcutAmount("HKD 7.90").amount).toBe(7.9);
    expect(parseShortcutAmount("港幣 7.90").amount).toBe(7.9);
  });

  it("handles spaces and full-width digits", () => {
    expect(parseShortcutAmount("HK$\u00a07.90").amount).toBe(7.9);
    expect(parseShortcutAmount("７．９０").amount).toBe(7.9);
  });

  it("handles comma decimal and thousands", () => {
    expect(parseShortcutAmount("7,90").amount).toBe(7.9);
    expect(parseShortcutAmount("1,234.56").amount).toBe(1234.56);
  });

  it("uses absolute value and flags income hints", () => {
    expect(parseShortcutAmount("-7.90").amount).toBe(7.9);
    expect(parseShortcutAmount("-7.90").suggestIncome).toBe(true);
    expect(parseShortcutAmount("+7.90").amount).toBe(7.9);
    expect(parseShortcutAmount("退款 HK$12").suggestIncome).toBe(true);
  });

  it("strips newlines", () => {
    expect(parseShortcutAmount("HK$7.90\n").amount).toBe(7.9);
  });

  it("parses zh-Hant-HK currency formatting", () => {
    const formatted = new Intl.NumberFormat("zh-Hant-HK", {
      style: "currency",
      currency: "HKD",
    }).format(7.9);
    expect(parseShortcutAmount(formatted).amount).toBe(7.9);
  });

  it("decodes double-encoded values", () => {
    const once = encodeURIComponent("HK$7.90");
    const twice = encodeURIComponent(once);
    expect(parseShortcutAmount(twice).amount).toBe(7.9);
    expect(decodeParamValue(twice)).toBe("HK$7.90");
  });
});

describe("parseDeepLink", () => {
  it("parses shortcut-style query params", () => {
    const p = parseDeepLink(
      "?add=1&amount=HK%24261.80&merchant=Five%20Guys&type=expense",
    );
    expect(p?.amount).toBe(261.8);
    expect(p?.merchant).toBe("Five Guys");
    expect(p?.type).toBe("expense");
  });

  it("reads auto flag and amount aliases", () => {
    const p = parseDeepLink("?add=1&amount=12.5&merchant=Uber&auto=1");
    expect(p?.auto).toBe(true);
    const p2 = parseDeepLink("?add=1&a=9.5&m=Test");
    expect(p2?.amount).toBe(9.5);
    expect(p2?.merchant).toBe("Test");
  });

  it("flags missing amount with auto=1", () => {
    const p = parseDeepLink("?add=1&merchant=Octopus&auto=1");
    expect(p?.amount).toBeNull();
    expect(p?.amountMissing).toBe(true);
    expect(p?.merchant).toBe("Octopus");
  });

  it("infers income from negative amount", () => {
    const p = parseDeepLink("?add=1&amount=-50&merchant=Refund&type=expense");
    expect(p?.type).toBe("income");
    expect(p?.amount).toBe(50);
  });
});
