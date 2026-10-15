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

const COMBINED_MERCHANT_AMOUNT = /^(.+?)[:：]\s*(.+)$/;

/** Octopus / Wallet strings like `鐵路：HK$7.90` in one query value. */
export function splitMerchantAmountCombined(
  text: string,
): { merchant: string; amountPart: string } | null {
  const s = decodeParamValue(text).trim();
  const m = s.match(COMBINED_MERCHANT_AMOUNT);
  if (!m) return null;
  const amountPart = m[2].trim();
  const { amount } = parseShortcutAmount(amountPart);
  if (amount == null) return null;
  return { merchant: m[1].trim(), amountPart };
}

export interface NormalizedShortcutFields {
  amount: number | null;
  merchant: string;
  suggestIncome: boolean;
}

function parseSingleNotificationLine(line: string): NormalizedShortcutFields | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const colon = splitMerchantAmountCombined(trimmed);
  if (colon) {
    const parsed = parseShortcutAmount(colon.amountPart);
    if (parsed.amount != null) {
      return {
        amount: parsed.amount,
        merchant: colon.merchant,
        suggestIncome: parsed.suggestIncome,
      };
    }
  }

  const atMatch = trimmed.match(/^(.+?)\s+at\s+(.+)$/i);
  if (atMatch) {
    const left = atMatch[1].trim();
    const right = atMatch[2].trim();
    const leftParsed = parseShortcutAmount(left);
    if (leftParsed.amount != null && right) {
      return {
        amount: leftParsed.amount,
        merchant: right,
        suggestIncome: leftParsed.suggestIncome,
      };
    }
    const rightParsed = parseShortcutAmount(right);
    if (rightParsed.amount != null && left) {
      return {
        amount: rightParsed.amount,
        merchant: left,
        suggestIncome: rightParsed.suggestIncome,
      };
    }
  }

  const payMeInline = trimmed.match(
    /^(.*?)\s*[-−－]\s*([0-9０-９,，]+(?:\.[0-9０-９]{1,2})?)\s*$/,
  );
  if (payMeInline) {
    const merchant = payMeInline[1].trim();
    const parsed = parseShortcutAmount(payMeInline[2]);
    if (parsed.amount != null && merchant) {
      return { amount: parsed.amount, merchant, suggestIncome: parsed.suggestIncome };
    }
  }

  const trailing = trimmed.match(
    /^(.+?)\s+((?:HK\$|HKD|\$|¥|￥)?\s*[\d０-９.,，．\s]+)\s*$/iu,
  );
  if (trailing) {
    const candidate = parseShortcutAmount(trailing[2]);
    if (candidate.amount != null) {
      return {
        amount: candidate.amount,
        merchant: trailing[1].trim(),
        suggestIncome: candidate.suggestIncome,
      };
    }
  }

  const amountFirst = trimmed.match(
    /^((?:HK\$|HKD|\$)?\s*[\d０-９.,，．\s]+)\s+(.+)$/iu,
  );
  if (amountFirst) {
    const candidate = parseShortcutAmount(amountFirst[1]);
    if (candidate.amount != null) {
      return {
        amount: candidate.amount,
        merchant: amountFirst[2].trim(),
        suggestIncome: candidate.suggestIncome,
      };
    }
  }

  const onlyAmount = parseShortcutAmount(trimmed);
  if (onlyAmount.amount != null) {
    return {
      amount: onlyAmount.amount,
      merchant: "",
      suggestIncome: onlyAmount.suggestIncome,
    };
  }

  return null;
}

/** URL-decode notification bodies without collapsing newlines (multi-line Wallet / PayMe). */
function decodeNotificationBody(raw: string): string {
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
  return s.replace(/\r\n/g, "\n");
}

/** Parse iOS notification / Wallet body text passed via `text`, `body`, or `raw`. */
export function parseFieldsFromNotificationText(
  textRaw: string | null | undefined,
): NormalizedShortcutFields {
  if (textRaw == null || textRaw === "") {
    return { amount: null, merchant: "", suggestIncome: false };
  }

  const text = decodeNotificationBody(textRaw);
  const lines = text
    .split(/[\n\r]+/)
    .map((l) => l.replace(SPACE_CHARS, " ").trim())
    .filter(Boolean);
  const tries = lines.length > 0 ? lines : [text.trim()];

  let best: NormalizedShortcutFields | null = null;
  for (const line of tries) {
    const parsed = parseSingleNotificationLine(line);
    if (!parsed) continue;
    if (parsed.amount != null && parsed.merchant) return parsed;
    if (parsed.amount != null && (!best || best.amount == null)) best = parsed;
    if (!best && parsed.merchant) best = parsed;
  }

  return best ?? { amount: null, merchant: "", suggestIncome: false };
}

/**
 * Resolve amount + merchant from Shortcut query params (including combined Octopus-style text).
 * Structured `amount` / `merchant` win when non-empty; gaps are filled from notification text.
 */
export function normalizeShortcutFields(
  amountRaw: string | null,
  merchantRaw: string | null,
  notificationTextRaw?: string | null,
): NormalizedShortcutFields {
  let merchant = merchantRaw != null ? decodeParamValue(merchantRaw).trim() : "";
  let amountStr = amountRaw != null ? decodeParamValue(amountRaw).trim() : "";

  if (amountStr) {
    const split = splitMerchantAmountCombined(amountStr);
    if (split) {
      if (!merchant) merchant = split.merchant;
      amountStr = split.amountPart;
    }
  }

  if (!amountStr && merchant) {
    const split = splitMerchantAmountCombined(merchant);
    if (split) {
      merchant = split.merchant;
      amountStr = split.amountPart;
    }
  }

  if (!amountStr && merchant) {
    const trailing = merchant.match(/^(.+?)\s+((?:HK\$|HKD|\$|¥|￥)?\s*[\d０-９.,，．\s]+)\s*$/iu);
    if (trailing) {
      const candidate = parseShortcutAmount(trailing[2]);
      if (candidate.amount != null) {
        merchant = trailing[1].trim();
        amountStr = trailing[2];
      }
    }
  }

  let parsed = parseShortcutAmount(amountStr || null);
  if (parsed.amount == null && merchant) {
    const split = splitMerchantAmountCombined(merchant);
    if (split) {
      merchant = split.merchant;
      parsed = parseShortcutAmount(split.amountPart);
    }
  }

  const structured: NormalizedShortcutFields = {
    amount: parsed.amount,
    merchant,
    suggestIncome: parsed.suggestIncome,
  };

  if (notificationTextRaw == null || notificationTextRaw === "") {
    return structured;
  }

  const fromText = parseFieldsFromNotificationText(notificationTextRaw);
  return {
    amount: structured.amount ?? fromText.amount,
    merchant: structured.merchant || fromText.merchant,
    suggestIncome: structured.suggestIncome || fromText.suggestIncome,
  };
}
