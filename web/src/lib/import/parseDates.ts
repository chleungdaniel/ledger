const WEEKDAY_MAP: Record<string, number> = {
  日: 0,
  天: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
};

/** Collapse OCR spacing noise before date parsing. */
export function normalizeDateToken(line: string): string {
  return line
    .replace(/\s+/g, "")
    .replace(/星\s*期/g, "星期")
    .replace(/分\s*鐘\s*前/g, "分鐘前")
    .replace(/小\s*時\s*前/g, "小時前")
    .replace(/天\s*前/g, "天前");
}

export interface WalletDateContext {
  /** Civil day key (YYYY-MM-DD local) for 昨日 when the OCR mentions 昨日/昨天. */
  yesterdayDayKey: string | null;
}

export function walletCivilDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Store wallet-resolved instants at local noon so home grouping stays on the intended civil day. */
export function walletDateToIso(d: Date): string {
  const noon = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
  return noon.toISOString();
}

export function buildWalletDateContext(lines: string[], ref: Date): WalletDateContext {
  const hasYesterday = lines.some((line) => {
    const t = normalizeDateToken(line.trim());
    return /昨日|昨天/.test(t) || /昨日|昨天/.test(extractWalletDateToken(line) ?? "");
  });
  if (!hasYesterday) return { yesterdayDayKey: null };
  const y = resolveWalletDate("昨日", ref, { yesterdayDayKey: null });
  return { yesterdayDayKey: y ? walletCivilDayKey(y) : null };
}

/** Pull a Wallet date token from a subtitle row (e.g. `巴士 昨日`). */
export function extractWalletDateToken(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (isLikelyDateLine(trimmed)) return normalizeDateToken(trimmed);
  const trailing = trimmed.match(
    /(今日|今天|昨日|昨天|\d+\s*分鐘前|\d+\s*小時前|\d+\s*天前|星期\s*[日天一二三四五六]|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}\/\d{1,2}\/\d{1,2}|\d{4}年\d{1,2}月\d{1,2}日)\s*$/,
  );
  return trailing ? normalizeDateToken(trailing[1]) : null;
}

function resolveWeekday(target: number, ref: Date, ctx: WalletDateContext): Date {
  const d = new Date(ref);
  const current = d.getDay();
  let diff = current - target;
  if (diff <= 0) diff += 7;
  if (diff === 0) diff = 7;
  d.setDate(d.getDate() - diff);
  if (ctx.yesterdayDayKey) {
    while (walletCivilDayKey(d) === ctx.yesterdayDayKey) {
      d.setDate(d.getDate() - 7);
    }
  }
  return startOfMinute(d);
}

/** Resolve Wallet-style relative / absolute date strings against `ref` (usually now). */
export function resolveWalletDate(
  line: string,
  ref: Date,
  ctx: WalletDateContext = { yesterdayDayKey: null },
): Date | null {
  const token = extractWalletDateToken(line) ?? normalizeDateToken(line.trim());
  const t = normalizeDateToken(token);
  if (!t) return null;

  if (/今日|今天/.test(t)) return startOfMinute(ref);

  if (/昨日|昨天/.test(t)) {
    const d = new Date(ref);
    d.setDate(d.getDate() - 1);
    return startOfMinute(d);
  }

  const mins = t.match(/(\d+)分鐘前/);
  if (mins) {
    const d = new Date(ref);
    d.setMinutes(d.getMinutes() - Number(mins[1]));
    return startOfMinute(d);
  }

  const hours = t.match(/(\d+)小時前/);
  if (hours) {
    const d = new Date(ref);
    d.setHours(d.getHours() - Number(hours[1]));
    return startOfMinute(d);
  }

  const days = t.match(/(\d+)天前/);
  if (days) {
    const d = new Date(ref);
    d.setDate(d.getDate() - Number(days[1]));
    return startOfMinute(d);
  }

  const weekday = t.match(/星期([日天一二三四五六])/);
  if (weekday) {
    const target = WEEKDAY_MAP[weekday[1]];
    if (target == null) return null;
    return resolveWeekday(target, ref, ctx);
  }

  const dmy = t.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]) - 1;
    const year = Number(dmy[3]);
    return new Date(year, month, day, 12, 0, 0, 0);
  }

  const ymdCn = t.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (ymdCn) {
    const year = Number(ymdCn[1]);
    const month = Number(ymdCn[2]) - 1;
    const day = Number(ymdCn[3]);
    return new Date(year, month, day, 12, 0, 0, 0);
  }

  const ymdSlash = t.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (ymdSlash) {
    const year = Number(ymdSlash[1]);
    const month = Number(ymdSlash[2]) - 1;
    const day = Number(ymdSlash[3]);
    return new Date(year, month, day, 12, 0, 0, 0);
  }

  return null;
}

function startOfMinute(d: Date): Date {
  const x = new Date(d);
  x.setSeconds(0, 0);
  return x;
}

export function isLikelyDateLine(line: string): boolean {
  const t = normalizeDateToken(line.trim());
  if (!t) return false;
  return (
    /今日|今天|昨日|昨天|分鐘前|小時前|天前|星期[日天一二三四五六]|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}\/\d{1,2}\/\d{1,2}|\d{4}年\d{1,2}月\d{1,2}日/.test(
      t,
    ) || /^星期/.test(t)
  );
}
