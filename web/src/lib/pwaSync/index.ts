import { bytesToBase64Url, base64UrlToBytes } from "./codec";
import { browserGunzip, browserGzip } from "./gzipBrowser";
import {
  mergeSyncPayload,
  previewSyncPayload,
  recordsFromTransactions,
  isValidTransactionId,
} from "./merge";
import type { SyncPayload } from "./types";
import { PWA_SYNC_PREFIX } from "./types";
import type { Category, Transaction } from "../../types";

export {
  PWA_SYNC_PREFIX,
  mergeSyncPayload,
  previewSyncPayload,
  recordsFromTransactions,
  isValidTransactionId,
};
export type { SyncPayload, SyncTransactionRecord } from "./types";
export { encodeSyncCode, decodeSyncCode } from "./codec";

export function listUnsyncedTransactions(transactions: Transaction[]): Transaction[] {
  return transactions.filter((t) => !t.pwaSyncExportedAt);
}

export function buildSyncPayload(
  transactions: Transaction[],
  categories: Category[],
  unsynced: Transaction[],
): SyncPayload {
  return {
    v: 1,
    exportedAt: new Date().toISOString(),
    transactions: recordsFromTransactions(
      transactions,
      categories,
      unsynced.map((t) => t.id),
    ),
  };
}

export async function encodeSyncPayloadAsync(payload: SyncPayload): Promise<string> {
  const json = JSON.stringify(payload);
  const bytes = await browserGzip(json);
  return `${PWA_SYNC_PREFIX}${bytesToBase64Url(bytes)}`;
}

export async function decodeSyncPayloadAsync(code: string): Promise<SyncPayload> {
  const trimmed = code.trim();
  if (!trimmed.startsWith(PWA_SYNC_PREFIX)) {
    throw new Error("invalid_sync_prefix");
  }
  const body = trimmed.slice(PWA_SYNC_PREFIX.length);
  const bytes = base64UrlToBytes(body);
  const json = await browserGunzip(bytes);
  const parsed = JSON.parse(json) as SyncPayload;
  if (parsed.v !== 1 || !Array.isArray(parsed.transactions)) {
    throw new Error("invalid_sync_payload");
  }
  return parsed;
}
