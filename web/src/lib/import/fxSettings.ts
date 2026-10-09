import { DEFAULT_FX_RATES, type FxRates } from "./types";

const KEY = "ledger.fxRates";
let memoryRates: FxRates | null = null;

export function loadFxRates(): FxRates {
  try {
    if (typeof localStorage === "undefined") {
      return { ...DEFAULT_FX_RATES, ...(memoryRates ?? {}) };
    }
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_FX_RATES };
    return { ...DEFAULT_FX_RATES, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_FX_RATES };
  }
}

export function saveFxRates(rates: Partial<FxRates>): FxRates {
  const next = { ...loadFxRates(), ...rates };
  if (typeof localStorage === "undefined") {
    memoryRates = next;
    return next;
  }
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function hkdFromForeign(amount: number, currency: string, rates: FxRates): number {
  const c = currency.toUpperCase();
  if (c === "HKD" || c === "HK$") return amount;
  if (c === "TWD" || c === "NT$") return Math.round(amount * rates.TWD * 100) / 100;
  if (c === "USD" || c === "US$") return Math.round(amount * rates.USD * 100) / 100;
  return amount;
}
