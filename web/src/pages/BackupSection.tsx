import { useRef, useState } from "react";
import type { LedgerBackup } from "../types";
import { useLedger } from "../store/LedgerContext";

export function BackupSection() {
  const { exportData, importData } = useLedger();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleExport() {
    const data = await exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `記帳備份-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("已匯出 JSON 備份。");
  }

  async function handleImport(file: File) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as LedgerBackup;
      if (parsed.version !== 1 || !parsed.categories || !parsed.transactions) {
        throw new Error("invalid");
      }
      await importData(parsed);
      setMessage("已還原備份資料。");
    } catch {
      setMessage("無法讀取備份檔，請確認格式正確。");
    }
  }

  return (
    <section className="section" data-testid="backup-section">
      <h2>資料備份</h2>
      <div className="card backup-card">
        <p className="hint">
          資料儲存在此裝置的 IndexedDB。若 Safari 清除網站資料會遺失紀錄，請定期匯出備份。
        </p>
        <button type="button" className="btn-primary" data-testid="export-backup" onClick={() => void handleExport()}>
          匯出 JSON
        </button>
        <button
          type="button"
          className="btn-secondary"
          data-testid="import-backup"
          onClick={() => fileRef.current?.click()}
        >
          匯入 JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleImport(f);
            e.target.value = "";
          }}
        />
        {message && <p className="hint" role="status">{message}</p>}
      </div>
    </section>
  );
}
