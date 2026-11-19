import { createHash } from "node:crypto";
import type { Request } from "express";

function firstHeader(req: Request, names: string[]): string | undefined {
  for (const name of names) {
    const raw = req.headers[name];
    if (typeof raw === "string" && raw.trim()) return raw.trim();
    if (Array.isArray(raw) && raw[0]?.trim()) return raw[0].trim();
  }
  return undefined;
}

function stableApiUserId(token: string): string {
  const digest = createHash("sha256").update(token).digest("hex").slice(0, 32);
  return `api:${digest}`;
}

/** Resolve the Cursor-signed-in principal for this request (see docs/LIVE_APP.md). */
export function resolveUserId(req: Request): string | null {
  const explicit =
    firstHeader(req, [
      "x-cursor-user-id",
      "x-cursor-user",
      "x-vercel-oidc-user-id",
      "x-vercel-jwt-user-id",
    ]) ?? process.env.LEDGER_DEV_USER_ID?.trim();

  if (explicit) return explicit;

  const email = firstHeader(req, ["x-cursor-user-email", "x-vercel-oidc-user-email"]);
  if (email) return `email:${email.toLowerCase()}`;

  const apiToken = firstHeader(req, ["x-cursor-app-token"]);
  if (apiToken) return stableApiUserId(apiToken);

  return null;
}

export function requireUserId(req: Request): string {
  const userId = resolveUserId(req);
  if (!userId) {
    const err = new Error("UNAUTHORIZED");
    throw err;
  }
  return userId;
}