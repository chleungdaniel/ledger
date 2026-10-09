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

/** Resolve Wallet-style relative / absolute date strings against `ref` (usually now). */
export function resolveWalletDate(line: string, ref: Date): Date | null {
  const t = normalizeDateToken(line.trim());
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
    const d = new Date(ref);
    const current = d.getDay();
    let diff = current - target;
    if (diff <= 0) diff += 7;
    if (diff === 0) diff = 7;
    d.setDate(d.getDate() - diff);
    return startOfMinute(d);
  }

  const dmy = t.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]) - 1;
    const year = Number(dmy[3]);
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
    /今日|今天|昨日|昨天|分鐘前|小時前|天前|星期[日天一二三四五六]|\d{1,2}\/\d{1,2}\/\d{4}/.test(
      t,
    ) || /^星期/.test(t)
  );
}
