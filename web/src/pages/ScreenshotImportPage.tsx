import { useCallback, useEffect, useMemo, useState } from "react";
import {
  isoToLocalDateTimeInput,
  parseLocalDateTimeInputToIso,
} from "../lib/datetime";
import { markDuplicates } from "../lib/import/duplicates";
import { loadFxRates, saveFxRates } from "../lib/import/fxSettings";
import { recognizeImageFiles } from "../lib/import/ocr";
import {
  OCTOPUS_OCR_FIXTURE,
  parseWalletOcrText,
  WALLET_OCR_FIXTURE,
} from "../lib/import/parseWalletOcr";
import { suggestCategoryId } from "../lib/import/suggestCategory";
import type { ImportCandidate } from "../lib/import/types";
import { useLedger } from "../store/LedgerContext";

interface ScreenshotImportPageProps {
  onClose: () => void;
  fixtureKey?: string | null;
}

export function ScreenshotImportPage({ onClose, fixtureKey }: ScreenshotImportPageProps) {
  const { categories, transactions, upsertTransaction, loading } = useLedger();
  const [phase, setPhase] = useState<"pick" | "ocr" | "review">("pick");
  const [candidates, setCandidates] = useState<ImportCandidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fxTwd, setFxTwd] = useState(() => String(loadFxRates().TWD));

  const applySuggestions = useCallback(
    (rows: ImportCandidate[]) => {
      const withCats = rows.map((r) => ({
        ...r,
        categoryId:
          r.categoryId ??
          suggestCategoryId(r.merchant, r.note, r.type, categories, transactions),
      }));
      return markDuplicates(withCats, transactions);
    },
    [categories, transactions],
  );

  useEffect(() => {
    if (!fixtureKey || loading) return;
    const text =
      fixtureKey === "octopus"
        ? OCTOPUS_OCR_FIXTURE
        : fixtureKey === "wallet"
          ? WALLET_OCR_FIXTURE
          : "";
    if (!text) return;
    setCandidates(applySuggestions(parseWalletOcrText(text)));
    setPhase("review");
  }, [fixtureKey, loading, applySuggestions]);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setPhase("ocr");
    try {
      saveFxRates({ TWD: Number(fxTwd) || loadFxRates().TWD });
      const text = await recognizeImageFiles(Array.from(files));
      const parsed = parseWalletOcrText(text);
      if (parsed.length === 0) {
        setError("未能從截圖辨識到交易列，請確認為 Wallet / 八達通「最新交易」列表。");
        setPhase("pick");
        return;
      }
      setCandidates(applySuggestions(parsed));
      setPhase("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "OCR 失敗");
      setPhase("pick");
    }
  }

  const selectedCount = useMemo(
    () => candidates.filter((c) => c.selected && !c.isDuplicate).length,
    [candidates],
  );

  async function commit() {
    const chosen = candidates.filter((c) => c.selected);
    for (const row of chosen) {
      if (!row.categoryId) continue;
      await upsertTransaction({
        amount: row.amount,
        type: row.type,
        categoryId: row.categoryId,
        date: row.date,
        note: row.note,
      });
    }
    onClose();
  }

  function updateRow(id: string, patch: Partial<ImportCandidate>) {
    setCandidates((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  return (
    <div className="import-page" data-testid="import-page">
      <header className="toolbar toolbar--sheet">
        <button type="button" className="btn-text" onClick={onClose}>取消</button>
        <h1>匯入截圖</h1>
        <span />
      </header>

      {phase === "pick" && (
        <div className="import-body pad-horizontal">
          <p className="muted">
            從 iPhone Wallet「最新交易」或八達通交易紀錄截圖。影像只在本機 OCR，不會上傳。
          </p>
          <label className="field">
            <span>台幣 → 港幣匯率（預填 HKD 金額）</span>
            <input
              inputMode="decimal"
              value={fxTwd}
              onChange={(e) => setFxTwd(e.target.value)}
              data-testid="import-fx-twd"
            />
          </label>
          <label className="btn-primary import-file-btn">
            選擇截圖
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              data-testid="import-file-input"
              onChange={(e) => void onFiles(e.target.files)}
            />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
      )}

      {phase === "ocr" && (
        <p className="center muted" data-testid="import-ocr-loading">辨識中…</p>
      )}

      {phase === "review" && (
        <div className="import-review">
          <p className="pad-horizontal muted">
            勾選要加入的列；重複項目已自動取消。外幣金額已依匯率換算，可手動修改。
          </p>
          <div className="list-card list-card--elevated import-list" data-testid="import-review-list">
            {candidates.map((row) => (
              <div
                key={row.id}
                className={`import-row ${row.isDuplicate ? "import-row--dup" : ""}`}
                data-testid="import-row"
              >
                <label className="import-row__check">
                  <input
                    type="checkbox"
                    checked={row.selected}
                    disabled={row.isDuplicate}
                    onChange={(e) => updateRow(row.id, { selected: e.target.checked })}
                  />
                </label>
                <div className="import-row__main">
                  <strong>{row.merchant}</strong>
                  {row.isDuplicate && <span className="import-dup-badge">可能重複</span>}
                  {row.parseWarning && (
                    <span className="import-dup-badge">{row.parseWarning}</span>
                  )}
                  <label className="field field--compact">
                    <span>金額 (HKD)</span>
                    <input
                      inputMode="decimal"
                      value={String(row.amount)}
                      onChange={(e) =>
                        updateRow(row.id, { amount: Number(e.target.value) || 0 })
                      }
                    />
                  </label>
                  <label className="field field--compact">
                    <span>日期</span>
                    <input
                      type="datetime-local"
                      value={isoToLocalDateTimeInput(row.date)}
                      onChange={(e) =>
                        updateRow(row.id, {
                          date: parseLocalDateTimeInputToIso(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="field field--compact">
                    <span>備註</span>
                    <input
                      value={row.note}
                      onChange={(e) => updateRow(row.id, { note: e.target.value })}
                    />
                  </label>
                  <label className="field field--compact">
                    <span>分類</span>
                    <select
                      value={row.categoryId ?? ""}
                      onChange={(e) => updateRow(row.id, { categoryId: e.target.value })}
                    >
                      {categories
                        .filter((c) => c.type === row.type)
                        .map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                  </label>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="btn-primary import-commit"
            data-testid="import-commit"
            disabled={selectedCount === 0}
            onClick={() => void commit()}
          >
            加入 {selectedCount} 筆
          </button>
        </div>
      )}
    </div>
  );
}
