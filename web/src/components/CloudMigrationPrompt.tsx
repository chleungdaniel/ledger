import { useCallback, useEffect, useState } from "react";
import { isLiveAppMode } from "../lib/appMode";
import * as localDb from "../db/database";
import { migrateIndexedDbBackup } from "../db/remoteDatabase";
import { fetchRemoteMeta } from "../db/remoteDatabase";
import { useLedger } from "../store/LedgerContext";

const DISMISS_KEY = "ledger-cloud-migrate-dismissed-v1";

export function CloudMigrationPrompt() {
  const { refresh } = useLedger();
  const [visible, setVisible] = useState(false);
  const [localTxCount, setLocalTxCount] = useState(0);
  const [remoteTxCount, setRemoteTxCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLiveAppMode()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    void (async () => {
      try {
        const [local, remote] = await Promise.all([
          localDb.loadAllData(),
          fetchRemoteMeta(),
        ]);
        const localCount = local.transactions.length;
        const remoteCount = remote.transactionCount;
        setLocalTxCount(localCount);
        setRemoteTxCount(remoteCount);
        if (localCount === 0) return;
        if (remote.indexedDbMigratedAt) return;
        if (remoteCount > 0 && remoteCount >= localCount) return;
        setVisible(true);
      } catch {
        // Ignore — user may be offline or unauthorized mid-load.
      }
    })();
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }, []);

  const uploadLocal = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      const backup = await localDb.exportBackup();
      const result = await migrateIndexedDbBackup(backup);
      await refresh();
      setMessage(
        `已上傳本機資料：新增 ${result.addedTransactions} 筆交易（略過 ${result.skippedTransactions} 筆重複）。`,
      );
      localStorage.setItem(DISMISS_KEY, "1");
      setVisible(false);
    } catch {
      setMessage("上傳失敗，請稍後再試。");
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  if (!visible) return null;

  return (
    <div className="cloud-migrate" role="region" aria-label="本機資料上傳" data-testid="cloud-migrate">
      <p className="cloud-migrate__title">偵測到此裝置的 IndexedDB 記帳資料</p>
      <p className="hint">
        本機 {localTxCount} 筆交易 · 雲端 {remoteTxCount} 筆。登入後可將本機資料合併到 Postgres，不會自動覆蓋既有雲端紀錄。
      </p>
      <div className="cloud-migrate__actions">
        <button type="button" className="btn-primary" disabled={busy} onClick={() => void uploadLocal()}>
          {busy ? "上傳中…" : "上傳本機資料到雲端"}
        </button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={dismiss}>
          稍後
        </button>
      </div>
      {message && (
        <p className="hint" role="status">
          {message}
        </p>
      )}
    </div>
  );
}