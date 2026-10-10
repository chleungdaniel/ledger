import { decodeParamValue } from "./parseShortcutAmount";

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Value for `<input type="datetime-local">` in the device local timezone. */
export function localDateTimeInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Parse `datetime-local` value as local civil time → ISO UTC for storage. */
export function parseLocalDateTimeInput(value: string): Date {
  const [datePart, timePart = "00:00"] = value.trim().split("T");
  const [y, m, day] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  return new Date(y, m - 1, day, hh, mm ?? 0, 0, 0);
}

export function parseLocalDateTimeInputToIso(value: string): string {
  return parseLocalDateTimeInput(value).toISOString();
}

export function isoToLocalDateTimeInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return localDateTimeInputValue(new Date());
  return localDateTimeInputValue(d);
}

/** Current local time as ISO (correct instant for storage). */
export function localNowIso(): string {
  return new Date().toISOString();
}

/**
 * Parse Shortcuts `date` param: datetime without timezone → local; Z/offset → instant.
 */
export function parseShortcutDateParam(raw: string): Date | null {
  const s = decodeParamValue(raw).trim();
  if (!s) return null;

  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const localMatch = s.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (localMatch) {
    const y = Number(localMatch[1]);
    const mo = Number(localMatch[2]);
    const day = Number(localMatch[3]);
    const hh = localMatch[4] != null ? Number(localMatch[4]) : 12;
    const mm = localMatch[5] != null ? Number(localMatch[5]) : 0;
    const ss = localMatch[6] != null ? Number(localMatch[6]) : 0;
    const d = new Date(y, mo - 1, day, hh, mm, ss, 0);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

const DEBUG_PARAM_GROUPS: string[][] = [
  ["amount", "Amount", "a", "金額"],
  ["merchant", "Merchant", "name", "m", "商戶"],
  ["type", "Type"],
  ["date", "Date"],
  ["add"],
  ["auto"],
];

/** Multi-line debug text for support screenshots. */
export function formatDeepLinkDebug(href: string, search: string): string {
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const lines: string[] = [href, ""];
  const seen = new Set<string>();

  for (const group of DEBUG_PARAM_GROUPS) {
    for (const key of group) {
      if (!params.has(key)) continue;
      seen.add(key);
      const raw = params.get(key);
      const rawLabel = raw === "" || raw == null ? "(empty)" : raw;
      lines.push(`${key}: ${rawLabel}`);
      if (raw && raw !== "") {
        lines.push(`${key} (decoded): ${decodeParamValue(raw)}`);
      }
    }
  }

  for (const [key, raw] of params.entries()) {
    if (seen.has(key)) continue;
    const rawLabel = raw === "" ? "(empty)" : raw;
    lines.push(`${key}: ${rawLabel}`);
    if (raw) lines.push(`${key} (decoded): ${decodeParamValue(raw)}`);
  }

  return lines.join("\n");
}
