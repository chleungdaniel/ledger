import type { TransactionType } from "../../types";

export interface ImportCandidate {
  id: string;
  merchant: string;
  amount: number;
  currency: string;
  originalAmount?: number;
  originalCurrency?: string;
  type: TransactionType;
  date: string;
  note: string;
  categoryId: string | null;
  selected: boolean;
  isDuplicate: boolean;
}

export interface FxRates {
  TWD: number;
  USD: number;
}

export const DEFAULT_FX_RATES: FxRates = {
  TWD: 0.25,
  USD: 7.8,
};
