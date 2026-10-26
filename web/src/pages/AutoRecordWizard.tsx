import { useEffect, useState } from "react";
import {
  buildNotificationShortcutUrlTemplate,
  buildShortcutUrlTemplate,
} from "../lib/deeplink";
import { buildInboxTestUrl } from "../lib/import/inbox";
import {
  CREATE_NOTIFICATION_AUTOMATION_HREF,
  notificationShortcutInstallHref,
  openCreateNotificationAutomation,
  openNotificationShortcutInstall,
  runNotificationShortcutTestHref,
} from "../lib/iosShortcuts";
import { getInboxAutoConfirm, setInboxAutoConfirm } from "../db/database";

const WIZARD_APPS_KEY = "autoRecordWizardApps";

const NOTIFICATION_APPS = [
  { id: "wallet", label: "Wallet" },
  { id: "octopus", label: "八達通" },
  { id: "payme", label: "PayMe" },
  { id: "bank", label: "銀行 App" },
] as const;

type WizardStep = 0 | 1 | 2 | 3 | 4;

function loadSelectedApps(): string[] {
  try {
    const raw = localStorage.getItem(WIZARD_APPS_KEY);
    if (!raw) return ["wallet", "octopus", "payme"];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return ["wallet", "octopus", "payme"];
  }
}

