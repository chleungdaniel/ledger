import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CategoryIcon } from "../components/CategoryIcon";
import {
  expenseByCategory,
  expenseByCategoryAllTime,
  monthBalanceTimeline,
  monthSummary,
  type ReportPeriod,
  summaryFromTransactions,
  transactionsInYear,
} from "../lib/analytics";
import { formatCurrency, formatMonthYear } from "../lib/format";
import { useLedger } from "../store/LedgerContext";

const PIE_COLORS = [
  "#6b7280",
  "#9ca3af",
  "#4b5563",
  "#d1d5db",
  "#374151",
  "#a8a29e",
];

interface ReportsPageProps {
  period: ReportPeriod;
  onPeriodChange: (period: ReportPeriod) => void;
}

export function ReportsPage({ period, onPeriodChange }: ReportsPageProps) {
  const { categories, transactions, budgets } = useLedger();
  const [monthDate, setMonthDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [reportYear, setReportYear] = useState(() => new Date().getFullYear());

  const [y, m] = monthDate.split("-").map(Number);

  const scopedTransactions = useMemo(() => {
    if (period === "month") {
      return transactions.filter((t) => {
        const d = new Date(t.date);
        return d.getFullYear() === y && d.getMonth() + 1 === m;
      });
    }
    if (period === "year") {
      return transactionsInYear(transactions, reportYear);
    }
    return transactions;
  }, [transactions, period, y, m, reportYear]);

  const summary = useMemo(() => {
    if (period === "month") return monthSummary(transactions, y, m);
    return summaryFromTransactions(scopedTransactions);
  }, [transactions, scopedTransactions, period, y, m]);

  const breakdown = useMemo(() => {
    if (period === "month") {
      return expenseByCategory(transactions, categories, budgets, y, m);
    }
    if (period === "year") {
      const expenseTxs = transactionsInYear(transactions, reportYear, "expense");
      return expenseByCategoryAllTime(expenseTxs, categories);
    }
    return expenseByCategoryAllTime(transactions, categories);
  }, [transactions, categories, budgets, period, y, m, reportYear]);

  const timeline = useMemo(
    () => monthBalanceTimeline(scopedTransactions),
    [scopedTransactions],
  );

  const barData = [
    { name: "收入", value: summary.totalIncome },
    { name: "支出", value: summary.totalExpense },
  ];

  const pieData = breakdown.map((item) => ({
    name: item.category.name,
    value: item.spent,
  }));

  const latestCumulative =
    timeline.length > 0 ? timeline[timeline.length - 1].cumulativeBalance : 0;

  const periodTitle =
    period === "month"
      ? "本月概覽"
      : period === "year"
        ? `${reportYear} 年概覽`
        : "所有時間概覽";

  const balanceLabel =
    period === "month" ? "本月結餘" : period === "year" ? "本年結餘" : "總結餘";

  const emptyExpenseHint =
    period === "all"
      ? "尚無支出記錄"
      : period === "year"
        ? `${reportYear} 年無支出`
        : "本月無支出";

  return (
    <div className="page" data-testid="reports-page" data-report-period={period}>
      <header className="page-header">
        <h1>報表</h1>
        <p className="subtitle">趨勢與分類一覽</p>
      </header>

      <div className="pad-horizontal">
        <span className="field-label">期間</span>
        <div className="segmented segmented--pill segmented--triple report-period">
          <button
            type="button"
            className={period === "month" ? "active" : ""}
            data-testid="report-period-month"
            onClick={() => onPeriodChange("month")}
          >
            每月
          </button>
          <button
            type="button"
            className={period === "year" ? "active" : ""}
            data-testid="report-period-year"
            onClick={() => onPeriodChange("year")}
          >
            今年
          </button>
          <button
            type="button"
            className={period === "all" ? "active" : ""}
            data-testid="report-period-all"
            onClick={() => onPeriodChange("all")}
          >
            所有
          </button>
        </div>
      </div>

      {period === "month" && (
        <label className="field pad-horizontal">
          <span>報表月份</span>
          <input
            type="month"
            value={monthDate}
            onChange={(e) => setMonthDate(e.target.value)}
            data-testid="report-month"
          />
        </label>
      )}

      {period === "year" && (
        <label className="field pad-horizontal">
          <span>報表年份</span>
          <input
            type="number"
            min={2000}
            max={2100}
            value={reportYear}
            onChange={(e) => setReportYear(Number(e.target.value))}
            data-testid="report-year"
          />
        </label>
      )}

      <section className="section">
        <h2>{periodTitle}</h2>
        <div className="card card--soft">
          <div className="summary-lines">
            <div>
              <span>收入</span>
              <strong className="income" data-testid="report-summary-income">
                {formatCurrency(summary.totalIncome)}
              </strong>
            </div>
            <div>
              <span>支出</span>
              <strong data-testid="report-summary-expense">
                {formatCurrency(summary.totalExpense)}
              </strong>
            </div>
            <div>
              <span>{balanceLabel}</span>
              <strong
                className={summary.balance >= 0 ? "income" : "over"}
                data-testid="report-summary-balance"
              >
                {formatCurrency(summary.balance, true)}
              </strong>
            </div>
          </div>
          <div className="chart-box" data-testid="report-bar-chart">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `$${v}`} width={48} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  <Cell fill="var(--accent-green)" />
                  <Cell fill="var(--accent-orange)" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>{period === "all" ? "每月結餘與累計" : "期間結餘趨勢"}</h2>
        <div className="card card--soft">
          <p className="report-cumulative-hint">
            {period === "all" ? "累計總結餘" : "期末累計"}
            <strong
              className={latestCumulative >= 0 ? "income" : "over"}
              data-testid="report-cumulative-balance"
            >
              {formatCurrency(latestCumulative, true)}
            </strong>
          </p>
          <div className="chart-box chart-box--tall" data-testid="report-balance-chart">
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={timeline}>
                <CartesianGrid stroke="var(--separator)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tickFormatter={(v) => `$${v}`} width={44} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    formatCurrency(v, name === "balance"),
                    name === "balance" ? "本月結餘" : "累計結餘",
                  ]}
                />
                <Bar dataKey="balance" name="balance" radius={[4, 4, 0, 0]} fill="var(--chart-neutral)" />
                <Line
                  type="monotone"
                  dataKey="cumulativeBalance"
                  name="cumulative"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="list-card list-card--inset" data-testid="report-balance-list">
            {[...timeline].reverse().slice(0, 6).map((row) => (
              <div key={`${row.year}-${row.month}`} className="report-row">
                <span>{formatMonthYear(row.year, row.month)}</span>
                <span className={row.balance >= 0 ? "income" : "over"}>
                  {formatCurrency(row.balance, true)}
                </span>
                <span className="muted tabular">
                  累計 {formatCurrency(row.cumulativeBalance, true)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <h2>支出分類</h2>
        {breakdown.length === 0 ? (
          <div className="empty-state">
            <p>{emptyExpenseHint}</p>
            <p className="muted">有支出後會顯示分類比例圖。</p>
          </div>
        ) : (
          <>
            <div className="chart-box" data-testid="report-pie-chart">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="list-card list-card--elevated">
              {breakdown.map((item) => (
                <div key={item.category.id} className="report-row">
                  <CategoryIcon name={item.category.iconName} size="sm" />
                  <span>{item.category.name}</span>
                  <span className="muted tabular">{formatCurrency(item.spent)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
