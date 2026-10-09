import type { Category, Transaction } from "../../types";
import { buildSyncPayload, encodeSyncPayloadAsync } from "./index";

export async function copySyncCodeForTransactions(
  allTransactions: Transaction[],
  categories: Category[],
  toExport: Transaction[],
  markExported: (ids: string[]) => Promise<void>,
): Promise<void> {
  if (toExport.length === 0) return;
  const payload = buildSyncPayload(allTransactions, categories, toExport);
  const code = await encodeSyncPayloadAsync(payload);
  await navigator.clipboard.writeText(code);
  await markExported(toExport.map((t) => t.id));
}
