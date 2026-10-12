import { describe, expect, it } from "vitest";
import {
  computeCarouselAmountFontSizePx,
  formatCarouselBalance,
  splitCarouselBalance,
} from "./carouselBalanceFormat";

describe("formatCarouselBalance", () => {
  it("uses 2 dp without plus for positive", () => {
    expect(formatCarouselBalance(95232.4)).toBe("HK$95,232.40");
    expect(formatCarouselBalance(-1234567.89)).toBe("-HK$1,234,567.89");
  });
});

describe("splitCarouselBalance", () => {
  it("splits main and decimal parts", () => {
    const p = splitCarouselBalance(95232.4);
    expect(p.main).toBe("HK$95,232");
    expect(p.decimals).toBe("40");
    expect(p.measureText).toBe("HK$95,232.40");
  });
});

describe("computeCarouselAmountFontSizePx", () => {
  it("caps at 24 and floors at 15", () => {
    expect(computeCarouselAmountFontSizePx(500, 5)).toBe(24);
    expect(computeCarouselAmountFontSizePx(50, 20)).toBe(15);
  });
});
