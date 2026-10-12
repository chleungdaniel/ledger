/** Parse HKD opening balance input (full-width digits, commas, optional HK$). */
export function parseOpeningBalanceInput(
  raw: string | null | undefined,
): number | null {
  if (raw == null) return null;
  let s = raw.trim();
  if (!s) return null;

  s = s
    .replace(/[０-９]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30),
    )
    .replace(/．/g, ".")
    .replace(/，/g, ",")
    .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, " ")
    .replace(/港幣|港币|港元|hkd|hk\$/gi, " ")
    .replace(/\$/g, " ")
    .trim();

  const normalized = s.replace(/[^\d.,\s-−－]/g, "").replace(/\s+/g, " ").trim();
  if (!normalized) return null;

  let numStr = normalized.replace(/^[\s]*[-−－]\s*/, "");
  const commaOnly = numStr.includes(",") && !numStr.includes(".");
  if (commaOnly) {
    const parts = numStr.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      numStr = `${parts[0].replace(/\s/g, "")}.${parts[1]}`;
    } else {
      numStr = numStr.replace(/,/g, "");
    }
  } else {
    numStr = numStr.replace(/,/g, "");
  }

  const m = numStr.match(/^(\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  return n;
}

export interface OpeningBalanceSetting {
  amount: number;
  updatedAt: string;
}

export function mergeOpeningBalanceByUpdatedAt(
  local: OpeningBalanceSetting | null,
  remote: OpeningBalanceSetting | undefined | null,
): OpeningBalanceSetting | null {
  if (!remote) return local;
  if (!local) return remote;
  return local.updatedAt >= remote.updatedAt ? local : remote;
}

export function openingBalanceAmount(
  setting: OpeningBalanceSetting | null | undefined,
): number {
  return setting?.amount ?? 0;
}
