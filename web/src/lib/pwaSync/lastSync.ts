const KEY = "ledger.pwaSync.lastAt";

export function readLastSyncAt(): Date | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export function writeLastSyncAt(date: Date = new Date()): void {
  try {
    localStorage.setItem(KEY, date.toISOString());
  } catch {
    /* ignore */
  }
}

export function formatLastSyncLabel(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `上次同步：${h}:${m}`;
}
