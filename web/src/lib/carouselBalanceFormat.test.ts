import { describe, expect, it } from "vitest";
import {
  carouselBalanceMaxWidthPx,
  formatCarouselBalance,
  shrinkFontSizeToFit,
} from "./carouselBalanceFormat";

describe("formatCarouselBalance", () => {
  it("always uses 2 decimal places with sign", () => {
    expect(formatCarouselBalance(95232.4, true)).toBe("+HK$95,232.40");
    expect(formatCarouselBalance(-1234567.89, true)).toBe("-HK$1,234,567.89");
    expect(formatCarouselBalance(25, false)).toBe("HK$25.00");
  });
});

describe("shrinkFontSizeToFit", () => {
  it("reduces font until text fits max width", () => {
    const widths: Record<number, number> = {
      22: 200,
      18: 150,
      14: 100,
      10: 80,
    };
    const measure = (fs: number) => widths[fs] ?? fs * 9;
    const result = shrinkFontSizeToFit(measure, 100, 22, 7, 4);
    expect(result).toBe(14);
  });
});

describe("carouselBalanceMaxWidthPx", () => {
  it("scales with donut wrap width", () => {
    expect(carouselBalanceMaxWidthPx(390)).toBeCloseTo(390 * (124 / 220) * 0.9, 5);
  });
});
