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
      </div>
    </section>
  );
}