export function AutoRecordWizard() {
  const [step, setStep] = useState<WizardStep>(0);
  const [copied, setCopied] = useState<string | null>(null);
  const [apps, setApps] = useState<string[]>(() => loadSelectedApps());
  const [autoConfirm, setAutoConfirm] = useState(false);

  const ledgerOrigin =
    typeof window !== "undefined"
      ? new URL(import.meta.env.BASE_URL, window.location.origin).href
      : undefined;
  const notificationTemplate = buildNotificationShortcutUrlTemplate(ledgerOrigin);
  const transactionTemplate = buildShortcutUrlTemplate(ledgerOrigin);
  const testUrl = buildInboxTestUrl(ledgerOrigin);
  const shortcutInstallHref = notificationShortcutInstallHref(ledgerOrigin);
  const shortcutRunTestHref = runNotificationShortcutTestHref();

  useEffect(() => {
    void getInboxAutoConfirm().then(setAutoConfirm);
  }, []);

  useEffect(() => {
    localStorage.setItem(WIZARD_APPS_KEY, JSON.stringify(apps));
  }, [apps]);

  async function copyText(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  async function toggleAutoConfirm() {
    const next = !autoConfirm;
    setAutoConfirm(next);
    await setInboxAutoConfirm(next);
  }

  function toggleApp(id: string) {
    setApps((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const appLabels = NOTIFICATION_APPS.filter((a) => apps.includes(a.id))
    .map((a) => a.label)
    .join("、");

  return (
    <section className="section" data-testid="auto-record-wizard">
      <h2>自動記帳</h2>
      <div className="card card--soft wizard-card">
        <p className="wizard-tradeoff muted">
          本版採<strong>本機匯入匣</strong>：通知捷徑會短暫開啟記帳並把內文寫入「匯入紀錄」，由你確認後入帳（無需伺服器）。
          真正背景 POST 需另部署 Worker／Supabase，日後可再加。
        </p>

        <ol className="wizard-steps" aria-label="設定步驟">
          {[
            "了解流程",
            "加入捷徑",
            "測試解析",
            "選通知來源",
            "建立自動化",
          ].map((label, i) => (
            <li key={label} className={step === i ? "active" : step > i ? "done" : ""}>
              <button type="button" onClick={() => setStep(i as WizardStep)}>
                {i + 1}. {label}
              </button>
            </li>
          ))}
        </ol>

        {step === 0 && (
          <div className="wizard-panel" data-testid="wizard-step-intro">
            <p>
              1. 在 iOS「捷徑」建立<strong>收到通知時</strong>自動化，把<strong>通知內文</strong>傳入
              <code>text=</code>。
            </p>
            <p>2. 記帳會解析 HK$／NT$ 金額與商戶，項目進入<strong>匯入紀錄</strong>。</p>
            <p>3. 與既有交易重複時會標示，可略過或確認合併。</p>
            <label className="wizard-toggle">
              <input
                type="checkbox"
                checked={autoConfirm}
                onChange={() => void toggleAutoConfirm()}
                data-testid="inbox-auto-confirm-toggle"
              />
              非重複且金額完整時自動入帳（仍會短暫開啟 App）
            </label>
            <button type="button" className="btn-primary" onClick={() => setStep(1)}>
              開始設定
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="wizard-panel" data-testid="wizard-step-shortcut">
            <p>
              在 iPhone 點<strong>加入捷徑</strong>，於「捷徑」App 再按一次加入，即可安裝
              <strong>記帳匯入通知</strong>。之後在個人自動化執行此捷徑並傳入通知內文。
            </p>
            <a
              className="btn-primary wizard-install-shortcut"
              href={shortcutInstallHref}
              data-testid="wizard-add-shortcut"
              onClick={(e) => {
                e.preventDefault();
                openNotificationShortcutInstall(ledgerOrigin);
              }}
            >
              加入捷徑
            </a>
            <p className="hint">
              若無法開啟，請用 Safari 開啟本頁再試。安裝後可到步驟 5 建立「收到通知時」自動化。
            </p>
            <details>
              <summary>進階：手動組 URL 模板</summary>
              <pre className="url-template" data-testid="shortcut-notification-url-template">
                {notificationTemplate}
              </pre>
              <button
                type="button"
                className="btn-secondary"
                data-testid="copy-notification-shortcut-url"
                onClick={() => void copyText("notification", notificationTemplate)}
              >
                {copied === "notification" ? "已複製" : "複製通知 URL 模板"}
              </button>
              <p className="hint">
                在「文字」動作插入觸發區的<strong>通知內文</strong>變數到 <code>text=</code>，再用「開啟 URL」。
                八達通請勿只用「交易」觸發（金額常空白）。
              </p>
              <details>
                <summary>次要：交易（Transaction）模板</summary>
                <pre className="url-template">{transactionTemplate}</pre>
              </details>
            </details>
            <div className="wizard-nav">
              <button type="button" className="btn-text" onClick={() => setStep(0)}>上一步</button>
              <button type="button" className="btn-primary" onClick={() => setStep(2)}>下一步</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="wizard-panel" data-testid="wizard-step-test">
            <p>用範例通知測試解析與匯入匣（建議在主畫面 App 或 Safari 各試一次）：</p>
            <pre className="url-template" data-testid="wizard-test-url">{testUrl}</pre>
            <button
              type="button"
              className="btn-secondary"
              data-testid="wizard-copy-test-url"
              onClick={() => void copyText("test", testUrl)}
            >
              {copied === "test" ? "已複製" : "複製測試連結"}
            </button>
            <a
              className="btn-primary wizard-open-test"
              href={testUrl}
              data-testid="wizard-run-test"
            >
              立即執行測試
            </a>
            <a
              className="btn-secondary wizard-open-test"
              href={shortcutRunTestHref}
              data-testid="wizard-run-shortcut-test"
            >
              用已安裝捷徑測試（鐵路 HK$7.90）
            </a>
            <p className="hint">應出現「匯入紀錄」並含「鐵路」HK$7.90。</p>
            <div className="wizard-nav">
              <button type="button" className="btn-text" onClick={() => setStep(1)}>上一步</button>
              <button type="button" className="btn-primary" onClick={() => setStep(3)}>下一步</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="wizard-panel" data-testid="wizard-step-apps">
            <p>選擇要監聽的通知來源（供你記錄；在捷徑自動化內選相同 App）：</p>
            <div className="wizard-app-grid">
              {NOTIFICATION_APPS.map((app) => (
                <label key={app.id} className="wizard-app-chip">
                  <input
                    type="checkbox"
                    checked={apps.includes(app.id)}
                    onChange={() => toggleApp(app.id)}
                    data-testid={`wizard-app-${app.id}`}
                  />
                  {app.label}
                </label>
              ))}
            </div>
            {appLabels && (
              <p className="muted" data-testid="wizard-selected-apps">已選：{appLabels}</p>
            )}
            <div className="wizard-nav">
              <button type="button" className="btn-text" onClick={() => setStep(2)}>上一步</button>
              <button type="button" className="btn-primary" onClick={() => setStep(4)}>下一步</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="wizard-panel" data-testid="wizard-step-automation">
            <a
              className="btn-primary"
              href={CREATE_NOTIFICATION_AUTOMATION_HREF}
              data-testid="wizard-create-automation"
              onClick={(e) => {
                e.preventDefault();
                openCreateNotificationAutomation();
              }}
            >
              建立個人自動化
            </a>
            <ol className="help-steps">
              <li>捷徑 → 自動化 → 建立個人自動化 → <strong>收到通知時</strong>（或點上方按鈕）。</li>
              <li>
                選擇 App：{appLabels || "Wallet、八達通、PayMe 等"}。
              </li>
              <li>執行方式：<strong>立即執行</strong>（Run Immediately）。</li>
              <li>
                動作：<strong>執行捷徑</strong> → 選「記帳匯入通知」，並傳入<strong>通知內文</strong>（勿手打，用變數）。
              </li>
              <li>（選填）關閉「執行前先詢問」。</li>
            </ol>
            <p className="hint">
              完整說明見 <code>web/SHORTCUTS.md</code>。Safari 與主畫面 App 資料分開時，請用首頁同步碼合併。
            </p>
            <div className="wizard-nav">
              <button type="button" className="btn-text" onClick={() => setStep(3)}>上一步</button>
              <button type="button" className="btn-primary" data-testid="wizard-finish">
                完成
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
