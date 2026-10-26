# Apple Wallet / 捷徑自動記帳

記帳 PWA 網址（GitHub Pages）：

`https://chleungdaniel.github.io/ledger/`

## URL 合約（匯入紀錄 → 確認入帳）

開啟下列格式時，App 會把解析結果寫入 **匯入紀錄**（本機 IndexedDB 待確認匣），並開啟審核畫面。使用者點 **確認入帳** 才會寫入正式帳本；**略過** 則不儲存。與既有交易重複時會標示，可 **合併（略過重複）**。

捷徑仍會短暫開啟 PWA（無獨立後端時無法在完全關閉 App 的情況下靜默寫入）。設定內 **自動記帳** 精靈可逐步完成通知自動化；可選「非重複且金額完整時自動入帳」。

儲存後會清除網址上的查詢參數，避免重新整理重複入帳。

### 推薦：通知內文（iOS 27+ / Threads 同款做法）

八達通、Wallet、PayMe 等 App 的 **交易自動化** 常傳不出「數量／商戶」。改用 **收到通知時** 自動化，把整段 **通知內文** 傳給 App，由 App 解析金額與商戶：

```
https://chleungdaniel.github.io/ledger/?add=1&text=【通知內文】&type=expense
```

| 參數 | 說明 |
|------|------|
| `add=1` | 觸發新增流程 |
| `text` | 完整通知／交易文字（URL 編碼）。別名：`body`、`raw` |
| `type` | `expense`（預設）或 `income` |
| `date` | 選填，ISO 日期時間 |

亦可同時傳 `amount`、`merchant`；若兩者非空則優先使用，空白欄位會由 `text` 補齊。

解析範例：`鐵路：HK$7.90`、`HK$12.50 at Starbucks`、PayMe 的 `商戶 - 金額`、含逗號或 `HK$` 的 Wallet 字串。

**不要**在一般自動化使用 `auto=1` 期望靜默儲存。若要跳過確認（不建議），需明確加上：

```
&auto=1&confirm=0
```

## 一鍵加入捷徑（推薦）

在 App 內 **自動記帳** 精靈步驟「加入捷徑」，或直接用下列安裝連結（iPhone Safari／主畫面 App）：

- **安裝捷徑**：`shortcuts://import-shortcut?url=https%3A%2F%2Fchleungdaniel.github.io%2Fledger%2Fshortcuts%2Fledger-notification-import.shortcut&name=%E8%A8%98%E5%B8%B3%E5%8C%AF%E5%85%A5%E9%80%9A%E7%9F%A5`
- **捷徑檔案（Pages 靜態）**：`https://chleungdaniel.github.io/ledger/shortcuts/ledger-notification-import.shortcut`
- **捷徑名稱**：`記帳匯入通知`

流程：點 **加入捷徑** → 跳轉「捷徑」App → 再按 **加入捷徑** → 回到記帳 App。捷徑會把傳入的文字 URL 編碼後開啟  
`https://chleungdaniel.github.io/ledger/?add=1&text=…&type=expense`，項目進入 **匯入紀錄**。

測試：安裝後在精靈「測試解析」點 **用已安裝捷徑測試**，或執行  
`shortcuts://run-shortcut?name=記帳匯入通知&input=text&text=鐵路：HK$7.90`，應看到「鐵路」與 HK$7.90。

## iOS 個人自動化（收到通知時 — 推薦）

安裝捷徑後，建立 **收到通知時** 自動化（無法由網頁完全代你安裝，需在本機捷徑 App 完成）：

1. **捷徑** → **自動化** → **建立個人自動化** → **收到通知時**（Notification；需 iOS 27 或更新系統），或開啟 `shortcuts://create-automation`。
2. 選擇 App：**八達通**、**Wallet**、**PayMe**，以及你關心的銀行 App（可多選）。
3. 執行方式選 **立即執行**（Run Immediately）。
4. 新增動作 **執行捷徑**（Run Shortcut）→ 選 **記帳匯入通知**，並將觸發條件中的 **通知內文** 傳入捷徑（用變數選單，勿手打）。
5. （選填）關閉「執行前先詢問」，減少多一層系統確認。

### 進階：手動「文字 + 開啟 URL」

若不想用預製捷徑，可手動新增 **文字** + **開啟 URL**：

```
https://chleungdaniel.github.io/ledger/?add=1&text=通知內文&type=expense
```

- 「通知內文」= Shortcuts 在 **收到通知時** 觸發區塊提供的 **Notification Body**（中文介面常顯示「通知內文」）。
- 請確保 `text=` 後為 URL 編碼後內容（預製捷徑會自動編碼）。

### Shortcuts AI / 重建提示詞（通知流程，繁中）

> 建立一個「收到通知時」個人自動化：當八達通、Wallet 或 PayMe 發出通知時、立即執行。動作：先用「文字」組出  
> `https://chleungdaniel.github.io/ledger/?add=1&text=` 加上觸發條件裡的「通知內文」變數、再加上 `&type=expense`，再用「開啟 URL」打開該文字。不要用「交易」觸發。不要加 auto=1。

## iOS 捷徑設定（Transaction 自動化 — 次要）

信用卡／Apple Pay 有時可用 **交易**（Transaction）觸發；**八達通乘車多數不會觸發**，且「數量」「商戶」常為空白。

1. **捷徑** → **自動化** → **建立個人自動化** → **交易**（Transaction）。
2. 選擇卡片或「任何交易」，並選 **立即執行**（Run Immediately）。
3. 新增動作 **文字**（Text），內容為（請用變數選單插入，不要手打方括號）：

   ```
   https://chleungdaniel.github.io/ledger/?add=1&amount=數量&merchant=商戶&type=expense
   ```

   - 「數量」= Wallet 交易金額（Shortcuts 英文常顯示為 Amount）。
   - 「商戶」= Merchant（中文介面可能顯示「商戶」）。
   - 變數必須來自觸發條件 **「點一下任何卡時」**（When I tap any card / Transaction）區塊，**不要**用「接收輸入」或空白變數。

4. 新增動作 **開啟 URL**（Open URLs），輸入上一步的「文字」結果。
5. 若確認畫面上金額／商戶仍空白：在自動化編輯畫面展開 **「收到的資料」** 查看實際傳入欄位，或改用上方 **通知內文** 流程。

### Shortcuts AI / 重建提示詞（Transaction，繁中）

> 建立一個「交易」個人自動化：任何信用卡或 Apple Pay 交易、立即執行。動作：先用「文字」組出 URL  
> `https://chleungdaniel.github.io/ledger/?add=1&amount=` 加上「點一下任何卡時」的「數量」變數、`&merchant=` 加上同區塊的「商戶」變數、`&type=expense`，再用「開啟 URL」打開該文字。不要用「接收輸入」。不要加 auto=1。若數量與商戶常為空，請改「收到通知時」並傳「通知內文」到 `text=`。

## 八達通

乘車記錄建議用 **收到通知時** + `text=`（通知內文常含 `鐵路：HK$7.90`）。App 會拆成商戶「鐵路」與金額，並建議 **交通** 分類。亦可使用 App 內 **匯入截圖**（OCR）。

## Safari 與主畫面 App

「開啟 URL」通常在 **Safari** 執行，資料與「加入主畫面」的獨立 PWA 分開。請用首頁 **複製同步碼** / **同步** 合併（見 App 內「自動記帳」說明）。
