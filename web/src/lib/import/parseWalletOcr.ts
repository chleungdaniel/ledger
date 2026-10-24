import { newId } from "../format";
import { hkdFromForeign, loadFxRates } from "./fxSettings";
import { isLikelyDateLine, resolveWalletDate } from "./parseDates";
import type { ImportCandidate } from "./types";

const JOURNEY_ONLY = /^旅程中$/;
const JUNK_LINE =
  /其\s*交易|語意|自站|^\|.*\||^X\s|^[Ee]seA|馬新交易|國還加/i;

/** Line ends with (+)?(HK|NT|US)$amount */
const TX_AMOUNT =
  /^(.*?)\s*(\+?)\s*(HK\$|NT\$|US\$|USD)\s*([\d,]*(?:\.\d*)?[\dP~]*)\s*$/i;

export function normalizeOcrLine(line: string): string {
  let s = line.trim();
  s = s.replace(/^[A-Z|]\s+(?=[\u4e00-\u9fff])/i, "");
  s = s.replace(/(?<=[\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])/g, "");
  s = s.replace(/星\s*期\s*([日天一二三四五六])/g, "星期$1");
  s = s.replace(/(\d+)\s*分\s*鐘\s*前/g, "$1分鐘前");
  s = s.replace(/(\d+)\s*小\s*時\s*前/g, "$1小時前");
  s = s.replace(/(\d+)\s*天\s*前/g, "$1天前");
  return s.trim();
}

export function normalizeOcrText(text: string): string {
  return text
    .split(/\r?\n/)
    .map((l) => normalizeOcrLine(l))
    .join("\n");
}

function currencyCodeFromToken(token: string): string {
  const t = token.toUpperCase().replace(/\$/g, "");
  if (t === "HK" || t === "HKD") return "HKD";
  if (t === "NT" || t === "NTD" || t === "TWD") return "TWD";
  if (t === "US" || t === "USD") return "USD";
  return "HKD";
}

function parseAmountDigits(raw: string): { value: number | null; invalid: boolean } {
  const cleaned = raw.replace(/,/g, "").replace(/[P~]/g, "");
  if (!/^\d+(\.\d{2})?$/.test(cleaned)) {
    const partial = Number(cleaned.replace(/[^\d.]/g, ""));
    return { value: Number.isFinite(partial) ? partial : null, invalid: true };
  }
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return { value: null, invalid: true };
  return { value, invalid: false };
}

function isTransactionLine(line: string): RegExpMatchArray | null {
  return line.match(TX_AMOUNT);
}

/** Date on following lines, including one shared trailing label after consecutive tx rows. */
export function findWalletDateForTransaction(
  lines: string[],
  txIndex: number,
  refDate: Date,
): Date | null {
  let j = txIndex + 1;
  while (j < lines.length) {
    const next = lines[j];
    if (isLikelyDateLine(next)) {
      return resolveWalletDate(next, refDate);
    }
    if (isTransactionLine(next)) {
      j += 1;
      continue;
    }
    if (JOURNEY_ONLY.test(next) || (JUNK_LINE.test(next) && !isTransactionLine(next))) {
      j += 1;
      continue;
    }
    j += 1;
  }
  return null;
}

function findWalletDateBeforeTransaction(
  lines: string[],
  txIndex: number,
  refDate: Date,
): Date | null {
  for (let k = txIndex - 1; k >= 0; k--) {
    const prev = lines[k];
    if (isTransactionLine(prev)) break;
    if (isLikelyDateLine(prev)) {
      return resolveWalletDate(prev, refDate);
    }
  }
  return null;
}

export function parseWalletOcrText(text: string, refDate = new Date()): ImportCandidate[] {
  const normalized = normalizeOcrText(text);
  const lines = normalized.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const candidates: ImportCandidate[] = [];
  const rates = loadFxRates();
  let stickyDate: Date | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (JOURNEY_ONLY.test(line)) continue;
    if (JUNK_LINE.test(line) && !isTransactionLine(line)) continue;

    if (isLikelyDateLine(line) && !isTransactionLine(line)) {
      const resolvedSticky = resolveWalletDate(line, refDate);
      if (resolvedSticky) stickyDate = resolvedSticky;
      continue;
    }

    const match = isTransactionLine(line);
    if (!match) continue;

    let merchant = match[1].trim();
    if (!merchant && i > 0) {
      const prev = lines[i - 1];
      if (!isLikelyDateLine(prev) && !isTransactionLine(prev) && !JUNK_LINE.test(prev)) {
        merchant = prev;
      }
    }
    if (!merchant) merchant = "未知商家";

    const sign = match[2] === "+" ? "income" : "expense";
    const currency = currencyCodeFromToken(match[3]);
    const { value: rawAmount, invalid: amountInvalid } = parseAmountDigits(match[4]);

    const noteParts: string[] = [];
    let j = i + 1;
    while (j < lines.length) {
      const next = lines[j];
      if (isTransactionLine(next) || isLikelyDateLine(next)) break;
      if (!JOURNEY_ONLY.test(next) && !JUNK_LINE.test(next)) {
        noteParts.push(next);
      }
      j += 1;
    }

    const dateAfter = findWalletDateForTransaction(lines, i, refDate);
    const dateBefore = findWalletDateBeforeTransaction(lines, i, refDate);
    const resolved = dateAfter ?? dateBefore ?? stickyDate ?? refDate;
    if (dateAfter) stickyDate = dateAfter;
    else if (dateBefore) stickyDate = dateBefore;
    const dateIso = (resolved ?? refDate).toISOString();

    let amount = rawAmount ?? 0;
    let originalAmount: number | undefined;
    let originalCurrency: string | undefined;
    let note = merchant;
    if (noteParts.length) note = `${merchant} · ${noteParts.join(" · ")}`;

    if (!amountInvalid && currency !== "HKD" && rawAmount != null) {
      originalAmount = rawAmount;
      originalCurrency = currency;
      amount = hkdFromForeign(rawAmount, currency, rates);
      note = `${note}（${currency} ${rawAmount}）`;
    }

    if (sign === "income" && /退款|調整/.test(`${line} ${noteParts.join(" ")}`)) {
      note = `${note} · 退款`;
    }

    candidates.push({
      id: newId(),
      merchant,
      amount,
      currency: "HKD",
      originalAmount,
      originalCurrency,
      type: sign,
      date: dateIso,
      note,
      categoryId: null,
      selected: !amountInvalid,
      isDuplicate: false,
      parseWarning: amountInvalid ? "金額未能讀取，請檢查" : undefined,
      amountInvalid,
    });
  }

  return candidates;
}

