import { formatDeepLinkDebug, parseShortcutDateParam } from "./datetime";
import {
  decodeParamValue,
  normalizeShortcutFields,
  parseShortcutAmount,
} from "./parseShortcutAmount";
import type { TransactionType } from "../types";

export interface DeepLinkPayload {
  openAdd: boolean;
  amount: number | null;
  merchant: string;
  type: TransactionType;
  /** ISO datetime; null means use open time in UI */
  date: string | null;
  /**
   * Skip the confirm sheet and save immediately when amount is valid.
   * Requires explicit `confirm=0` (legacy `auto=1` alone now opens confirm).
   */
  silentAutoSave: boolean;
  amountMissing: boolean;
  /** Human-readable debug line for support screenshots */
  rawParamsDebug: string;
}

const AMOUNT_KEYS = ["amount", "Amount", "a", "金額"];
const MERCHANT_KEYS = ["merchant", "Merchant", "name", "m", "商戶"];
const NOTIFICATION_TEXT_KEYS = ["text", "body", "raw", "通知內文", "通知内容"];

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

function parseType(
  params: URLSearchParams,
  amountRaw: string | null,
  merchant: string,
  notificationTextRaw: string | null,
): TransactionType {
  const typeRaw = (params.get("type") ?? "expense").toLowerCase();
  let type: TransactionType = typeRaw === "income" ? "income" : "expense";
  if (amountRaw) {
    const { suggestIncome } = parseShortcutAmount(amountRaw);
    if (suggestIncome) type = "income";
  }
  const hay = `${amountRaw ?? ""} ${merchant} ${notificationTextRaw ?? ""}`;
  if (/退款|退費|refund|reversal|chargeback/i.test(hay)) {
    type = "income";
  }
  return type;
}

export function parseDeepLink(search: string): DeepLinkPayload | null {
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const amountRaw = firstParam(params, AMOUNT_KEYS);
  const merchantRaw = firstParam(params, MERCHANT_KEYS);
  const notificationTextRaw = firstParam(params, NOTIFICATION_TEXT_KEYS);
  const add =
    params.get("add") === "1" ||
    amountRaw != null ||
    merchantRaw != null ||
    notificationTextRaw != null ||
    params.has("merchant") ||
    params.has("amount") ||
    NOTIFICATION_TEXT_KEYS.some((k) => params.has(k));

  if (!add) return null;

  const normalized = normalizeShortcutFields(amountRaw, merchantRaw, notificationTextRaw);
  const merchant = normalized.merchant;
  const amount = normalized.amount;
  let type = parseType(params, amountRaw, merchant, notificationTextRaw);
  if (normalized.suggestIncome && type === "expense") {
    type = "income";
  }

  const dateRaw = params.get("date") ?? params.get("Date");
  let date: string | null = null;
  if (dateRaw) {
    const d = parseShortcutDateParam(dateRaw);
    if (d) date = d.toISOString();
  }

  const silentAutoSave = params.get("confirm") === "0";
  const searchNorm = search.startsWith("?") ? search : `?${search}`;
  const href =
    typeof globalThis.window !== "undefined" ? globalThis.window.location.href : "";

  return {
    openAdd: true,
    amount,
    merchant,
    type,
    date,
    silentAutoSave,
    amountMissing: amount == null,
    rawParamsDebug: formatDeepLinkDebug(href, searchNorm),
  };
}

/** Recommended notification automation URL (iOS 27+; confirm-before-save). */
export function buildNotificationShortcutUrlTemplate(
  origin = "https://chleungdaniel.github.io/ledger/",
): string {
  const base = origin.endsWith("/") ? origin : `${origin}/`;
  return `${base}?add=1&text=[通知內文]&type=expense`;
}

/** Legacy Transaction-trigger URL (amount/merchant often blank for Octopus). */
export function buildShortcutUrlTemplate(origin = "https://chleungdaniel.github.io/ledger/"): string {
  const base = origin.endsWith("/") ? origin : `${origin}/`;
  return `${base}?add=1&amount=[Amount]&merchant=[Merchant]&type=expense`;
}

/** Opt-in silent save (power users); not recommended for Wallet automations. */
export function buildShortcutSilentUrlTemplate(
  origin = "https://chleungdaniel.github.io/ledger/",
): string {
  return `${buildShortcutUrlTemplate(origin)}&auto=1&confirm=0`;
}
