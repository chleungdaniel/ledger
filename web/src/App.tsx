import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReportPeriod } from "./lib/analytics";
import { parseDeepLink, type DeepLinkPayload } from "./lib/deeplink";
import { BackupSection } from "./pages/BackupSection";
import { OpeningBalanceSection } from "./pages/OpeningBalanceSection";
import { DeepLinkIngestor } from "./components/DeepLinkIngestor";
import { AutoRecordWizard } from "./pages/AutoRecordWizard";
import { ImportsInboxPage } from "./pages/ImportsInboxPage";
import { BudgetPage } from "./pages/BudgetPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { HomePage } from "./pages/HomePage";
import { ReportsPage } from "./pages/ReportsPage";
import { ScreenshotImportPage } from "./pages/ScreenshotImportPage";

type Tab = "home" | "budget" | "reports" | "categories";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "home", label: "首頁", icon: "⌂" },
  { id: "budget", label: "預算", icon: "▤" },
  { id: "reports", label: "報表", icon: "◔" },
  { id: "categories", label: "分類", icon: "▦" },
];

function readImportFixture(): string | null {
  return new URLSearchParams(window.location.search).get("importFixture");
}

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>("month");
  const [importOpen, setImportOpen] = useState(() => Boolean(readImportFixture()));
  const [inboxOpen, setInboxOpen] = useState(false);
  const [inboxHighlightId, setInboxHighlightId] = useState<string | null>(null);
  const [deepLink, setDeepLink] = useState<DeepLinkPayload | null>(() =>
    parseDeepLink(window.location.search),
  );
  const [silentDeepLink, setSilentDeepLink] = useState<DeepLinkPayload | null>(null);

  const importFixture = useMemo(() => readImportFixture(), []);

  const consumeDeepLink = useCallback(() => {
    setDeepLink(null);
    const url = new URL(window.location.href);
    url.search = "";
    window.history.replaceState({}, "", url.pathname + url.hash);
  }, []);

  useEffect(() => {
    const onPop = () => setDeepLink(parseDeepLink(window.location.search));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const openInbox = (highlightId: string | null = null) => {
    setInboxHighlightId(highlightId);
    setInboxOpen(true);
  };

  return (
    <div className="app-shell">
      <DeepLinkIngestor
        deepLink={deepLink}
        onConsumed={consumeDeepLink}
        onOpenInbox={openInbox}
        onSilentDeepLink={setSilentDeepLink}
      />
      <main className="app-main">
        {importOpen ? (
          <ScreenshotImportPage
            fixtureKey={importFixture}
            onClose={() => setImportOpen(false)}
          />
        ) : inboxOpen ? (
          <ImportsInboxPage
            highlightId={inboxHighlightId}
            onConsumedHighlight={() => setInboxHighlightId(null)}
            onClose={() => {
              setInboxOpen(false);
              setInboxHighlightId(null);
            }}
          />
        ) : (
          <>
            {tab === "home" && (
              <HomePage
                deepLink={silentDeepLink}
                onDeepLinkConsumed={() => setSilentDeepLink(null)}
                onOpenImport={() => setImportOpen(true)}
                onOpenInbox={() => openInbox(null)}
                onNavigateTab={(t) => setTab(t)}
              />
            )}
            {tab === "budget" && <BudgetPage />}
            {tab === "reports" && (
              <ReportsPage period={reportPeriod} onPeriodChange={setReportPeriod} />
            )}
            {tab === "categories" && (
              <>
                <CategoriesPage />
                <AutoRecordWizard />
                <section className="section pad-horizontal" data-testid="settings-section">
                  <h2>設定</h2>
                  <OpeningBalanceSection />
                </section>
                <BackupSection />
              </>
            )}
          </>
        )}
      </main>
      {!importOpen && !inboxOpen && (
        <nav className="tab-bar" aria-label="主要導覽">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={tab === t.id ? "active" : ""}
              data-testid={`tab-${t.id}`}
              onClick={() => setTab(t.id)}
            >
              <span className="tab-bar__icon" aria-hidden>{t.icon}</span>
              <span className="tab-bar__label">{t.label}</span>
              {tab === t.id && <span className="tab-bar__pill" aria-hidden />}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