/** Simplified fixture for legacy behaviour smoke test. */
export const WALLET_OCR_FIXTURE = `
燒肉 Like HK$261.80
香港灣仔
星期二
Five Guys HK$89.00
Apple Pay
昨日
Uber HK$45.50
香港
30分鐘前
Fusion by PARKnSHOP HK$120.00
香港
26/9/2026
台北 minimelts NT$147.00
Apple Pay
24/9/2026
`.trim();

export const OCTOPUS_OCR_FIXTURE = `
旅程中
B 新界太和 +HK$4.30
車資調整 - 巴士
31分鐘前
B 鐵路 HK$7.90
巴士
昨日
`.trim();

/** Real iPhone Wallet OCR (chi_tra+eng), Oct 2026. */
export const REAL_CARD_OCR = `
X 其 交易 E& L N }
Eftpay*minimelts Hk HK$90.00
香港 灣仔
星期 二
燒 肉 Like HK$261.80
香港 灣仔
星期 二
Fusion by PARKnSHOP HK$133.50
新 界 太 和
星期 一
Vincenzo Capuano HK$682.00
香港 灣仔
星期 日
Five Guys HK$288.00
香港 灣仔
星期 六
Uber HK$306.70
Apple Pay
26/9/2026
Uber HK$360.13
Apple Pay
26/9/2026
Uber NT$147.00
Apple Pay
24/9/2026
Uber NT$454.00
Apple Pay
24/9/2026
Uber NT$145.P~
Apple Pay Q
23/9/2026
`.trim();

/** Octopus / Wallet: per-row 昨日 / 星期三 / 星期二 labels (multi-day screenshot). */
export const MULTI_DAY_WALLET_OCR = `
巴士 HK$7.70
昨日
巴士 HK$61.00
昨日
巴士 HK$7.80
昨日
B 新界太和 HK$7.20
巴士
星期三
B 鐵路 HK$7.90
星期三
B 鐵路 HK$7.90
星期三
B 新界太和 +HK$4.30
車資調整
星期三
B 新界大埔林村 HK$12.10
巴士
星期三
B 新界太和 HK$7.30
巴士
星期二
B 鐵路 HK$7.90
星期二
B 鐵路 HK$7.90
星期二
消費 HK$56.00
星期二
消費 HK$26.00
星期二
B 新界大埔林村 HK$7.80
巴士
星期二
`.trim();

/** Citi card list: weekday labels plus absolute DD/MM/YYYY rows. */
export const CITI_MIXED_DATE_OCR = `
Five Guys HK$308.00
星期一
Food Fiesta HK$55.00
星期日
Cafe HK$120.00
星期六
必勝客 HK$289.00
16/10/2026
Apple Store HK$21898.00
15/10/2026
`.trim();

/** Shared trailing weekday after consecutive Octopus rows (OCR order). */
export const OCTOPUS_SHARED_TRAILING_DATE_OCR = `
B 鐵路 HK$7.90
B 鐵路 HK$7.90
星期三
B 新界太和 HK$7.30
巴士
星期二
`.trim();

export const REAL_OCTOPUS_OCR = `
eseA 和 國 國 還 加,
馬 新 交易
| X adl | 【 語意 )
自 站
旅程 中
30 分 鐘 前
B 新 界 太 和 +HK$4.30
車 資 調整 - 巴士
31 分 鐘 前
B 新 界 大 埔 林 村 HK$12.10
巴士
44 分 鐘 前
B 新 界 太 和 HK$7.30
巴士
昨日
B 鐵路 HK$7.90
昨日
B 鐵路 HK$7.90
昨日
B 新 界 太 和 +HK$4.30
車 資 調整 - 巴 士
昨日
B 新 界 大 埔 林 村 HK$12.10
巴士
昨日
B 新 界 太 和 HK$7.20
巴士
星期 三
B 鐵路 HK$7.90
星期 三
B 鐵路 HK$7.90
星期 三
`.trim();
