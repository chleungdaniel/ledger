import { useMemo, useState } from "react";
import { formatCurrency } from "../lib/format";
import { isInBrowserTab, isStandalonePwa } from "../lib/runtimeContext";
import {
  buildSyncPayload,
  decodeSyncPayloadAsync,
  encodeSyncPayloadAsync,
  listUnsyncedTransactions,
  previewSyncPayload,
} from "../lib/pwaSync";
import { useLedger } from "../store/LedgerContext";

type PanelMode = "export" | "import" | null;

interface PwaSyncControlsProps {
  variant: "banner" | "button";
}

export function PwaSyncControls({ variant }: PwaSyncControlsProps) {
  const {
    categories,
    transactions,
    markTransactionsPwaExported,
    removeTransactions,
    mergePwaSync,
  } = useLedger();
  const [panel, setPanel] = useState<PanelMode>(null);
  const [pasteText, setPasteText] = useState("");
  const [preview, setPreview] = useState<ReturnType<typeof previewSyncPayload> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [removeAfterExport, setRemoveAfterExport] = useState(false);
  const [copiedIds, setCopiedIds] = useState<string[]>([]);
  const [lastCopyCode, setLastCopyCode] = useState<string | null>(null);

  const unsynced = useMemo(
    () => listUnsyncedTransactions(transactions),
    [transactions],
  );
  const inBrowser = isInBrowserTab();
  const inStandalone = isStandalonePwa();

  const showExportBanner = inBrowser && unsynced.length > 0 && variant === "banner";
  const showImportButton =
    (inStandalone || inBrowser) && variant === "button";

  async function copyUnsyncedCode() {
    setError(null);
    setBusy(true);
    try {
      const payload = buildSyncPayload(transactions, categories, unsynced);
      const code = await encodeSyncPayloadAsync(payload);
      await navigator.clipboard.writeText(code);
      setCopiedIds(unsynced.map((t) => t.id));
      setLastCopyCode(code);
      setPanel("export");
    } catch {
      setError("無法複製到剪貼簿，請再試一次。");
    } finally {
      setBusy(false);
    }
  }

  async function confirmExported() {
    if (copiedIds.length === 0) return;
    setBusy(true);
    try {
      await markTransactionsPwaExported(copiedIds);
      if (removeAfterExport) {
        await removeTransactions(copiedIds);
      }
      setCopiedIds([]);
      setPanel(null);
      setRemoveAfterExport(false);
    } finally {
      setBusy(false);
    }
  }

  async function readClipboardForImport() {
    setError(null);
    try {
      const text = await navigator.clipboard.readText();
      setPasteText(text);
      await parseImportText(text);
    } catch {
      setPanel("import");
    }
  }

  async function parseImportText(text: string) {
    setError(null);
    try {
      const payload = await decodeSyncPayloadAsync(text);
      setPreview(previewSyncPayload(payload));
      setPasteText(text);
      setPanel("import");
    } catch {
      setError("同步碼無效或已損壞，請確認已完整複製。");
      setPreview(null);
    }
  }

  async function confirmImport() {
    if (!pasteText.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const payload = await decodeSyncPayloadAsync(pasteText);
      const result = await mergePwaSync(payload);
      setPanel(null);
      setPasteText("");
      setPreview(null);
      setError(
        result.added > 0
          ? `已合併 ${result.added} 筆（略過 ${result.skipped} 筆重複）。`
          : `沒有新交易（${result.skipped} 筆已存在）。`,
      );
      window.setTimeout(() => setError(null), 4000);
    } catch {
      setError("合併失敗，請再試一次。");
    } finally {
      setBusy(false);
    }
  }

  if (!showExportBanner && !showImportButton && variant === "banner") {
    return null;
  }

  return (
    <>
      {showExportBanner && (
        <div className="banner banner--sync" data-testid="pwa-sync-banner">
          <div className="banner--sync__text">
            有 <strong>{unsynced.length}</strong> 筆未同步到主畫面 App
          </div>
          <button
            type="button"
            className="btn-secondary btn-secondary--compact"
            data-testid="pwa-sync-copy"
            disabled={busy}
            onClick={() => void copyUnsyncedCode()}
          >
            複製同步碼
          </button>
        </div>
      )}

      {showImportButton && (
        <div className={variant === "button" ? "pwa-sync-actions" : undefined}>
          {unsynced.length > 0 && (
            <button
              type="button"
              className="btn-secondary"
              data-testid="pwa-sync-copy-standalone"
              disabled={busy}
              onClick={() => void copyUnsyncedCode()}
            >
              複製同步碼
            </button>
          )}
          <button
            type="button"
            className="btn-secondary"
            data-testid="pwa-sync-import"
            disabled={busy}
            onClick={() => void readClipboardForImport()}
          >
            同步 Safari 記錄
          </button>
        </div>
      )}

      {error && (
        <p className="hint hint--sync pad-horizontal" role="alert" data-testid="pwa-sync-message">
          {error}
        </p>
      )}

      {panel === "export" && (
        <div className="sync-sheet" role="dialog" aria-modal="true" data-testid="pwa-sync-export-sheet">
          <div className="sync-sheet__panel">
            <h2>同步碼已複製</h2>
            <p className="muted">
              請在主畫面 App 點「同步 Safari 記錄」，或於 Safari 貼上此碼（雙向皆可）。
            </p>
            {lastCopyCode && (
              <textarea
                className="sync-sheet__code"
                readOnly
                rows={3}
                value={lastCopyCode}
                data-testid="pwa-sync-code-preview"
              />
            )}
            <label className="sync-sheet__check">
              <input
                type="checkbox"
                checked={removeAfterExport}
                onChange={(e) => setRemoveAfterExport(e.target.checked)}
              />
              標記後從此瀏覽器刪除這些交易
            </label>
            <div className="sync-sheet__actions">
              <button type="button" className="btn-text" onClick={() => setPanel(null)}>
                稍後
              </button>
              <button
                type="button"
                className="btn-primary"
                data-testid="pwa-sync-mark-exported"
                disabled={busy}
                onClick={() => void confirmExported()}
              >
                已貼上，標記為已同步
              </button>
            </div>
          </div>
        </div>
      )}

      {panel === "import" && (
        <div className="sync-sheet" role="dialog" aria-modal="true" data-testid="pwa-sync-import-sheet">
          <div className="sync-sheet__panel">
            <h2>合併同步記錄</h2>
            <p className="muted">若無法自動讀取剪貼簿，請貼上同步碼：</p>
            <textarea
              className="sync-sheet__code"
              rows={4}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              onBlur={() => pasteText && void parseImportText(pasteText)}
              placeholder="LEDGERSYNC1:…"
              data-testid="pwa-sync-paste"
            />
            {preview && (
              <p className="sync-sheet__preview" data-testid="pwa-sync-preview">
                將合併 <strong>{preview.count}</strong> 筆 · 支出{" "}
                {formatCurrency(preview.totalExpense)} · 收入{" "}
                {formatCurrency(preview.totalIncome)}
              </p>
            )}
            <div className="sync-sheet__actions">
              <button type="button" className="btn-text" onClick={() => setPanel(null)}>
                取消
              </button>
              <button
                type="button"
                className="btn-primary"
                data-testid="pwa-sync-confirm-import"
                disabled={busy || !pasteText.trim()}
                onClick={() => void confirmImport()}
              >
                確認合併
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Compact toast after Shortcuts auto-save in Safari. */
export function PwaSyncDeepLinkToast({
  visible,
  onDismiss,
  onCopy,
}: {
  visible: boolean;
  onDismiss: () => void;
  onCopy: () => void;
}) {
  if (!visible || !isInBrowserTab()) return null;
  return (
    <div className="toast toast--sync" role="status" data-testid="pwa-sync-deeplink-toast">
      <span>已儲存到 Safari</span>
      <button type="button" className="btn-text btn-text--primary" onClick={onCopy}>
        複製同步碼
      </button>
      <button type="button" className="btn-text" aria-label="關閉" onClick={onDismiss}>
        ✕
      </button>
    </div>
  );
}
