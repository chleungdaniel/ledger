const locale = "zh-Hant-HK";

/** Home carousel: 2 dp, no leading '+' for positive balances. */
export function formatCarouselBalance(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "HKD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);
  if (amount < 0) return `-${formatted}`;
  return formatted;
}

export interface CarouselBalanceParts {
  negative: boolean;
  /** Currency + integer part, e.g. HK$95,232 or -HK$1,234,567 */
  main: string;
  /** Two decimal digits without dot, e.g. 40 */
  decimals: string;
  /** Full single-line string for width estimation */
  measureText: string;
  charCount: number;
}

export function splitCarouselBalance(amount: number): CarouselBalanceParts {
  const negative = amount < 0;
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "HKD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);
  const dot = formatted.lastIndexOf(".");
  const mainAbs = dot >= 0 ? formatted.slice(0, dot) : formatted;
  const decimals = dot >= 0 ? formatted.slice(dot + 1) : "00";
  const main = negative ? `-${mainAbs}` : mainAbs;
  const measureText = `${main}.${decimals}`;
  return {
    negative,
    main,
    decimals,
    measureText,
    charCount: measureText.length,
  };
}

export function computeCarouselAmountFontSizePx(
  availableWidthPx: number,
  charCount: number,
  maxPx = 24,
  minPx = 15,
  charWidthFactor = 0.6,
): number {
  if (charCount <= 0 || availableWidthPx <= 0) return maxPx;
  const byWidth = availableWidthPx / (charCount * charWidthFactor);
  return Math.max(minPx, Math.min(maxPx, byWidth));
}

/** Opening-balance footnote under donut (2 dp). */
export function formatCarouselCurrency(amount: number): string {
  return formatCarouselBalance(amount);
}
