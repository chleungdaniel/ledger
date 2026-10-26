import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { DeepLinkPayload } from "../lib/deeplink";
import { suggestCategoryId } from "../lib/import/suggestCategory";
import {
  allTimeBalanceWithOpening,
  allTimeSummary,
  expenseByCategory,
  expenseByCategoryAllTime,
  monthSummary,
} from "../lib/analytics";
import { openingBalanceAmount } from "../lib/openingBalance";
import { formatDeepLinkDebug, localNowIso } from "../lib/datetime";
import { groupTransactionsByDay } from "../lib/groupByDay";
import {
  filterTransactionsForScope,
  periodPickerLabel,
  type HomeScope,
} from "../lib/homeScope";
import { formatCurrency, yearMonthFromDate } from "../lib/format";
import {
  HomeChartCarousel,
  type CarouselSummaryScope,
} from "../components/home/HomeChartCarousel";
import { HomeMenuDrawer } from "../components/home/HomeMenuDrawer";
import { HomeTransactionGroups } from "../components/home/HomeTransactionGroups";
import { PwaSyncControls } from "../components/PwaSyncControls";
import { isInBrowserTab } from "../lib/runtimeContext";
import { useLedger } from "../store/LedgerContext";
import type { Transaction } from "../types";
import { TransactionFormPage, type TransactionFormPreset } from "./TransactionFormPage";

type AppTab = "budget" | "reports" | "categories";

interface HomePageProps {
  onOpenImport: () => void;
  onOpenInbox: () => void;
  onNavigateTab: (tab: AppTab) => void;
  deepLink: DeepLinkPayload | null;
  onDeepLinkConsumed: () => void;
}

