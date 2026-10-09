import type { ImportCandidate } from "./types";
import type { Transaction } from "../../types";

function sameCalendarDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function markDuplicates(
  candidates: ImportCandidate[],
  existing: Transaction[],
): ImportCandidate[] {
  return candidates.map((c) => {
    const dup = existing.some(
      (t) =>
        t.amount === c.amount &&
        t.type === c.type &&
        sameCalendarDay(t.date, c.date) &&
        (t.note.includes(c.merchant) || c.note.includes(t.note) || t.note === c.note),
    );
    return {
      ...c,
      isDuplicate: dup,
      selected: dup ? false : c.selected,
    };
  });
}
