import { describe, expect, it } from "vitest";
import { parseDeepLink } from "./deeplink";

describe("parseDeepLink", () => {
  it("parses shortcut-style query params", () => {
    const p = parseDeepLink(
      "?add=1&amount=HK%24261.80&merchant=Five%20Guys&type=expense",
    );
    expect(p?.amount).toBe(261.8);
    expect(p?.merchant).toBe("Five Guys");
    expect(p?.type).toBe("expense");
  });

  it("reads auto flag", () => {
    const p = parseDeepLink("?add=1&amount=12.5&merchant=Uber&auto=1");
    expect(p?.auto).toBe(true);
  });
});
