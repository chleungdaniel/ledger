import type { DeepLinkPayload } from "../deeplink";
import { newId } from "../format";
import {
  importRecordsMatch,
  normalizeImportMerchantLabel,
} from "./duplicates";
import type { InboxImportItem, InboxImportSource } from "./inboxTypes";
import type { Transaction } from "../../types";

/** Two notification automations firing close together (same civil day). */
export const INBOX_TIME_WINDOW_MS = 30 * 60 * 1000;

export function inboxFingerprint(
  amount: number | null,
  merchant: string,
  type: string,
  dateIso: string,
  rawText: string,
): string {
  const day = dateIso.slice(0, 10);
  const amt = amount != null ? amount.toFixed(2) : "";
  const merch = normalizeImportMerchantLabel(merchant, merchant);
  const rawHead = rawText.replace(/\s+/g, " ").trim().slice(0, 96).toLowerCase();
  return `${type}|${day}|${amt}|${merch}|${rawHead}`;
}

export function inboxItemFromDeepLink(
  deepLink: DeepLinkPayload,
  source: InboxImportSource = "notification",
  receivedAt = new Date().toISOString(),
): InboxImportItem {
  const date = deepLink.date ?? receivedAt;
  const rawText =
    deepLink.merchant.trim() ||
    deepLink.rawParamsDebug.split("\n").find((l) => l.includes("text=")) ||
    "";
  const fingerprint = inboxFingerprint(
    deepLink.amount,
    deepLink.merchant,
    deepLink.type,
    date,
    rawText || deepLink.rawParamsDebug,
  );
  return {
    id: newId(),
    source,
    status: "pending",
    createdAt: receivedAt,
    amount: deepLink.amount,
    merchant: deepLink.merchant,
    type: deepLink.type,
    date,
    rawText: rawText || deepLink.rawParamsDebug,
    rawParamsDebug: deepLink.rawParamsDebug,
    fingerprint,
    amountMissing: deepLink.amountMissing,
  };
}

function inboxMatchFields(item: InboxImportItem) {
  return {
    amount: item.amount ?? 0,
    type: item.type,
    date: item.date,
    note: item.merchant,
    merchant: item.merchant,
  };
}

function transactionMatchFields(t: Transaction) {
  return {
    amount: t.amount,
    type: t.type,
    date: t.date,
    note: t.note,
  };
}

function withinTimeWindow(a: string, b: string, windowMs: number): boolean {
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return true;
  return Math.abs(ta - tb) <= windowMs;
}

/**
 * Match inbox row to ledger or another pending row (amount, day, merchant, optional time window).
 */
export function inboxMatchesLedger(
  item: InboxImportItem,
  tx: Transaction,
  windowMs = INBOX_TIME_WINDOW_MS,
): boolean {
  if (item.amount == null || item.amount <= 0) return false;
  if (!withinTimeWindow(item.date, tx.date, windowMs)) return false;
  return importRecordsMatch(inboxMatchFields(item), transactionMatchFields(tx));
}

export function inboxMatchesPending(
  a: InboxImportItem,
  b: InboxImportItem,
  windowMs = INBOX_TIME_WINDOW_MS,
): boolean {
  if (a.fingerprint === b.fingerprint) return true;
  if (a.amount == null || b.amount == null) return false;
  if (!withinTimeWindow(a.date, b.date, windowMs)) return false;
  return importRecordsMatch(inboxMatchFields(a), inboxMatchFields(b));
}

export function annotateInboxDuplicates(
  items: InboxImportItem[],
  ledger: Transaction[],
): InboxImportItem[] {
  const pending = items.filter((i) => i.status === "pending");
  return items.map((item) => {
    if (item.status !== "pending") return item;
    const ledgerHit = ledger.find((t) => inboxMatchesLedger(item, t));
    if (ledgerHit) {
      return { ...item, duplicateLedgerTxId: ledgerHit.id };
    }
    const earlier = pending.find(
      (p) => p.id !== item.id && inboxMatchesPending(p, item),
    );
    if (earlier) {
      return { ...item, duplicateLedgerTxId: earlier.duplicateLedgerTxId ?? earlier.id };
    }
    return item;
  });
}

export function buildInboxTestUrl(origin = "https://chleungdaniel.github.io/ledger/"): string {
  const base = origin.endsWith("/") ? origin : `${origin}/`;
  const text = encodeURIComponent("鐵路：HK$7.90");
  return `${base}?add=1&text=${text}&type=expense`;
}
