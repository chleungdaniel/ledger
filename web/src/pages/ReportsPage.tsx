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
  monthBalanceTimeline,
  monthSummary,
} from "../lib/analytics";
import { formatCurrency, formatMonthYear } from "../lib/format";
import { useLedger } from "../store/LedgerContext";

const PIE_COLORS = ["#5e5ce6", "#34c759", "#ff9f0a", "#ff453a", "#bf5af2", "#64d2ff"];

export function ReportsPage() {
  const { categories, transactions, budgets } = useLedger();
  const [monthDate, setMonthDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [y, m] = monthDate.split("-").map(Number);
  const summary = useMemo(
    () => monthSummary(transactions, y, m),
    [transactions, y, m],
  );
  const breakdown = useMemo(
    () => expenseByCategory(transactions, categories, budgets, y, m),
    [transactions, categories, budgets, y, m],
  );
  const timeline = useMemo(
    () => monthBalanceTimeline(transactions),
    [transactions],
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

  return (
    <div className="page" data-testid="reports-page">
      <header className="page-header">
        <h1>報表</h1>
        <p className="subtitle">趨勢與分類一覽</p>
      </header>

      <label className="field pad-horizontal">
        <span>報表月份</span>
        <input
          type="month"
          value={monthDate}
          onChange={(e) => setMonthDate(e.target.value)}
          data-testid="report-month"
        />
      </label>

      <section className="section">
        <h2>本月概覽</h2>
        <div className="card card--soft">
          <div className="summary-lines">
            <div>
              <span>收入</span>
              <strong className="income">{formatCurrency(summary.totalIncome)}</strong>
            </div>
            <div>
              <span>支出</span>
              <strong>{formatCurrency(summary.totalExpense)}</strong>
            </div>
            <div>
              <span>本月結餘</span>
              <strong
                className={summary.balance >= 0 ? "income" : "over"}
                data-testid="report-month-balance"
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
        <h2>每月結餘與累計</h2>
        <div className="card card--soft">
          <p className="report-cumulative-hint">
            累計總結餘
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
                <Bar dataKey="balance" name="balance" radius={[4, 4, 0, 0]} fill="var(--accent)" />
                <Line
                  type="monotone"
                  dataKey="cumulativeBalance"
                  name="cumulative"
                  stroke="var(--accent-green)"
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
            <p>本月無支出</p>
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
