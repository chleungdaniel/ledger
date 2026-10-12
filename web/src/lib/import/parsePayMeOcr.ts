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

export interface PayMeSignedRow {
  rowId: string;
  sign: "expense" | "income";
  amount: number;
  date: Date;
  dateKey: string;
  merchant: string;
  subtitle: string;
  lineIndex: number;
}

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

function payMeDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function amountsMatch(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.001;
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

function isBankMeta(line: string): boolean {
  return /恒生銀行/.test(line);
}

function collectRowsBeforeAmount(
  lines: string[],
  amountIndex: number,
  mode: "expense" | "income",
): { title: string; subtitle: string } {
  const collected: string[] = [];
  for (let j = amountIndex - 1; j >= 0; j--) {
    const prev = lines[j].trim();
    if (!prev) continue;
    if (isDateHeader(prev)) break;
    if (isJunk(prev)) continue;
    if (EXPENSE_AMOUNT_LINE.test(prev) || isIncomeAmountLine(prev)) break;
    if (mode === "expense" && (prev === "增值" || isBankMeta(prev))) continue;
    collected.unshift(prev);
    if (collected.length >= 2) break;
  }
  const title = collected[0] ?? "未知商家";
  const subtitle = collected.length >= 2 ? collected[1] : collected[0] ?? "";
  return { title, subtitle };
}

function buildExpenseNote(merchant: string, subtitle: string): string {
  if (!subtitle || subtitle === merchant) return merchant;
  if (isSubtitlePayment(subtitle) || isEmojiOnly(subtitle)) return merchant;
  return subtitle;
}

function buildIncomeNote(merchant: string, subtitle: string): string {
  if (!subtitle || subtitle === merchant) return merchant;
  return subtitle;
}

export function scanSignedRows(lines: string[], refDate: Date): PayMeSignedRow[] {
  const rows: PayMeSignedRow[] = [];
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

    let sign: "expense" | "income" | null = null;
    let amount: number | null = null;
    let merchant = "";
    let subtitle = "";

    const expenseMatch = line.match(EXPENSE_AMOUNT_LINE);
    if (expenseMatch) {
      sign = "expense";
      amount = parseHkdAmount(expenseMatch[1]);
      const meta = collectRowsBeforeAmount(lines, i, "expense");
      merchant = meta.title;
      subtitle = meta.subtitle;
    } else if (isIncomeAmountLine(line)) {
      sign = "income";
      const incMatch = line.match(INCOME_AMOUNT_LINE);
      amount = incMatch ? parseHkdAmount(incMatch[1]) : null;
      const meta = collectRowsBeforeAmount(lines, i, "income");
      merchant = meta.title;
      subtitle = meta.subtitle;
    } else {
      const inline = line.match(INLINE_EXPENSE);
      if (!inline) continue;
      sign = "expense";
      merchant = inline[1].trim();
      amount = parseHkdAmount(inline[2]);
      if (i > 0) {
        const prev = lines[i - 1];
        if (prev && !isDateHeader(prev) && !isJunk(prev) && prev !== "增值" && !isBankMeta(prev)) {
          subtitle = prev;
        }
      }
    }

    if (!sign || amount == null || !merchant) continue;

    rows.push({
      rowId: newId(),
      sign,
      amount,
      date: new Date(currentDate),
      dateKey: payMeDateKey(currentDate),
      merchant,
      subtitle,
      lineIndex: i,
    });
  }

  return rows;
}

/** Pair each '+' with at most one '-' of the same amount (same date preferred). */
export function payMeIncomeRowsToSkip(
  rows: PayMeSignedRow[],
): Set<string> {
  const skipIncome = new Set<string>();
  const expenses = rows.filter((r) => r.sign === "expense");
  const incomes = rows.filter((r) => r.sign === "income");
  const usedExpense = new Set<string>();

  for (const inc of incomes) {
    let match = expenses.find(
      (e) =>
        !usedExpense.has(e.rowId) &&
        amountsMatch(e.amount, inc.amount) &&
        e.dateKey === inc.dateKey,
    );
    if (!match) {
      match = expenses.find(
        (e) => !usedExpense.has(e.rowId) && amountsMatch(e.amount, inc.amount),
      );
    }
    if (match) {
      usedExpense.add(match.rowId);
      skipIncome.add(inc.rowId);
    }
  }

  return skipIncome;
}

export function parsePayMeOcrText(text: string, refDate = new Date()): ImportCandidate[] {
  const normalized = normalizeOcrText(text);
  const lines = normalized.split(/\r?\n/).map((l) => l.trim());
  const scanned = scanSignedRows(lines, refDate);
  const skipIncome = payMeIncomeRowsToSkip(scanned);

  const candidates: ImportCandidate[] = [];

  for (const row of scanned) {
    if (row.sign === "expense") {
      candidates.push({
        id: newId(),
        merchant: row.merchant,
        amount: row.amount,
        currency: "HKD",
        type: "expense",
        date: row.date.toISOString(),
        note: buildExpenseNote(row.merchant, row.subtitle),
        categoryId: null,
        selected: true,
        isDuplicate: false,
      });
      continue;
    }

    if (skipIncome.has(row.rowId)) continue;

    candidates.push({
      id: newId(),
      merchant: row.merchant,
      amount: row.amount,
      currency: "HKD",
      type: "income",
      date: row.date.toISOString(),
      note: buildIncomeNote(row.merchant, row.subtitle),
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
