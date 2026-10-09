import { parseAmount } from "./format";
import type { TransactionType } from "../types";

export interface DeepLinkPayload {
  openAdd: boolean;
  amount: number | null;
  merchant: string;
  type: TransactionType;
  date: string | null;
  auto: boolean;
}

function parseShortcutAmount(raw: string | null): number | null {
  if (!raw) return null;
  const cleaned = decodeURIComponent(raw)
    .replace(/[^\d.,+\-HK$NTUS€£¥]/gi, " ")
    .trim();
  const m = cleaned.match(/([\d,]+(?:\.\d+)?)/);
  if (!m) return parseAmount(raw);
  return parseAmount(m[1]);
}

export function parseDeepLink(search: string): DeepLinkPayload | null {
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const add = params.get("add") === "1" || params.has("amount") || params.has("merchant");
  if (!add) return null;

  const typeRaw = (params.get("type") ?? "expense").toLowerCase();
  const type: TransactionType = typeRaw === "income" ? "income" : "expense";

  const amount =
    parseShortcutAmount(params.get("amount")) ??
    parseShortcutAmount(params.get("Amount"));

  const merchant =
    params.get("merchant") ??
    params.get("Merchant") ??
    params.get("name") ??
    "";

  const dateRaw = params.get("date") ?? params.get("Date");
  let date: string | null = null;
  if (dateRaw) {
    const d = new Date(dateRaw);
    if (!Number.isNaN(d.getTime())) date = d.toISOString();
  }

  return {
    openAdd: true,
    amount,
    merchant: decodeURIComponent(merchant),
    type,
    date,
    auto: params.get("auto") === "1",
  };
}

export function buildShortcutUrlTemplate(origin = "https://chleungdaniel.github.io/ledger/"): string {
  const base = origin.endsWith("/") ? origin : `${origin}/`;
  return `${base}?add=1&amount=[Amount]&merchant=[Merchant]&type=expense&auto=1`;
}
