import { describe, expect, it } from "vitest";
import {
  CAROUSEL_PIE_INNER_RADIUS,
  innerChordWidthPx,
  maxCenterTextWidthPx,
  rectCornersInsideCircle,
} from "./carouselDonutGeometry";

describe("carouselDonutGeometry", () => {
  it("computes chord width at vertical offset", () => {
    const r = CAROUSEL_PIE_INNER_RADIUS;
    expect(innerChordWidthPx(r, 0)).toBeCloseTo(2 * r, 5);
    expect(innerChordWidthPx(r, r)).toBe(0);
    const half = innerChordWidthPx(r, r / 2);
    expect(half).toBeCloseTo(Math.sqrt(3) * r, 4);
  });

  it("applies 75% width factor", () => {
    const r = 62;
    expect(maxCenterTextWidthPx(r, 0)).toBeCloseTo(2 * r * 0.75, 5);
  });

  it("detects rectangle corners inside circle", () => {
    const rect = { left: 90, top: 90, right: 110, bottom: 100, width: 20, height: 10 } as DOMRect;
    expect(rectCornersInsideCircle(rect, 100, 100, 50)).toBe(true);
    const outside = { left: 0, top: 0, right: 10, bottom: 10, width: 10, height: 10 } as DOMRect;
    expect(rectCornersInsideCircle(outside, 100, 100, 50)).toBe(false);
  });
});
