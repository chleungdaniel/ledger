import type { Transaction } from "../types";

export interface DayGroup {
  dateKey: string;
  label: string;
  transactions: Transaction[];
  net: number;
}

const locale = "zh-Hant-HK";

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDayLabel(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "long" }).format(d);
  return `${y}/${m}/${day} ${weekday}`;
}

export function groupTransactionsByDay(transactions: Transaction[]): DayGroup[] {
  const map = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const key = dayKey(new Date(tx.date));
    const list = map.get(key) ?? [];
    list.push(tx);
    map.set(key, list);
  }

  const groups: DayGroup[] = [];
  for (const [dateKey, txs] of map) {
    txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let net = 0;
    for (const t of txs) {
      net += t.type === "income" ? t.amount : -t.amount;
    }
    const d = new Date(txs[0].date);
    groups.push({
      dateKey,
      label: formatDayLabel(d),
      transactions: txs,
      net,
    });
  }

  groups.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  return groups;
}
