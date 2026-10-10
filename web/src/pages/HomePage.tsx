import { useEffect, useMemo, useState } from "react";
import type { DeepLinkPayload } from "../lib/deeplink";
import { suggestCategoryId } from "../lib/import/suggestCategory";
import { BudgetProgress } from "../components/BudgetProgress";
import { TransactionRow } from "../components/TransactionRow";
import {
  allTimeSummary,
  monthSummary,
  totalBudgetForMonth,
} from "../lib/analytics";
import { formatDeepLinkDebug, localNowIso } from "../lib/datetime";
import {
  formatCurrency,
  formatMonthYear,
  yearMonthFromDate,
} from "../lib/format";
import { PwaSyncControls } from "../components/PwaSyncControls";
import { isInBrowserTab, isStandalonePwa } from "../lib/runtimeContext";
import { useLedger } from "../store/LedgerContext";
import type { Transaction } from "../types";
import { TransactionFormPage, type TransactionFormPreset } from "./TransactionFormPage";

function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

interface HomePageProps {
  onOpenImport: () => void;
  deepLink: DeepLinkPayload | null;
  onDeepLinkConsumed: () => void;
}

export function HomePage({ onOpenImport, deepLink, onDeepLinkConsumed }: HomePageProps) {
  const { loading, categories, transactions, budgets } = useLedger();
  const now = new Date();
  const current = yearMonthFromDate(now);
  const [viewYear, setViewYear] = useState(current.year);
  const [viewMonth, setViewMonth] = useState(current.month);

  const [formType, setFormType] = useState<"expense" | "income" | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [formPreset, setFormPreset] = useState<TransactionFormPreset | undefined>();
  const [deepLinkToast, setDeepLinkToast] = useState(false);

  useEffect(() => {
    if (!deepLink?.openAdd || loading) return;
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
      autoSave: deepLink.auto && deepLink.amount != null && deepLink.amount > 0,
      fromDeepLink: true,
      amountMissingBanner: deepLink.amountMissing,
      debugRawParams: formatDeepLinkDebug(
        window.location.href,
        window.location.search,
      ),
    });
    onDeepLinkConsumed();
  }, [deepLink, loading, onDeepLinkConsumed, categories, transactions]);

  const summary = useMemo(
    () => monthSummary(transactions, viewYear, viewMonth),
    [transactions, viewYear, viewMonth],
  );
  const allTime = useMemo(() => allTimeSummary(transactions), [transactions]);
  const totalBudget = useMemo(
    () => totalBudgetForMonth(budgets, viewYear, viewMonth),
    [budgets, viewYear, viewMonth],
  );
  const recent = useMemo(() => transactions.slice(0, 20), [transactions]);

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

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

  return (
    <div className="page page--home" data-testid="home-page">
      <header className="page-header page-header--home">
        <div>
          <h1>記帳</h1>
          <p className="subtitle">本機私密 · 離線可用</p>
        </div>
        <div className="month-nav" data-testid="home-month-nav">
          <button
            type="button"
            className="month-nav__btn"
            aria-label="上個月"
            onClick={() => {
              const n = shiftMonth(viewYear, viewMonth, -1);
              setViewYear(n.year);
              setViewMonth(n.month);
            }}
          >
            ‹
          </button>
          <span className="month-nav__label" data-testid="home-month-label">
            {formatMonthYear(viewYear, viewMonth)}
          </span>
          <button
            type="button"
            className="month-nav__btn"
            aria-label="下個月"
            onClick={() => {
              const n = shiftMonth(viewYear, viewMonth, 1);
              setViewYear(n.year);
              setViewMonth(n.month);
            }}
          >
            ›
          </button>
        </div>
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
          <section className="hero-card">
            <div className="hero-card__glow" aria-hidden />
            <p className="hero-card__eyebrow">每月結餘</p>
            <p
              className={`hero-card__balance ${summary.balance >= 0 ? "positive" : "negative"}`}
              data-testid="home-monthly-balance"
            >
              {formatCurrency(summary.balance, true)}
            </p>
            <div className="hero-card__split">
              <div>
                <span className="hero-card__mini-label">收入</span>
                <span className="hero-card__mini-value income">
                  {formatCurrency(summary.totalIncome)}
                </span>
              </div>
              <div>
                <span className="hero-card__mini-label">支出</span>
                <span className="hero-card__mini-value expense">
                  {formatCurrency(summary.totalExpense)}
                </span>
              </div>
            </div>
            <div className="hero-card__alltime">
              <span>累計總結餘</span>
              <strong
                className={allTime.balance >= 0 ? "income" : "over"}
                data-testid="home-alltime-balance"
              >
                {formatCurrency(allTime.balance, true)}
              </strong>
            </div>
          </section>

          {totalBudget != null ? (
            <section className="section section--tight">
              <div className="card card--soft">
                <BudgetProgress
                  title="本月預算"
                  spent={summary.totalExpense}
                  budget={totalBudget}
                />
              </div>
            </section>
          ) : (
            <p className="hint pad-horizontal">尚未設定本月總預算，可至「預算」分頁新增。</p>
          )}

          <section className="section">
            <h2>快速記帳</h2>
            {isStandalonePwa() && (
              <PwaSyncControls variant="import" />
            )}
            <div className="quick-actions quick-actions--triple">
              <button
                type="button"
                className="btn-quick expense"
                data-testid="quick-expense"
                onClick={() => {
                  setFormPreset(undefined);
                  setFormType("expense");
                }}
              >
                <span className="btn-quick__icon">−</span>
                支出
              </button>
              <button
                type="button"
                className="btn-quick income"
                data-testid="quick-income"
                onClick={() => {
                  setFormPreset(undefined);
                  setFormType("income");
                }}
              >
                <span className="btn-quick__icon">+</span>
                收入
              </button>
              <button
                type="button"
                className="btn-quick import"
                data-testid="quick-import"
                onClick={onOpenImport}
              >
                <span className="btn-quick__icon">⎘</span>
                匯入截圖
              </button>
            </div>
          </section>

          <section className="section">
            <h2>最近交易</h2>
            {recent.length === 0 ? (
              <div className="empty-state">
                <p>尚無交易</p>
                <p className="muted">點擊上方按鈕記錄第一筆收入或支出。</p>
              </div>
            ) : (
              <div className="list-card list-card--elevated">
                {recent.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    transaction={tx}
                    category={categoryMap.get(tx.categoryId)}
                    onClick={() => setEditing(tx)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
