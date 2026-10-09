/** Decode query values that may be double- or triple-encoded. */
export function decodeParamValue(raw: string): string {
  let s = raw;
  for (let i = 0; i < 4; i++) {
    try {
      const next = decodeURIComponent(s.replace(/\+/g, " "));
      if (next === s) break;
      s = next;
    } catch {
      break;
    }
  }
  return s.replace(/[\n\r]/g, " ").trim();
}

const FW_DIGIT = /[０-９]/g;
function toAsciiDigits(s: string): string {
  return s
    .replace(FW_DIGIT, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30))
    .replace(/．/g, ".")
    .replace(/，/g, ",");
}

const SPACE_CHARS = /[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g;

export interface ParsedShortcutAmount {
  amount: number | null;
  /** True when a leading minus or refund-like wording suggests income. */
  suggestIncome: boolean;
}

/**
 * Parse Shortcuts / Wallet amount strings (HK$, locale commas, full-width digits, etc.).
 */
export function parseShortcutAmount(raw: string | null | undefined): ParsedShortcutAmount {
  if (raw == null || raw === "") {
    return { amount: null, suggestIncome: false };
  }

  let s = decodeParamValue(raw);
  s = toAsciiDigits(s);
  s = s.replace(SPACE_CHARS, " ");

  const refundHint =
    /退款|退費|refund|reversal|chargeback|回贈|回饋|credit/i.test(s) ||
    /^[\s]*[-−－]/.test(s);

  s = s
    .replace(/港幣|港币|港元|hkd|hk\$/gi, " ")
    .replace(/\$/g, " ")
    .replace(/eur|usd|gbp|nt\$|twd/gi, " ")
    .replace(/[+＋]/g, " ")
    .trim();

  const minusMatch = s.match(/^[\s]*[-−－]\s*(.*)$/);
  if (minusMatch) s = minusMatch[1].trim();

  const normalized = s.replace(/[^\d.,\s]/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return { amount: null, suggestIncome: refundHint };
  }

  let numStr = normalized;
  const commaOnly = numStr.includes(",") && !numStr.includes(".");
  if (commaOnly) {
    const parts = numStr.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      numStr = `${parts[0].replace(/\s/g, "")}.${parts[1]}`;
    } else {
      numStr = numStr.replace(/,/g, "");
    }
  } else {
    numStr = numStr.replace(/,/g, "");
  }

  const m = numStr.match(/(\d+(?:\.\d+)?)/);
  if (!m) {
    return { amount: null, suggestIncome: refundHint };
  }

  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) {
    return { amount: null, suggestIncome: refundHint };
  }

  return { amount: Math.abs(n), suggestIncome: refundHint };
}
