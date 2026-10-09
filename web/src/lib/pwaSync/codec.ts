import { PWA_SYNC_PREFIX, type SyncPayload } from "./types";

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64UrlToBytes(encoded: string): Uint8Array {
  const pad = encoded.length % 4 === 0 ? "" : "=".repeat(4 - (encoded.length % 4));
  const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

export type GzipFn = (json: string) => Uint8Array;
export type GunzipFn = (bytes: Uint8Array) => string;

export function encodeSyncCode(payload: SyncPayload, gzip: GzipFn): string {
  const json = JSON.stringify(payload);
  const compressed = gzip(json);
  return `${PWA_SYNC_PREFIX}${bytesToBase64Url(compressed)}`;
}

export function decodeSyncCode(code: string, gunzip: GunzipFn): SyncPayload {
  const trimmed = code.trim();
  if (!trimmed.startsWith(PWA_SYNC_PREFIX)) {
    throw new Error("invalid_sync_prefix");
  }
  const body = trimmed.slice(PWA_SYNC_PREFIX.length);
  const bytes = base64UrlToBytes(body);
  const json = gunzip(bytes);
  const parsed = JSON.parse(json) as SyncPayload;
  if (parsed.v !== 1 || !Array.isArray(parsed.transactions)) {
    throw new Error("invalid_sync_payload");
  }
  return parsed;
}
