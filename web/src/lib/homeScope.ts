import {
  allTimeSummary,
  monthSummary,
  summaryFromTransactions,
  transactionsInMonth,
  transactionsInYear,
  type MonthSummary,
} from "./analytics";
import type { Transaction } from "../types";

export type HomeScope = "month" | "year" | "all";

export function filterTransactionsForScope(
  transactions: Transaction[],
  scope: HomeScope,
  year: number,
  month: number,
): Transaction[] {
  if (scope === "all") return [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  if (scope === "year") return transactionsInYear(transactions, year);
  return transactionsInMonth(transactions, year, month);
}

export function summaryForScope(
  transactions: Transaction[],
  scope: HomeScope,
  year: number,
  month: number,
): MonthSummary {
  if (scope === "all") return allTimeSummary(transactions);
  if (scope === "year") return summaryFromTransactions(transactionsInYear(transactions, year));
  return monthSummary(transactions, year, month);
}

export function periodPickerLabel(
  scope: HomeScope,
  year: number,
  month: number,
): string {
  if (scope === "all") return "所有";
  if (scope === "year") return `${year}年`;
  return `${year}年 ${month}月`;
}
