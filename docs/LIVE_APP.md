# 記帳 · Cursor Live App

GitHub Pages 上的靜態 PWA（https://chleungdaniel.github.io/ledger/）維持不變，仍只使用裝置 IndexedDB。本文件說明同一 repo 內的 **Live App** 實作：Cursor 登入、Postgres 同步、預覽與發佈。

## 架構

| 元件 | 用途 |
| --- | --- |
| `web/` | 既有 React UI（繁中、銀灰主題、Shortcut 深連結、截圖匯入等） |
| `web/.env.live` | `VITE_APP_TARGET=live` — Live 建置走 API 儲存 |
| `server/` | Express：靜態檔 + REST API + Postgres（`DATABASE_URL`） |
| 根目錄 `package.json` | Live 發佈用 `build` / `start` |

Live 建置使用 `base: /`、**不產生 source map**（符合 Cursor 發佈檢查）。Pages 建置仍為 `base: /ledger/`，`.github/workflows/pages.yml` 未改動。

## Cursor 登入

私人／團隊 Live App 在 **Cursor SSO** 之後才會送到應用。後端以 `server/src/auth.ts` 解析請求主體（優先順序）：

1. `x-cursor-user-id`（及相關轉發標頭）
2. `x-cursor-user-email`
3. `x-cursor-app-token`（自動化／腳本；以雜湊對應穩定 user id）
4. 本機開發：`LEDGER_DEV_USER_ID`

## IndexedDB → Postgres 遷移

1. 使用者在 Live App 以 Cursor 登入後，若**本機 IndexedDB** 仍有交易、而雲端幾乎為空且尚未遷移，畫面頂部會顯示 **「上傳本機資料到雲端」**。
2. 流程呼叫 `POST /api/migrate-indexeddb`：**合併**備份（依 id 略過重複交易，不靜默覆蓋整庫）。
3. 使用者可點「稍後」；選擇會記在 `localStorage`（`ledger-cloud-migrate-dismissed-v1`）。
4. 分類頁的 JSON 匯出／匯入仍可用；雲端匯入會走 `POST /api/import-replace`（明確整庫還原）。

## 預覽（開發）

```bash
# 需要 Postgres，並設定 DATABASE_URL
export DATABASE_URL='postgresql://…'
export LEDGER_DEV_USER_ID='your-dev-user'

cd web && npm ci && npm run build:live
cd ../server && npm ci && npm run dev
# 瀏覽 http://127.0.0.1:8080
```

或從 repo 根目錄：

```bash
export DATABASE_URL='postgresql://…'
npm run dev:live
```

## 發佈 Live App（**請勿在未確認前發佈**）

1. 在 Cursor Cloud Agent 中開啟此 PR 分支，並明確要求 **build / deploy as a Live App**。
2. 在預覽托盤中檢查功能（登入、記帳、跨裝置同步、本機上傳）。
3. 確認通過後再由您自行 **Publish**；本 PR 不會自動上線。

發佈時 Cursor 會注入 `DATABASE_URL` 並執行安全檢查（禁止原始碼 map、`.env`、寫死在檔案內的密鑰等）。

## API 摘要

| 方法 | 路徑 | 說明 |
| --- | --- | --- |
| GET | `/api/me` | 目前 Cursor 使用者 |
| GET | `/api/data` | 完整帳目快照 |
| POST | `/api/migrate-indexeddb` | 合併本機備份 |
| POST | `/api/import-replace` | 整庫還原 |
| PUT/DELETE | `/api/transactions/:id` 等 | 與 IndexedDB 層相同語意 |

## GitHub Pages

- `main` 上的 Pages workflow **不受影響**。
- 僅在合併本 PR **且** 您另行發佈 Live App 後，才會多一個雲端 URL；既有 https://chleungdaniel.github.io/ledger/ 繼續服務靜態 PWA。