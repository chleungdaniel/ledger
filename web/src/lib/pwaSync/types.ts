import type { TransactionType } from "../../types";

export const PWA_SYNC_PREFIX = "LEDGERSYNC1:";

export interface SyncTransactionRecord {
  id: string;
  amount: number;
  type: TransactionType;
  categoryName: string;
  categoryType: TransactionType;
  date: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncPayload {
  v: 1;
  exportedAt: string;
  transactions: SyncTransactionRecord[];
}
