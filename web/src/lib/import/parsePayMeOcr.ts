import { newId } from "../format";
import { normalizeOcrText } from "./parseWalletOcr";
import type { ImportCandidate } from "./types";

const PAYME_DATE_HEADER =
  /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/;

const EXPENSE_AMOUNT_LINE =
  /^[-−－]\s*([0-9０-９,，]+(?:\.[0-9０-９]{1,2})?)\s*$/;

const INCOME_AMOUNT_LINE =
  /^\+?\s*([0-9０-９,，]+(?:\.[0-9０-９]{1,2})?)\s*$/;

const INLINE_EXPENSE =
  /^(.*?)\s*[-−－]\s*([0-9０-９,，]+(?:\.[0-9０-９]{1,2})?)\s*$/;

const JUNK_LINE =
  /港幣\s*[\d,.]|你已經儲了|不用再怕|自動增值|Trip\.com|主頁|向商店付款|我的帳戶|^朋友$|^通知$|PayMe/i;

function toAsciiDigits(s: string): string {
  return s
    .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30))
    .replace(/，/g, ",")
    .replace(/．/g, ".");
}

function parseHkdAmount(raw: string): number | null {
  const cleaned = toAsciiDigits(raw).replace(/,/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function isLikelyPayMeOcrText(text: string): boolean {
  const t = normalizeOcrText(text);
  if (/向商店付款|PayMe/i.test(t)) return true;
  const hasPayMeDate = PAYME_DATE_HEADER.test(t);
  const hasSignedAmount =
    /[-−－]\s*[\d０-９,，]+(?:\.[\d０-９]+)?/m.test(t) &&
    /\+\s*[\d０-９,，]+(?:\.[\d０-９]+)?/m.test(t);
  const hasTopUp = /增值/.test(t) && /恒生銀行/.test(t);
  const walletStyle = /HK\$\s*[\d,.]+/i.test(t);
  return hasPayMeDate && hasSignedAmount && hasTopUp && !walletStyle;
}

function parsePayMeDateHeader(line: string): Date | null {
  const m = line.match(PAYME_DATE_HEADER);
  if (!m) return null;
  const year = Number(toAsciiDigits(m[1]));
  const month = Number(toAsciiDigits(m[2])) - 1;
  const day = Number(toAsciiDigits(m[3]));
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  return new Date(year, month, day, 12, 0, 0, 0);
}

function isDateHeader(line: string): boolean {
  return PAYME_DATE_HEADER.test(line);
}

function isJunk(line: string): boolean {
  return JUNK_LINE.test(line.trim());
}

function isIncomeAmountLine(line: string): boolean {
  const t = line.trim();
  if (!t.startsWith("+")) return false;
  return INCOME_AMOUNT_LINE.test(t);
}

function isSubtitlePayment(s: string): boolean {
  return /^付款$/.test(s.trim());
}

function isEmojiOnly(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  return !/[A-Za-z0-9\u4e00-\u9fff]/.test(t);
}

function isTopUpMeta(line: string): boolean {
  return line.trim() === "增值" || /恒生銀行/.test(line);
}

function collectRowsBeforeAmount(
  lines: string[],
  amountIndex: number,
): { title: string; subtitle: string } {
  const collected: string[] = [];
  for (let j = amountIndex - 1; j >= 0; j--) {
    const prev = lines[j].trim();
    if (!prev) continue;
    if (isDateHeader(prev)) break;
    if (isJunk(prev)) continue;
    if (EXPENSE_AMOUNT_LINE.test(prev) || isIncomeAmountLine(prev)) break;
    if (isTopUpMeta(prev)) continue;
    collected.unshift(prev);
    if (collected.length >= 2) break;
  }
  const title = collected[0] ?? "未知商家";
  const subtitle = collected.length >= 2 ? collected[1] : collected[0] ?? "";
  return { title, subtitle };
}

function buildNote(merchant: string, subtitle: string): string {
  if (!subtitle || subtitle === merchant) return merchant;
  if (isSubtitlePayment(subtitle) || isEmojiOnly(subtitle)) return merchant;
  return subtitle;
}

export function parsePayMeOcrText(text: string, refDate = new Date()): ImportCandidate[] {
  const normalized = normalizeOcrText(text);
  const lines = normalized.split(/\r?\n/).map((l) => l.trim());

  const candidates: ImportCandidate[] = [];
  let currentDate = new Date(refDate);
  currentDate.setHours(12, 0, 0, 0);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    if (isJunk(line)) continue;

    const dateParsed = parsePayMeDateHeader(line);
    if (dateParsed) {
      currentDate = dateParsed;
      continue;
    }

    if (isIncomeAmountLine(line)) continue;

    let amount: number | null = null;
    let merchant = "";
    let subtitle = "";

    const expenseMatch = line.match(EXPENSE_AMOUNT_LINE);
    if (expenseMatch) {
      amount = parseHkdAmount(expenseMatch[1]);
      const rows = collectRowsBeforeAmount(lines, i);
      merchant = rows.title;
      subtitle = rows.subtitle;
    } else {
      const inline = line.match(INLINE_EXPENSE);
      if (!inline) continue;
      merchant = inline[1].trim();
      amount = parseHkdAmount(inline[2]);
      if (i > 0) {
        const prev = lines[i - 1];
        if (prev && !isDateHeader(prev) && !isJunk(prev) && !isTopUpMeta(prev)) {
          subtitle = prev;
        }
      }
    }

    if (amount == null || !merchant) continue;
    if (isTopUpMeta(merchant)) continue;

    const note = buildNote(merchant, subtitle);

    candidates.push({
      id: newId(),
      merchant,
      amount,
      currency: "HKD",
      type: "expense",
      date: currentDate.toISOString(),
      note,
      categoryId: null,
      selected: true,
      isDuplicate: false,
    });
  }

  return candidates;
}

/** Realistic HSBC PayMe transaction-history OCR (Traditional Chinese UI). */
export const PAYME_OCR_FIXTURE = `
港幣 0.00
你已經儲了 1 個火
不用再怕餘額不足！立即設定自動增值功能！
2026年10月10日
TAOBAO
付款
- 355.30
增值
恒生銀行有限公司 **6882
+ 354.30
2026年10月09日
Billy Billy
dinner
- 371.00
增值
恒生銀行有限公司 **6882
+ 371.00
Regina So
🍜
- 258.00
Trip.com 限時優惠
主頁 朋友 向商店付款 通知 我的帳戶
`.trim();
