import type { TransactionType } from "../../types";

export type InboxImportSource = "notification" | "transaction" | "deeplink";

export type InboxImportStatus = "pending" | "skipped";

export interface InboxImportItem {
  id: string;
  source: InboxImportSource;
  status: InboxImportStatus;
  createdAt: string;
  amount: number | null;
  merchant: string;
  type: TransactionType;
  /** ISO datetime for matching; defaults to createdAt when confirming */
  date: string;
  rawText: string;
  rawParamsDebug: string;
  fingerprint: string;
  /** Matched ledger transaction id when duplicate detected */
  duplicateLedgerTxId?: string;
  categoryId?: string | null;
  amountMissing: boolean;
}
