const locale = "zh-Hant-HK";

export function formatCurrency(amount: number, showSign = false): string {
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "HKD",
    maximumFractionDigits: abs % 1 === 0 ? 0 : 2,
    minimumFractionDigits: 0,
  }).format(abs);
  if (amount < 0) return `-${formatted}`;
  if (showSign && amount > 0) return `+${formatted}`;
  return formatted;
}

export function parseAmount(text: string): number | null {
  const cleaned = text
    .trim()
    .replace(/HK\$/gi, "")
    .replace(/\$/g, "")
    .replace(/,/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function formatMonthYear(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "long" }).format(
    d,
  );
}

export function yearMonthFromDate(d: Date): { year: number; month: number } {
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function newId(): string {
  return crypto.randomUUID();
}
