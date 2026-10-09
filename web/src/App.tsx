import { useState } from "react";
import type { ReportPeriod } from "./lib/analytics";
import { BackupSection } from "./pages/BackupSection";
import { BudgetPage } from "./pages/BudgetPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { HomePage } from "./pages/HomePage";
import { ReportsPage } from "./pages/ReportsPage";

type Tab = "home" | "budget" | "reports" | "categories";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "home", label: "首頁", icon: "⌂" },
  { id: "budget", label: "預算", icon: "▤" },
  { id: "reports", label: "報表", icon: "◔" },
  { id: "categories", label: "分類", icon: "▦" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>("month");

  return (
    <div className="app-shell">
      <main className="app-main">
        {tab === "home" && <HomePage />}
        {tab === "budget" && <BudgetPage />}
        {tab === "reports" && (
          <ReportsPage period={reportPeriod} onPeriodChange={setReportPeriod} />
        )}
        {tab === "categories" && (
          <>
            <CategoriesPage />
            <BackupSection />
          </>
        )}
      </main>
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
    </div>
  );
}
