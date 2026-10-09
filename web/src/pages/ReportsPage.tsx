import { useId, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
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
import {
  chartCumulativeLineColor,
  chartExpenseColor,
  chartIncomeColor,
  chartNegativeBarColor,
  chartPositiveBarColor,
  colorForCategory,
} from "../lib/chartColors";
import { formatCurrency, formatMonthYear } from "../lib/format";
import { useLedger } from "../store/LedgerContext";

const CHART_ANIMATION = false;

interface ReportsPageProps {
  period: ReportPeriod;
  onPeriodChange: (period: ReportPeriod) => void;
}

export function ReportsPage({ period, onPeriodChange }: ReportsPageProps) {
  const chartUid = useId().replace(/:/g, "");
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
    const expenseTxs = transactions.filter((t) => t.type === "expense");
    return expenseByCategoryAllTime(expenseTxs, categories);
  }, [transactions, categories, budgets, period, y, m, reportYear]);

  const timeline = useMemo(
    () => monthBalanceTimeline(scopedTransactions),
    [scopedTransactions],
  );

  const incomeGradId = `incomeGrad-${chartUid}`;
  const expenseGradId = `expenseGrad-${chartUid}`;

  const barData = [
    {
      name: "收入",
      value: summary.totalIncome,
      fill: `url(#${incomeGradId})`,
    },
    {
      name: "支出",
      value: summary.totalExpense,
      fill: `url(#${expenseGradId})`,
    },
  ];

  const pieData = breakdown.map((item, i) => ({
    name: item.category.name,
    value: item.spent,
    fill: colorForCategory(item.category.id, i),
  }));

  const categoryBarData = breakdown.map((item, i) => ({
    name: item.category.name,
    spent: item.spent,
    fill: colorForCategory(item.category.id, i),
  }));

  const timelineChartData = timeline.map((row) => ({
    ...row,
    balanceFill:
      row.balance >= 0 ? chartPositiveBarColor() : chartNegativeBarColor(),
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

  const tooltipStyle = {
    borderRadius: 10,
    border: "1px solid var(--separator)",
    background: "var(--bg-elevated)",
    color: "var(--text)",
  };

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
          <div className="chart-legend chart-legend--inline">
            <span><i className="chart-swatch" style={{ background: chartIncomeColor() }} />收入</span>
            <span><i className="chart-swatch" style={{ background: chartExpenseColor() }} />支出</span>
          </div>
          <div className="chart-box" data-testid="report-bar-chart">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData} barCategoryGap="28%">
                <defs>
                  <linearGradient id={incomeGradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4ade80" />
                    <stop offset="100%" stopColor={chartIncomeColor()} />
                  </linearGradient>
                  <linearGradient id={expenseGradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fda4af" />
                    <stop offset="100%" stopColor={chartExpenseColor()} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} />
                <YAxis tickFormatter={(v) => `$${v}`} width={48} tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
                <Bar
                  dataKey="value"
                  radius={[8, 8, 0, 0]}
                  isAnimationActive={CHART_ANIMATION}
                >
                  {barData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
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
          <div className="chart-legend chart-legend--inline">
            <span><i className="chart-swatch" style={{ background: chartPositiveBarColor() }} />正結餘</span>
            <span><i className="chart-swatch" style={{ background: chartNegativeBarColor() }} />負結餘</span>
            <span><i className="chart-swatch chart-swatch--line" style={{ background: chartCumulativeLineColor() }} />累計</span>
          </div>
          <div
            className="chart-box chart-box--tall"
            data-testid="report-balance-chart"
            data-timeline-months={timelineChartData.length}
          >
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={timelineChartData} barCategoryGap="22%">
                <CartesianGrid stroke="var(--separator)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--text-secondary)" }} interval="preserveStartEnd" />
                <YAxis
                  yAxisId="balance"
                  tickFormatter={(v) => `$${v}`}
                  width={44}
                  tick={{ fontSize: 10, fill: "var(--text-secondary)" }}
                />
                <YAxis yAxisId="cumulative" orientation="right" hide />
                <ReferenceLine yAxisId="balance" y={0} stroke="var(--separator)" />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    formatCurrency(v, name === "balance"),
                    name === "balance" ? "本月結餘" : "累計結餘",
                  ]}
                  contentStyle={tooltipStyle}
                />
                <Bar
                  yAxisId="balance"
                  dataKey="balance"
                  name="balance"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={CHART_ANIMATION}
                >
                  {timelineChartData.map((row) => (
                    <Cell key={`${row.year}-${row.month}`} fill={row.balanceFill} />
                  ))}
                </Bar>
                <Line
                  yAxisId="balance"
                  type="monotone"
                  dataKey="cumulativeBalance"
                  name="cumulative"
                  stroke={chartCumulativeLineColor()}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: chartCumulativeLineColor(), strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={CHART_ANIMATION}
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
            <div
              className="chart-box"
              data-testid="report-pie-chart"
              data-category-count={pieData.length}
            >
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={2}
                    isAnimationActive={CHART_ANIMATION}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="chart-legend chart-legend--inline chart-legend--pie">
                {pieData.map((entry) => (
                  <span key={entry.name} className="chart-legend__item">
                    <i className="chart-swatch" style={{ background: entry.fill }} />
                    {entry.name}
                  </span>
                ))}
              </div>
            </div>
            <div
              className="chart-box chart-box--category-bars"
              data-testid="report-category-bar-chart"
              data-category-count={categoryBarData.length}
            >
              <ResponsiveContainer width="100%" height={Math.max(160, categoryBarData.length * 40)}>
                <BarChart
                  data={categoryBarData}
                  layout="vertical"
                  margin={{ left: 8, right: 16 }}
                  barCategoryGap="18%"
                >
                  <XAxis type="number" tickFormatter={(v) => `$${v}`} tick={{ fontSize: 10, fill: "var(--text-secondary)" }} />
                  <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 11, fill: "var(--text)" }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
                  <Bar
                    dataKey="spent"
                    radius={[0, 6, 6, 0]}
                    barSize={20}
                    isAnimationActive={CHART_ANIMATION}
                  >
                    {categoryBarData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="list-card list-card--elevated">
              {breakdown.map((item, i) => {
                const swatch = colorForCategory(item.category.id, i);
                return (
                  <div key={item.category.id} className="report-row report-row--category">
                    <span className="chart-swatch chart-swatch--row" style={{ background: swatch }} />
                    <CategoryIcon name={item.category.iconName} size="sm" />
                    <span>{item.category.name}</span>
                    <span className="muted tabular">{formatCurrency(item.spent)}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
