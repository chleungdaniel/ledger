import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CategoryIcon } from "../components/CategoryIcon";
import { expenseByCategory, monthSummary } from "../lib/analytics";
import { formatCurrency, formatMonthYear } from "../lib/format";
import { useLedger } from "../store/LedgerContext";

const PIE_COLORS = ["#3478f6", "#34c759", "#ff9500", "#ff3b30", "#af52de", "#5ac8fa"];

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

  const barData = [
    { name: "收入", value: summary.totalIncome },
    { name: "支出", value: summary.totalExpense },
  ];

  const pieData = breakdown.map((item) => ({
    name: item.category.name,
    value: item.spent,
  }));

  return (
    <div className="page" data-testid="reports-page">
      <header className="page-header">
        <h1>報表</h1>
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
        <div className="card">
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
              <span>結餘</span>
              <strong className={summary.balance >= 0 ? "income" : "over"}>
                {formatCurrency(summary.balance, true)}
              </strong>
            </div>
          </div>
          <div className="chart-box" data-testid="report-bar-chart">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData}>
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(v) => `$${v}`} width={48} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  <Cell fill="#34c759" />
                  <Cell fill="#ff9500" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
            <div className="list-card">
              {breakdown.map((item) => (
                <div key={item.category.id} className="report-row">
                  <CategoryIcon name={item.category.iconName} />
                  <span>{item.category.name}</span>
                  <span className="muted">{formatCurrency(item.spent)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
      <p className="hint pad-horizontal">{formatMonthYear(y, m)} 報表</p>
    </div>
  );
}
