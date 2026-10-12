import { describe, expect, it } from "vitest";
import {
  allTimeBalanceWithOpening,
  allTimeSummary,
  monthSummary,
} from "./analytics";
import {
  mergeOpeningBalanceByUpdatedAt,
  parseOpeningBalanceInput,
} from "./openingBalance";
import type { Transaction } from "../types";

const tx = (amount: number, type: "income" | "expense", date: string): Transaction => ({
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  amount,
  type,
  categoryId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  date,
  note: "",
  createdAt: date,
  updatedAt: date,
});

describe("parseOpeningBalanceInput", () => {
  it("parses decimals, commas, and full-width digits", () => {
    expect(parseOpeningBalanceInput("95232.4")).toBe(95232.4);
    expect(parseOpeningBalanceInput("95,232.4")).toBe(95232.4);
    expect(parseOpeningBalanceInput("９５２３２．４")).toBe(95232.4);
    expect(parseOpeningBalanceInput("HK$ 1,000")).toBe(1000);
  });

  it("returns null for empty or invalid", () => {
    expect(parseOpeningBalanceInput("")).toBeNull();
    expect(parseOpeningBalanceInput("abc")).toBeNull();
  });
});

describe("allTimeBalanceWithOpening", () => {
  const transactions = [
    tx(100, "income", "2026-01-15T12:00:00.000Z"),
    tx(40, "expense", "2026-02-01T12:00:00.000Z"),
  ];

  it("adds opening balance only to all-time balance", () => {
    expect(allTimeSummary(transactions).balance).toBe(60);
    expect(allTimeBalanceWithOpening(transactions, 1000)).toBe(1060);
  });

  it("does not change month income or balance", () => {
    const jan = monthSummary(transactions, 2026, 1);
    expect(jan.totalIncome).toBe(100);
    expect(jan.balance).toBe(100);
    const feb = monthSummary(transactions, 2026, 2);
    expect(feb.totalExpense).toBe(40);
    expect(feb.balance).toBe(-40);
  });
});

describe("mergeOpeningBalanceByUpdatedAt", () => {
  it("keeps newer updatedAt", () => {
    const local = { amount: 100, updatedAt: "2026-01-02T00:00:00.000Z" };
    const remote = { amount: 200, updatedAt: "2026-01-01T00:00:00.000Z" };
    expect(mergeOpeningBalanceByUpdatedAt(local, remote)?.amount).toBe(100);
    expect(mergeOpeningBalanceByUpdatedAt(remote, local)?.amount).toBe(100);
  });

  it("accepts remote when local is null", () => {
    const remote = { amount: 50, updatedAt: "2026-01-01T00:00:00.000Z" };
    expect(mergeOpeningBalanceByUpdatedAt(null, remote)?.amount).toBe(50);
  });
});
