import { decodeParamValue, parseShortcutAmount } from "./parseShortcutAmount";
import type { TransactionType } from "../types";

export interface DeepLinkPayload {
  openAdd: boolean;
  amount: number | null;
  merchant: string;
  type: TransactionType;
  /** ISO datetime; null means use open time in UI */
  date: string | null;
  auto: boolean;
  amountMissing: boolean;
  /** Human-readable debug line for support screenshots */
  rawParamsDebug: string;
}

const AMOUNT_KEYS = ["amount", "Amount", "a", "金額"];
const MERCHANT_KEYS = ["merchant", "Merchant", "name", "m", "商戶"];

function firstParam(params: URLSearchParams, keys: string[]): string | null {
  for (const key of keys) {
    const v = params.get(key);
    if (v != null && v !== "") return v;
  }
  for (const [key, v] of params.entries()) {
    if (v === "") continue;
    const decodedKey = decodeParamValue(key);
    if (keys.includes(decodedKey) || keys.includes(key)) return v;
  }
  return null;
}

function buildRawDebug(params: URLSearchParams): string {
  const parts: string[] = [];
  for (const [k, v] of params.entries()) {
    parts.push(`${k}=${v}`);
  }
  return parts.join("&") || "(empty query)";
}

function parseType(
  params: URLSearchParams,
  amountRaw: string | null,
  merchant: string,
): TransactionType {
  const typeRaw = (params.get("type") ?? "expense").toLowerCase();
  let type: TransactionType = typeRaw === "income" ? "income" : "expense";
  if (amountRaw) {
    const { suggestIncome } = parseShortcutAmount(amountRaw);
    if (suggestIncome) type = "income";
  }
  const hay = `${amountRaw ?? ""} ${merchant}`;
  if (/退款|退費|refund|reversal|chargeback/i.test(hay)) {
    type = "income";
  }
  return type;
}

export function parseDeepLink(search: string): DeepLinkPayload | null {
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const amountRaw = firstParam(params, AMOUNT_KEYS);
  const merchantRaw = firstParam(params, MERCHANT_KEYS);
  const add =
    params.get("add") === "1" ||
    amountRaw != null ||
    merchantRaw != null ||
    params.has("merchant") ||
    params.has("amount");

  if (!add) return null;

  const merchant = merchantRaw ? decodeParamValue(merchantRaw) : "";
  const type = parseType(params, amountRaw, merchant);
  const { amount } = parseShortcutAmount(amountRaw);

  const dateRaw = params.get("date") ?? params.get("Date");
  let date: string | null = null;
  if (dateRaw) {
    const decoded = decodeParamValue(dateRaw);
    const d = new Date(decoded);
    if (!Number.isNaN(d.getTime())) date = d.toISOString();
  }

  const auto = params.get("auto") === "1";

  return {
    openAdd: true,
    amount,
    merchant,
    type,
    date,
    auto,
    amountMissing: auto && amount == null,
    rawParamsDebug: buildRawDebug(params),
  };
}

export function buildShortcutUrlTemplate(origin = "https://chleungdaniel.github.io/ledger/"): string {
  const base = origin.endsWith("/") ? origin : `${origin}/`;
  return `${base}?add=1&amount=[Amount]&merchant=[Merchant]&type=expense&auto=1`;
}
