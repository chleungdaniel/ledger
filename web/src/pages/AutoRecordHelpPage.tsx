import { useState } from "react";
import { buildShortcutUrlTemplate } from "../lib/deeplink";

export function AutoRecordHelpPage() {
  const [copied, setCopied] = useState(false);
  const template = buildShortcutUrlTemplate();

  async function copyTemplate() {
    try {
      await navigator.clipboard.writeText(template);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="section" data-testid="auto-record-help">
      <h2>自動記帳（捷徑）</h2>
      <div className="card card--soft help-card">
        <p>
          當 iPhone 偵測到<strong>信用卡 / Apple Pay 交易</strong>時，可用「捷徑」自動開啟記帳並預填金額與商家。
          <strong>八達通乘車</strong>多數不會觸發「交易」自動化，請改用首頁的<strong>匯入截圖</strong>。
        </p>
        <ol className="help-steps">
          <li>開啟「捷徑」→「自動化」→「建立個人自動化」。</li>
          <li>選擇觸發條件：<strong>交易</strong>（Transaction）。</li>
          <li>設定卡片或「任何交易」，並選擇「立即執行」。</li>
          <li>新增動作：<strong>開啟 URL</strong>。</li>
          <li>貼上以下網址模板，將變數對應到捷徑提供的 <code>Amount</code>、<code>Merchant</code>（或「金額」「商家」）。</li>
        </ol>
        <pre className="url-template" data-testid="shortcut-url-template">{template}</pre>
        <button type="button" className="btn-secondary" data-testid="copy-shortcut-url" onClick={() => void copyTemplate()}>
          {copied ? "已複製" : "複製 URL 模板"}
        </button>
        <p className="hint">
          加上 <code>&amp;auto=1</code> 會依規則自動選分類並儲存；若需確認，改為 <code>&amp;add=1</code> 不帶 auto。
          亦支援 <code>type=income</code>、<code>date=</code> ISO 日期。
        </p>
        <h3 className="help-subhead">Safari 與主畫面 App 的資料</h3>
        <p>
          捷徑「開啟 URL」會在 <strong>Safari</strong> 記帳，資料存在 Safari 的 IndexedDB，與
          <strong>加入主畫面</strong>的獨立 App 分開。若要讓主畫面 App 看到 Safari 裡的記錄：
        </p>
        <ol className="help-steps">
          <li>在 Safari 打開記帳，首頁會顯示未同步筆數，點 <strong>複製同步碼</strong>。</li>
          <li>打開主畫面 App，點 <strong>同步 Safari 記錄</strong>（首頁或分類），確認合併。</li>
        </ol>
        <p className="hint">
          亦可只在 Safari 使用、不加入主畫面。同步為手動複製／貼上，不經伺服器。
        </p>
      </div>
    </section>
  );
}
