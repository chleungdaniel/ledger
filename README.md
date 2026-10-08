# 記帳

本機記帳 PWA（iPhone 網頁版）— 收支、預算與報表，資料保存在裝置的 IndexedDB。

## 線上使用

**https://chleungdaniel.github.io/ledger/**

## 在 iPhone 上安裝（加入主畫面）

1. 用 **Safari** 開啟上方連結。
2. 點選底列 **分享**（方框與向上箭頭）。
3. 選 **加入主畫面**。
4. 確認名稱後點 **加入**。

之後可像 App 一樣從主畫面開啟；離線時仍可使用已快取的介面（Service Worker）。

## 備份與還原

所有帳目只存在本機瀏覽器，**換手機或清除網站資料會遺失**。請定期在 App 內使用 **備份／匯出** 功能下載 JSON，並妥善保存；需要時用 **匯入** 還原。

## 本機開發

```bash
cd web
npm ci
npm run dev
```

正式環境建置（GitHub Pages 子路徑 `/ledger/`）：

```bash
cd web
npm ci
npm run build
npm run preview
# 瀏覽 http://127.0.0.1:41789/ledger/
```

## 授權

私人專案；公開 Pages 站僅供個人使用。
