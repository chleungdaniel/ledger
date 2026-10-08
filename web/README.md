# 記帳 PWA（Web）

iPhone 優先的漸進式網頁應用（PWA），功能與原生 v1 對齊：收支、分類、每月預算、報表。資料存於瀏覽器 **IndexedDB**，可 **匯出／匯入 JSON** 備份。

## 本機開發

```bash
cd web
npm install
npm run dev
```

在瀏覽器開啟 `http://127.0.0.1:41789`（開發伺服器預設埠）。

## 建置產物

```bash
npm run build
```

靜態檔案輸出至 **`web/dist/`**（含 `index.html`、`assets/`、`sw.js`、`manifest.webmanifest`、圖示）。`vite.config.ts` 使用 `base: "./"`，可部署在任意靜態主機或子路徑。

預覽建置結果：

```bash
npm run preview
```

## 部署至靜態主機

1. 執行 `npm run build`。
2. 將 **`web/dist` 目錄內所有檔案** 上傳至主機，例如：
   - **GitHub Pages**：將 `dist` 內容推至 `gh-pages` 分支或 Actions 上傳 artifact。
   - **Netlify / Vercel / Cloudflare Pages**：根目錄或 build 目錄設為 `web`，build command `npm run build`，publish directory `dist`。
   - **Nginx / S3**：上傳 `dist` 並設定 `index.html` 為預設文件；子路徑部署時確保 `manifest.webmanifest` 與 `sw.js` 一併可存取。

3. 以 **HTTPS** 提供服務（PWA 與 Service Worker 需要）。

### iPhone 安裝

1. 用 Safari 開啟已部署的網址。
2. 點 **分享** → **加入主畫面**。
3. 以獨立全螢幕模式開啟（`display: standalone`）。

## 測試

以 iPhone 視窗大小在 headless Chromium 執行端對端測試：

```bash
npm run test:e2e
```

## 功能摘要

- 首頁：快速支出／收入、最近交易、本月支出／收入／結餘、總預算進度
- 預算：月份選擇、總預算與分類預算、超支紅色提示
- 報表：收入 vs 支出長條圖、分類圓餅圖
- 分類：預設分類、新增／編輯／刪除（有交易不可刪）
- 分類頁底部：JSON 匯出／匯入備份
