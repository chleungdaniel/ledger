import { useState } from "react";
import {
  buildNotificationShortcutUrlTemplate,
  buildShortcutSilentUrlTemplate,
  buildShortcutUrlTemplate,
} from "../lib/deeplink";

export function AutoRecordHelpPage() {
  const [copied, setCopied] = useState<"notification" | "transaction" | null>(null);
  const notificationTemplate = buildNotificationShortcutUrlTemplate();
  const transactionTemplate = buildShortcutUrlTemplate();
  const silentTemplate = buildShortcutSilentUrlTemplate();

  async function copyTemplate(kind: "notification" | "transaction") {
    const text = kind === "notification" ? notificationTemplate : transactionTemplate;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  return (
    <section className="section" data-testid="auto-record-help">
      <h2>自動記帳（捷徑）</h2>
      <div className="card card--soft help-card">
        <p>
          建議使用 iOS 27+ 的 <strong>收到通知時</strong> 自動化：把 Wallet、八達通、PayMe 等 App 的
          <strong>通知內文</strong> 傳入 <code>text=</code>，App 會解析金額與商戶並顯示確認入帳。
          若你仍用 <strong>交易</strong>（Transaction）觸發但金額／商戶常為空白，請改用通知方式（見下方步驟）。
        </p>
        <p className="help-subhead">推薦：收到通知時（通知內文）</p>
        <ol className="help-steps">
          <li>開啟「捷徑」→「自動化」→「建立個人自動化」→ <strong>收到通知時</strong>。</li>
          <li>選擇 App：八達通、Wallet、PayMe 等，並選「立即執行」。</li>
          <li>
            新增「文字」動作，組出 URL（插入觸發區的 <strong>通知內文</strong> 變數到 <code>text=</code>），再「開啟
            URL」。
          </li>
        </ol>
        <pre className="url-template" data-testid="shortcut-notification-url-template">
          {notificationTemplate}
        </pre>
        <button
          type="button"
          className="btn-secondary"
          data-testid="copy-notification-shortcut-url"
          onClick={() => void copyTemplate("notification")}
        >
          {copied === "notification" ? "已複製" : "複製通知 URL 模板"}
        </button>
        <p className="help-subhead">次要：交易（Transaction）</p>
        <p className="hint">
          僅適用部分信用卡／Apple Pay；八達通乘車多數不會觸發。變數請從 <strong>「點一下任何卡時」</strong> 的「數量」「商戶」插入。
        </p>
        <pre className="url-template" data-testid="shortcut-url-template">{transactionTemplate}</pre>
        <button
          type="button"
          className="btn-secondary"
          data-testid="copy-shortcut-url"
          onClick={() => void copyTemplate("transaction")}
        >
          {copied === "transaction" ? "已複製" : "複製交易 URL 模板"}
        </button>
        <p className="hint">
          開啟後會顯示<strong>確認入帳</strong>畫面（金額、商戶、建議分類），點「確認入帳」才儲存。
          若金額仍缺，會顯示數字鍵盤與提示橫幅。亦支援 <code>type=income</code>、<code>date=</code> ISO 日期。
          八達通亦可改用首頁<strong>匯入截圖</strong>。
        </p>
        <details className="deeplink-debug">
          <summary>進階：不確認直接儲存（不建議）</summary>
          <pre className="url-template">{silentTemplate}</pre>
          <p className="hint">
            需加上 <code>&amp;confirm=0</code>；僅在金額與商戶已穩定傳入時使用。
          </p>
        </details>
        <p className="hint">
          完整步驟與 Shortcuts AI 提示詞見 <code>web/SHORTCUTS.md</code>。
        </p>
        <h3 className="help-subhead">Safari 與主畫面 App 的資料</h3>
        <p>
          捷徑「開啟 URL」會在 <strong>Safari</strong> 記帳，資料存在 Safari 的 IndexedDB，與
          <strong>加入主畫面</strong>的獨立 App 分開。若要讓主畫面 App 看到 Safari 裡的記錄：
        </p>
        <ol className="help-steps">
          <li>
            在 Safari 打開記帳，點卡片上的 <strong>複製同步碼</strong>（會自動標記已匯出）。
          </li>
          <li>打開主畫面 App，在「快速記帳」上方點一次 <strong>同步</strong> 即可合併。</li>
        </ol>
        <p className="hint">
          亦可只在 Safari 使用、不加入主畫面。同步為手動複製／貼上，不經伺服器。
        </p>
      </div>
    </section>
  );
}
