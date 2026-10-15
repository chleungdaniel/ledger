# Apple Wallet / 捷徑自動記帳

記帳 PWA 網址（GitHub Pages）：

`https://chleungdaniel.github.io/ledger/`

## URL 合約（建議：確認後入帳）

開啟下列格式時，App 會顯示 **確認入帳** 畫面（金額、商戶、建議分類），使用者點 **確認入帳** 才會寫入 IndexedDB。取消則不儲存。儲存後會清除網址上的查詢參數，避免重新整理重複入帳。

```
https://chleungdaniel.github.io/ledger/?add=1&amount=【金額】&merchant=【商戶】&type=expense
```

| 參數 | 說明 |
|------|------|
| `add=1` | 觸發新增流程 |
| `amount` | 金額（可含 `HK$`、`$`、逗號；亦支援 `鐵路：HK$7.90` 整段放在 `amount` 或 `merchant`） |
| `merchant` | 商戶／備註 |
| `type` | `expense`（預設）或 `income` |
| `date` | 選填，ISO 日期時間 |

**不要**在一般 Wallet 自動化使用 `auto=1` 期望靜默儲存。若要跳過確認（不建議），需明確加上：

```
&auto=1&confirm=0
```

### 金額／商戶為空白？

若確認畫面上金額或商戶是空的，通常是 **捷徑變數接錯**（例如從「接收輸入」而非「點一下任何卡時」區塊取「數量」「商戶」），請依下方步驟重建。

## iOS 捷徑設定（Transaction 自動化）

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
5. （選填）在自動化開頭關閉「執行前先詢問」，以免多一層系統確認。

### Shortcuts AI / 重建提示詞（繁中）

可將以下文字貼給捷徑 App 的 AI，請它重建自動化：

> 建立一個「交易」個人自動化：任何信用卡或 Apple Pay 交易、立即執行。動作：先用「文字」組出 URL  
> `https://chleungdaniel.github.io/ledger/?add=1&amount=` 加上「點一下任何卡時」的「數量」變數、`&merchant=` 加上同區塊的「商戶」變數、`&type=expense`，再用「開啟 URL」打開該文字。不要用「接收輸入」。不要加 auto=1。

## 八達通

多數八達通乘車 **不會** 觸發 Wallet「交易」自動化。請用 App 內 **匯入截圖**（OCR）記錄；若將來有捷徑傳入 `鐵路：HK$7.90` 這類字串，App 會自動拆成商戶「鐵路」與金額 `7.90`，並建議 **交通** 分類。

## Safari 與主畫面 App

「開啟 URL」通常在 **Safari** 執行，資料與「加入主畫面」的獨立 PWA 分開。請用首頁 **複製同步碼** / **同步** 合併（見 App 內「自動記帳」說明）。
