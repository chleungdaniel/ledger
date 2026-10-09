import { useCallback, useEffect, useMemo, useState } from "react";
import { isInBrowserTab, isStandalonePwa } from "../lib/runtimeContext";
import { copySyncCodeForTransactions } from "../lib/pwaSync/exportFlow";
import {
  formatLastSyncLabel,
  readLastSyncAt,
  writeLastSyncAt,
} from "../lib/pwaSync/lastSync";
import {
  buildSyncPayload,
  decodeSyncPayloadAsync,
  encodeSyncPayloadAsync,
  listUnsyncedTransactions,
} from "../lib/pwaSync";
import { useLedger } from "../store/LedgerContext";

const LARGE_IMPORT_THRESHOLD = 20;

type ToastKind = "export" | "import" | "deeplink" | null;

interface PwaSyncControlsProps {
  variant: "safari-card" | "import";
  deepLinkToast?: boolean;
  onDeepLinkToastDismiss?: () => void;
}

export function PwaSyncControls({
  variant,
  deepLinkToast = false,
  onDeepLinkToastDismiss,
}: PwaSyncControlsProps) {
  const {
    categories,
    transactions,
    markTransactionsPwaExported,
    mergePwaSync,
    undoPwaSyncMerge,
  } = useLedger();

  const [toast, setToast] = useState<ToastKind>(null);
  const [toastDetail, setToastDetail] = useState<string>("");
  const [undoState, setUndoState] = useState<{
    transactionIds: string[];
    categoryIds: string[];
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [largeConfirmOpen, setLargeConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<string | null>(null);
  const [largePreviewCount, setLargePreviewCount] = useState(0);
  const [lastSyncLabel, setLastSyncLabel] = useState<string | null>(() => {
    const d = readLastSyncAt();
    return d ? formatLastSyncLabel(d) : null;
  });

  const unsynced = useMemo(
    () => listUnsyncedTransactions(transactions),
    [transactions],
  );

  const showSafariCard =
    variant === "safari-card" && isInBrowserTab() && unsynced.length > 0;
  const showImport = variant === "import" && (isStandalonePwa() || isInBrowserTab());

  const dismissToast = useCallback(() => {
    setToast(null);
    setToastDetail("");
    onDeepLinkToastDismiss?.();
  }, [onDeepLinkToastDismiss]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(dismissToast, toast === "import" ? 8000 : 5000);
    return () => window.clearTimeout(t);
  }, [toast, dismissToast]);

  useEffect(() => {
    if (deepLinkToast && isInBrowserTab()) {
      setToast("deeplink");
    }
  }, [deepLinkToast]);

  const copyAndMark = useCallback(
    async (toExport: typeof unsynced) => {
      if (toExport.length === 0) return;
      setBusy(true);
      try {
        await copySyncCodeForTransactions(
          transactions,
          categories,
          toExport,
          markTransactionsPwaExported,
        );
        setToast("export");
        setToastDetail("");
        onDeepLinkToastDismiss?.();
      } catch {
        setToastDetail("無法複製到剪貼簿，請再試一次。");
        setToast("export");
      } finally {
        setBusy(false);
      }
    },
    [
      categories,
      markTransactionsPwaExported,
      onDeepLinkToastDismiss,
      transactions,
    ],
  );

  async function recopyAll() {
    if (transactions.length === 0) return;
    setBusy(true);
    try {
      const payload = buildSyncPayload(transactions, categories, transactions);
      const code = await encodeSyncPayloadAsync(payload);
      await navigator.clipboard.writeText(code);
      setToast("export");
      setToastDetail("");
    } catch {
      setToastDetail("無法複製，請再試一次。");
      setToast("export");
    } finally {
      setBusy(false);
    }
  }

  async function applyMerge(code: string) {
    const payload = await decodeSyncPayloadAsync(code);
    const result = await mergePwaSync(payload);
    writeLastSyncAt();
    setLastSyncLabel(formatLastSyncLabel(new Date()));
    setUndoState({
      transactionIds: result.addedTransactionIds,
      categoryIds: result.addedCategoryIds,
    });
    setPasteOpen(false);
    setLargeConfirmOpen(false);
    setPendingPayload(null);
    setPasteText("");
    setToast("import");
    setToastDetail(
      result.added > 0
        ? `已同步 ${result.added} 筆（略過 ${result.skipped} 筆重複）`
        : `沒有新交易（${result.skipped} 筆重複）`,
    );
    return result;
  }

  async function runImport() {
    setBusy(true);
    setToastDetail("");
    try {
      let code: string;
      try {
        code = await navigator.clipboard.readText();
      } catch {
        setPasteOpen(true);
        return;
      }
      const trimmed = code.trim();
      if (!trimmed.startsWith("LEDGERSYNC1:")) {
        setPasteOpen(true);
        return;
      }
      const payload = await decodeSyncPayloadAsync(trimmed);
      if (payload.transactions.length > LARGE_IMPORT_THRESHOLD) {
        setPendingPayload(trimmed);
        setLargePreviewCount(payload.transactions.length);
        setLargeConfirmOpen(true);
        return;
      }
      await applyMerge(trimmed);
    } catch {
      setPasteOpen(true);
    } finally {
      setBusy(false);
    }
  }

  async function confirmPasteMerge() {
    if (!pasteText.trim()) return;
    setBusy(true);
    try {
      await applyMerge(pasteText.trim());
    } catch {
      setToastDetail("同步碼無效，請確認已完整複製。");
      setToast("import");
    } finally {
      setBusy(false);
    }
  }

  async function confirmLargeMerge() {
    if (!pendingPayload) return;
    setBusy(true);
    try {
      await applyMerge(pendingPayload);
    } catch {
      setToastDetail("合併失敗，請再試一次。");
      setToast("import");
    } finally {
      setBusy(false);
    }
  }

  async function undoLastMerge() {
    if (!undoState) return;
    await undoPwaSyncMerge(undoState.transactionIds, undoState.categoryIds);
    setUndoState(null);
    dismissToast();
  }

  const toastLayer = (
    <PwaSyncToastLayer
      toast={toast}
      toastDetail={toastDetail}
      undoState={undoState}
      onDismiss={dismissToast}
      onUndo={() => void undoLastMerge()}
      onDeepLinkCopy={() => void copyAndMark(unsynced)}
    />
  );

  if (!showSafariCard && !showImport) {
    return toastLayer;
  }

  return (
    <>
      {showSafariCard && (
        <section className="pad-horizontal" data-testid="pwa-sync-card">
          <div className="sync-card">
            <div className="sync-card__body">
              <span className="sync-card__icon" aria-hidden>⇄</span>
              <div>
                <p className="sync-card__title">
                  有 <strong>{unsynced.length}</strong> 筆未同步
                </p>
                <p className="sync-card__hint muted">複製後到主畫面 App 按「同步」</p>
              </div>
            </div>
            <button
              type="button"
              className="sync-card__cta"
              data-testid="pwa-sync-copy"
              disabled={busy}
              onClick={() => void copyAndMark(unsynced)}
            >
              <span className="sync-card__cta-icon" aria-hidden>⎘</span>
              複製同步碼
            </button>
            <button
              type="button"
              className="sync-card__link"
              data-testid="pwa-sync-recopy-all"
              disabled={busy || transactions.length === 0}
              onClick={() => void recopyAll()}
            >
              重新複製全部
            </button>
          </div>
        </section>
      )}

      {showImport && (
        <div className="sync-import-wrap">
          <button
            type="button"
            className="sync-import-btn"
            data-testid="pwa-sync-run"
            disabled={busy}
            onClick={() => void runImport()}
          >
            <span className="sync-import-btn__icon" aria-hidden>⇄</span>
            同步
          </button>
          {lastSyncLabel && isStandalonePwa() && (
            <p className="sync-import-meta muted" data-testid="pwa-sync-last">
              {lastSyncLabel}
            </p>
          )}
        </div>
      )}

      {pasteOpen && (
        <div
          className="sync-sheet"
          role="dialog"
          aria-modal="true"
          data-testid="pwa-sync-paste-sheet"
        >
          <div className="sync-sheet__panel">
            <h2>貼上同步碼</h2>
            <p className="muted">無法讀取剪貼簿時，請在 Safari 複製後貼到下方：</p>
            <textarea
              className="sync-sheet__code"
              rows={4}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="LEDGERSYNC1:…"
              data-testid="pwa-sync-paste"
            />
            <div className="sync-sheet__actions">
              <button type="button" className="btn-text" onClick={() => setPasteOpen(false)}>
                取消
              </button>
              <button
                type="button"
                className="btn-primary"
                data-testid="pwa-sync-paste-confirm"
                disabled={busy || !pasteText.trim()}
                onClick={() => void confirmPasteMerge()}
              >
                同步
              </button>
            </div>
          </div>
        </div>
      )}

      {largeConfirmOpen && pendingPayload && (
        <div
          className="sync-sheet"
          role="dialog"
          aria-modal="true"
          data-testid="pwa-sync-large-confirm"
        >
          <div className="sync-sheet__panel">
            <h2>確認同步</h2>
            <p className="sync-sheet__preview" data-testid="pwa-sync-preview">
              將合併 <strong>{largePreviewCount}</strong> 筆記錄，是否繼續？
            </p>
            <div className="sync-sheet__actions">
              <button
                type="button"
                className="btn-text"
                onClick={() => {
                  setLargeConfirmOpen(false);
                  setPendingPayload(null);
                }}
              >
                取消
              </button>
              <button
                type="button"
                className="btn-primary"
                data-testid="pwa-sync-confirm-import"
                disabled={busy}
                onClick={() => void confirmLargeMerge()}
              >
                確認同步
              </button>
            </div>
          </div>
        </div>
      )}

      {toastLayer}
    </>
  );
}

function PwaSyncToastLayer({
  toast,
  toastDetail,
  undoState,
  onDismiss,
  onUndo,
  onDeepLinkCopy,
}: {
  toast: ToastKind;
  toastDetail: string;
  undoState: { transactionIds: string[]; categoryIds: string[] } | null;
  onDismiss: () => void;
  onUndo: () => void;
  onDeepLinkCopy: () => void;
}) {
  if (toast === "export") {
    return (
      <div
        className="toast toast--sync toast--success"
        role="status"
        data-testid="pwa-sync-export-toast"
      >
        <span>
          {toastDetail || "已複製！去主畫面 App 按「同步」"}
        </span>
        <button type="button" className="btn-text" aria-label="關閉" onClick={onDismiss}>
          ✕
        </button>
      </div>
    );
  }

  if (toast === "import") {
    return (
      <div
        className="toast toast--sync toast--success"
        role="status"
        data-testid="pwa-sync-result-toast"
      >
        <span>{toastDetail || "同步完成"}</span>
        {undoState && undoState.transactionIds.length > 0 && (
          <button
            type="button"
            className="btn-text btn-text--primary"
            data-testid="pwa-sync-undo"
            onClick={onUndo}
          >
            復原
          </button>
        )}
        <button type="button" className="btn-text" aria-label="關閉" onClick={onDismiss}>
          ✕
        </button>
      </div>
    );
  }

  if (toast === "deeplink") {
    return (
      <div className="toast toast--sync" role="status" data-testid="pwa-sync-deeplink-toast">
        <span>已儲存到 Safari</span>
        <button
          type="button"
          className="btn-text btn-text--primary"
          data-testid="pwa-sync-deeplink-copy"
          onClick={onDeepLinkCopy}
        >
          複製同步碼
        </button>
        <button type="button" className="btn-text" aria-label="關閉" onClick={onDismiss}>
          ✕
        </button>
      </div>
    );
  }

  return null;
}

