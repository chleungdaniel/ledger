import type { ImportCandidate } from "./types";
import type { Transaction, TransactionType } from "../../types";

export type ImportDuplicateSource = "ledger" | "batch";

type ImportMatchFields = {
  amount: number;
  type: TransactionType;
  date: string;
  note: string;
  merchant?: string;
};

function sameCalendarDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function amountsMatchImport(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.006;
}

/** Normalize merchant / title for Wallet·Octopus OCR variance across photos. */
export function normalizeImportMerchantLabel(merchant: string, note: string): string {
  const head = (note.split(" · ")[0] || merchant).trim();
  return head.replace(/^B\s+/i, "").replace(/\s+/g, "").toLowerCase();
}

function merchantsLikelySame(a: string, b: string): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length > b.length ? a : b;
  if (shorter.length < 2) return false;
  return longer.includes(shorter);
}

/** Same 帳務 across photos: amount + type + civil day + merchant identity. */
export function importRecordsMatch(a: ImportMatchFields, b: ImportMatchFields): boolean {
  if (a.type !== b.type) return false;
  if (!amountsMatchImport(a.amount, b.amount)) return false;
  if (!sameCalendarDay(a.date, b.date)) return false;

  const ma = normalizeImportMerchantLabel(a.merchant ?? a.note, a.note);
  const mb = normalizeImportMerchantLabel(b.merchant ?? b.note, b.note);
  return merchantsLikelySame(ma, mb);
}

function candidateFields(c: ImportCandidate): ImportMatchFields {
  return {
    amount: c.amount,
    type: c.type,
    date: c.date,
    note: c.note,
    merchant: c.merchant,
  };
}

function transactionFields(t: Transaction): ImportMatchFields {
  return {
    amount: t.amount,
    type: t.type,
    date: t.date,
    note: t.note,
  };
}

/**
 * When the user picks two photos of the same screen, OCR often yields the same row
 * sequence twice (e.g. 7 rows + 7 rows). Mark the second half as batch duplicates
 * without collapsing multiple identical rows from a single screenshot (two 鐵路 rides).
 */
export function repeatedScreenshotBatchIndices(candidates: ImportCandidate[]): Set<number> {
  const dup = new Set<number>();
  const n = candidates.length;
  if (n < 4) return dup;

  for (let block = Math.floor(n / 2); block >= 2; block--) {
    if (n % block !== 0) continue;
    const repeats = n / block;
    if (repeats < 2) continue;

    let allEqual = true;
    for (let r = 1; r < repeats && allEqual; r++) {
      for (let i = 0; i < block; i++) {
        if (
          !importRecordsMatch(
            candidateFields(candidates[i]),
            candidateFields(candidates[r * block + i]),
          )
        ) {
          allEqual = false;
          break;
        }
      }
    }
    if (!allEqual) continue;

    for (let i = block; i < n; i++) dup.add(i);
    return dup;
  }
  return dup;
}

export function markDuplicates(
  candidates: ImportCandidate[],
  existing: Transaction[],
): ImportCandidate[] {
  const batchPhotoDup = repeatedScreenshotBatchIndices(candidates);

  return candidates.map((c, index) => {
    const fields = candidateFields(c);
    const ledgerDup = existing.some((t) => importRecordsMatch(transactionFields(t), fields));
    const batchDup = batchPhotoDup.has(index);
    const dup = ledgerDup || batchDup;

    return {
      ...c,
      isDuplicate: dup,
      duplicateSource: ledgerDup ? "ledger" : batchDup ? "batch" : undefined,
      selected: dup ? false : c.selected,
    };
  });
}
