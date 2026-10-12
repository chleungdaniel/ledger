const locale = "zh-Hant-HK";

/** Home carousel center amount: always 2 decimal places. */
export function formatCarouselBalance(amount: number, showSign = false): string {
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "HKD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);
  if (amount < 0) return `-${formatted}`;
  if (showSign && amount > 0) return `+${formatted}`;
  return formatted;
}

/** Donut inner diameter / chart height in Recharts coordinate space. */
export const CAROUSEL_INNER_DIAMETER_RATIO = (62 * 2) / 220;

export function carouselBalanceMaxWidthPx(donutWrapWidthPx: number, margin = 0.9): number {
  return donutWrapWidthPx * CAROUSEL_INNER_DIAMETER_RATIO * margin;
}

export function shrinkFontSizeToFit(
  measureWidth: (fontSizePx: number) => number,
  maxWidthPx: number,
  baseFontPx = 22,
  minFontPx = 7,
  step = 0.5,
): number {
  let fs = baseFontPx;
  while (fs > minFontPx && measureWidth(fs) > maxWidthPx) {
    fs -= step;
  }
  return fs;
}

/** Re-export for opening-balance note on carousel (2 dp, no sign). */
export function formatCarouselCurrency(amount: number): string {
  return formatCarouselBalance(amount, false);
}