export function HomePage({
  onOpenImport,
  onOpenInbox,
  onNavigateTab,
  deepLink,
  onDeepLinkConsumed,
}: HomePageProps) {
  const {
    loading,
    categories,
    transactions,
    budgets,
    openingBalance,
    removeTransaction,
    upsertTransaction,
  } = useLedger();
  const now = new Date();
  const current = yearMonthFromDate(now);
  const [scope, setScope] = useState<HomeScope>("month");
  const [viewYear, setViewYear] = useState(current.year);
  const [viewMonth, setViewMonth] = useState(current.month);

  const [menuOpen, setMenuOpen] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [hideAmounts, setHideAmounts] = useState(false);
  const [carouselSummaryScope, setCarouselSummaryScope] =
    useState<CarouselSummaryScope>("month");
  const [undoTx, setUndoTx] = useState<Transaction | null>(null);

  const [formType, setFormType] = useState<"expense" | "income" | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [formPreset, setFormPreset] = useState<TransactionFormPreset | undefined>();
  const [deepLinkToast, setDeepLinkToast] = useState(false);
  useEffect(() => {
    if (!deepLink?.openAdd || loading) return;

    if (deepLink.silentAutoSave) {
      setFormType(deepLink.type);
      const fallbackCat = categories.find(
        (c) =>
          c.type === deepLink.type &&
          c.name === (deepLink.type === "income" ? "其他收入" : "其他"),
      );
      const suggested =
        suggestCategoryId(
          deepLink.merchant,
          deepLink.merchant,
          deepLink.type,
          categories,
          transactions,
        ) ?? fallbackCat?.id ?? null;

      setFormPreset({
        type: deepLink.type,
        amount: deepLink.amount,
        note: deepLink.merchant,
        date: deepLink.date ?? localNowIso(),
        categoryId: suggested,
        autoSave: deepLink.amount != null && deepLink.amount > 0,
        fromDeepLink: true,
        amountMissingBanner: deepLink.amountMissing,
        debugRawParams: formatDeepLinkDebug(
          window.location.href,
          window.location.search,
        ),
      });
      onDeepLinkConsumed();
    }
  }, [deepLink, loading, onDeepLinkConsumed, categories, transactions]);

  const scopedTxs = useMemo(
    () => filterTransactionsForScope(transactions, scope, viewYear, viewMonth),
    [transactions, scope, viewYear, viewMonth],
  );

  const monthSummaryData = useMemo(
    () => monthSummary(transactions, viewYear, viewMonth),
    [transactions, viewYear, viewMonth],
  );
  const allSummaryData = useMemo(
    () => allTimeSummary(transactions),
    [transactions],
  );
  const openingBalanceValue = openingBalanceAmount(openingBalance);
  const allTimeBalance = useMemo(
    () => allTimeBalanceWithOpening(transactions, openingBalanceValue),
    [transactions, openingBalanceValue],
  );
  const summaryForDisplay =
    carouselSummaryScope === "month" ? monthSummaryData : allSummaryData;

  const monthBreakdown = useMemo(
    () => expenseByCategory(transactions, categories, budgets, viewYear, viewMonth),
    [transactions, categories, budgets, viewYear, viewMonth],
  );
  const allBreakdown = useMemo(() => {
    const expenseTxs = transactions.filter((t) => t.type === "expense");
    return expenseByCategoryAllTime(expenseTxs, categories);
  }, [transactions, categories]);

  useEffect(() => {
    if (scope === "all") setCarouselSummaryScope("all");
  }, [scope]);

  const dayGroups = useMemo(() => groupTransactionsByDay(scopedTxs), [scopedTxs]);

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const expenseLabel =
    carouselSummaryScope === "month" ? "月支出" : "總支出";
  const incomeLabel =
    carouselSummaryScope === "month" ? "月收入" : "總收入";

  async function handleDelete(tx: Transaction) {
    await removeTransaction(tx.id);
    setUndoTx(tx);
    window.setTimeout(() => setUndoTx(null), 8000);
  }

  async function undoDelete() {
    if (!undoTx) return;
    await upsertTransaction({
      id: undoTx.id,
      amount: undoTx.amount,
      type: undoTx.type,
      categoryId: undoTx.categoryId,
      date: undoTx.date,
      note: undoTx.note,
    });
    setUndoTx(null);
  }

  if (formType || editing) {
    return (
      <TransactionFormPage
        initialType={formType ?? "expense"}
        transaction={editing ?? undefined}
        preset={editing ? undefined : formPreset}
        onClose={() => {
          setFormType(null);
          setEditing(null);
          setFormPreset(undefined);
        }}
        onSaved={() => {
          if (formPreset?.fromDeepLink && isInBrowserTab()) {
            setDeepLinkToast(true);
          }
        }}
      />
    );
  }

  const mask = (v: string) => (hideAmounts ? "••••" : v);

  return (
    <div className="page page--home hk-home" data-testid="home-page" data-home-scope={scope}>
      <header className="hk-topbar">
        <button
          type="button"
          className="hk-topbar__icon"
          aria-label="選單"
          data-testid="home-menu-btn"
          onClick={() => setMenuOpen(true)}
        >
          ☰
        </button>
        <button
          type="button"
          className="hk-topbar__period"
          data-testid="home-period-picker"
          onClick={() => setPeriodOpen(true)}
        >
          {periodPickerLabel(scope, viewYear, viewMonth)} ▼
        </button>
        <label className="hk-topbar__icon hk-topbar__cal" aria-label="選擇月份">
          📅
          <input
            type="month"
            className="hk-topbar__month-input"
            value={`${viewYear}-${String(viewMonth).padStart(2, "0")}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split("-").map(Number);
              setViewYear(y);
              setViewMonth(m);
              setScope("month");
            }}
          />
        </label>
      </header>

      <PwaSyncControls
        variant="safari-card"
        deepLinkToast={deepLinkToast}
        onDeepLinkToastDismiss={() => setDeepLinkToast(false)}
      />

      {loading ? (
        <p className="muted center">載入中…</p>
      ) : (
        <>
          <section
            className="hk-summary"
            data-testid="home-summary"
            data-summary-scope={carouselSummaryScope}
          >
            <div className="hk-summary__col hk-summary__col--expense">
              <span className="hk-summary__label" data-testid="home-summary-expense-label">
                {expenseLabel} ▸
              </span>
              <p className="hk-summary__value tabular" data-testid="home-summary-expense">
                {mask(formatCurrency(summaryForDisplay.totalExpense))}
              </p>
            </div>
            <div className="hk-summary__col hk-summary__col--income">
              <span className="hk-summary__label" data-testid="home-summary-income-label">
                {incomeLabel} ▸
              </span>
              <p className="hk-summary__value tabular" data-testid="home-summary-income">
                {mask(formatCurrency(summaryForDisplay.totalIncome))}
              </p>
            </div>
          </section>

          <HomeChartCarousel
            month={{
              expenseByCategory: monthBreakdown,
              totalExpense: monthSummaryData.totalExpense,
              totalIncome: monthSummaryData.totalIncome,
              balance: monthSummaryData.balance,
            }}
            all={{
              expenseByCategory: allBreakdown,
              totalExpense: allSummaryData.totalExpense,
              totalIncome: allSummaryData.totalIncome,
              balance: allTimeBalance,
            }}
            openingBalanceNote={
              openingBalanceValue > 0 ? openingBalanceValue : null
            }
            periodScope={scope}
            hideAmounts={hideAmounts}
            onToggleHide={() => setHideAmounts((v) => !v)}
            onSummaryScopeChange={setCarouselSummaryScope}
          />

          <HomeTransactionGroups
            groups={dayGroups}
            categoryMap={categoryMap}
            hideAmounts={hideAmounts}
            onEdit={setEditing}
            onDelete={(tx) => void handleDelete(tx)}
          />
        </>
      )}

      {createPortal(
        <>
          <button
            type="button"
            className="hk-fab"
            aria-label="新增"
            data-testid="home-fab"
            onClick={() => setFabOpen(true)}
          >
            ＋
          </button>
          {fabOpen && (
            <div className="hk-fab-sheet" role="dialog" data-testid="home-fab-sheet">
              <button
                type="button"
                className="hk-fab-sheet__backdrop"
                aria-label="關閉"
                onClick={() => setFabOpen(false)}
              />
              <div className="hk-fab-sheet__panel">
                <button
                  type="button"
                  className="hk-fab-sheet__action expense"
                  data-testid="quick-expense"
                  onClick={() => {
                    setFormPreset(undefined);
                    setFormType("expense");
                    setFabOpen(false);
                  }}
                >
                  支出
                </button>
                <button
                  type="button"
                  className="hk-fab-sheet__action income"
                  data-testid="quick-income"
                  onClick={() => {
                    setFormPreset(undefined);
                    setFormType("income");
                    setFabOpen(false);
                  }}
                >
                  收入
                </button>
              </div>
            </div>
          )}
        </>,
        document.body,
      )}

      {periodOpen && (
        <div className="hk-period-sheet" role="dialog" data-testid="home-period-sheet">
          <button type="button" className="hk-fab-sheet__backdrop" aria-label="關閉" onClick={() => setPeriodOpen(false)} />
          <div className="hk-fab-sheet__panel">
            <button type="button" data-testid="home-scope-month" onClick={() => { setScope("month"); setPeriodOpen(false); }}>本月</button>
            <button type="button" data-testid="home-scope-year" onClick={() => { setScope("year"); setPeriodOpen(false); }}>今年</button>
            <button type="button" data-testid="home-scope-all" onClick={() => { setScope("all"); setPeriodOpen(false); }}>所有</button>
          </div>
        </div>
      )}

      {undoTx && (
        <div className="toast toast--sync toast--success" role="status" data-testid="home-undo-toast">
          <span>已刪除一筆</span>
          <button type="button" className="btn-text btn-text--primary" data-testid="home-undo" onClick={() => void undoDelete()}>
            復原
          </button>
        </div>
      )}

      <HomeMenuDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpenImport={onOpenImport}
        onOpenInbox={onOpenInbox}
        onNavigate={onNavigateTab}
      />
    </div>
  );
}
