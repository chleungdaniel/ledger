# Apple Wallet / 捷徑自動記帳

記帳 PWA 網址（GitHub Pages）：

`https://chleungdaniel.github.io/ledger/`

## URL 合約（建議：確認後入帳）

開啟下列格式時，App 會顯示 **確認入帳** 畫面（金額、商戶、建議分類），使用者點 **確認入帳** 才會寫入 IndexedDB。取消則不儲存。儲存後會清除網址上的查詢參數，避免重新整理重複入帳。

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

## iOS 捷徑設定（收到通知時 — 推薦）

1. **捷徑** → **自動化** → **建立個人自動化** → **收到通知時**（Notification；需 iOS 27 或更新系統）。
2. 選擇 App：**八達通**、**Wallet**、**PayMe**，以及你關心的銀行 App（可多選）。
3. 執行方式選 **立即執行**（Run Immediately）。
4. 新增動作 **文字**（Text），內容為（用變數選單插入 **通知內文**，勿手打方括號）：

   ```
   https://chleungdaniel.github.io/ledger/?add=1&text=通知內文&type=expense
   ```

   - 「通知內文」= Shortcuts 在 **收到通知時** 觸發區塊提供的 **Notification Body**（中文介面常顯示「通知內文」）。
   - 捷徑會自動 URL 編碼；若你手動組字串，請確保 `text=` 後為編碼後內容。

5. 新增動作 **開啟 URL**（Open URLs），輸入上一步的「文字」結果。
6. （選填）關閉「執行前先詢問」，減少多一層系統確認。

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
