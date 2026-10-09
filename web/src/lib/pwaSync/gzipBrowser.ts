import type { GunzipFn, GzipFn } from "./codec";

async function gzipAsync(json: string): Promise<Uint8Array> {
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream("gzip"));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

async function gunzipAsync(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return await new Response(stream).text();
}

export async function browserGzip(json: string): Promise<Uint8Array> {
  return gzipAsync(json);
}

export async function browserGunzip(bytes: Uint8Array): Promise<string> {
  return gunzipAsync(bytes);
}

/** Sync encode path for tests in jsdom — falls back to uncompressed JSON bytes. */
export const browserGzipSyncFallback: GzipFn = (json) =>
  new TextEncoder().encode(json);

export const browserGunzipSyncFallback: GunzipFn = (bytes) =>
  new TextDecoder().decode(bytes);
