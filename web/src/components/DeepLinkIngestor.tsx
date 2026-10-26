import { useEffect, useRef } from "react";
import type { DeepLinkPayload } from "../lib/deeplink";
import {
  getInboxAutoConfirm,
  listInboxImports,
  putInboxImport,
} from "../db/database";
import {
  annotateInboxDuplicates,
  inboxItemFromDeepLink,
  inboxMatchesPending,
} from "../lib/import/inbox";
import { suggestCategoryId } from "../lib/import/suggestCategory";
import { useLedger } from "../store/LedgerContext";

interface DeepLinkIngestorProps {
  deepLink: DeepLinkPayload | null;
  onConsumed: () => void;
  onOpenInbox: (highlightId: string | null) => void;
  /** Silent save still handled on HomePage */
  onSilentDeepLink: (payload: DeepLinkPayload) => void;
}

export function DeepLinkIngestor({
  deepLink,
  onConsumed,
  onOpenInbox,
  onSilentDeepLink,
}: DeepLinkIngestorProps) {
  const { loading, categories, transactions, upsertTransaction } = useLedger();
  const busy = useRef(false);
  const ingestedKey = useRef<string | null>(null);

  useEffect(() => {
    if (!deepLink?.openAdd || loading || busy.current) return;
    const dedupeKey = `${deepLink.rawParamsDebug}|${deepLink.amount}|${deepLink.merchant}`;
    if (ingestedKey.current === dedupeKey) return;
    ingestedKey.current = dedupeKey;

    if (deepLink.silentAutoSave) {
      onSilentDeepLink(deepLink);
      onConsumed();
      return;
    }

    busy.current = true;
    void (async () => {
      try {
        const source =
          deepLink.rawParamsDebug.includes("text=") ||
          deepLink.rawParamsDebug.includes("body=")
            ? "notification"
            : "transaction";
        const item = inboxItemFromDeepLink(deepLink, source);
        const annotated = annotateInboxDuplicates([item], transactions)[0];

        const pending = (await listInboxImports()).filter((i) => i.status === "pending");
        const dupPending = pending.find((p) => inboxMatchesPending(p, annotated));
        if (dupPending) {
          onOpenInbox(dupPending.id);
          onConsumed();
          return;
        }

        const autoConfirm = await getInboxAutoConfirm();
        if (
          autoConfirm &&
          !annotated.duplicateLedgerTxId &&
          annotated.amount != null &&
          annotated.amount > 0
        ) {
          const fallback = categories.find(
            (c) =>
              c.type === annotated.type &&
              c.name === (annotated.type === "income" ? "其他收入" : "其他"),
          );
          const categoryId =
            suggestCategoryId(
              annotated.merchant,
              annotated.merchant,
              annotated.type,
              categories,
              transactions,
            ) ?? fallback?.id;
          if (categoryId) {
            await upsertTransaction({
              amount: annotated.amount,
              type: annotated.type,
              categoryId,
              date: annotated.date,
              note: annotated.merchant.trim(),
            });
            onConsumed();
            return;
          }
        }

        await putInboxImport(annotated);
        onOpenInbox(annotated.id);
      } finally {
        busy.current = false;
        onConsumed();
      }
    })();
  }, [
    deepLink,
    loading,
    categories,
    transactions,
    onConsumed,
    onOpenInbox,
    onSilentDeepLink,
    upsertTransaction,
  ]);

  return null;
}
