import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { colorForCategory } from "../../lib/chartColors";
import type { Category } from "../../types";
import { formatCurrency } from "../../lib/format";

interface HomeChartCarouselProps {
  expenseByCategory: { category: Category; spent: number }[];
  totalIncome: number;
  totalExpense: number;
  balance: number;
  balanceLabel: string;
  hideAmounts: boolean;
  onToggleHide: () => void;
}

export function HomeChartCarousel({
  expenseByCategory,
  totalExpense,
  balance,
  balanceLabel,
  hideAmounts,
  onToggleHide,
}: HomeChartCarouselProps) {
  const [page, setPage] = useState(0);

  const pieData = useMemo(() => {
    if (expenseByCategory.length === 0) {
      return [{ name: "無支出", value: 1, fill: "#e5e7eb", categoryId: "" }];
    }
    return expenseByCategory.map((row, i) => ({
      name: row.category.name,
      value: row.spent,
      fill: colorForCategory(row.category.id, i),
      categoryId: row.category.id,
    }));
  }, [expenseByCategory]);

  const displayBalance = hideAmounts ? "••••" : formatCurrency(balance, true);

  const legendRows = useMemo(() => {
    const total = totalExpense > 0 ? totalExpense : 1;
    return expenseByCategory.map((row, i) => ({
      ...row,
      fill: colorForCategory(row.category.id, i),
      pct: Math.round((row.spent / total) * 100),
    }));
  }, [expenseByCategory, totalExpense]);

  return (
    <section className="hk-chart" data-testid="home-chart-carousel" data-chart-page={page}>
      <div className={`hk-chart__donut-wrap${page === 1 ? " hk-chart__donut-wrap--legend" : ""}`}>
        <ResponsiveContainer width="100%" height={page === 0 ? 220 : 168}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              innerRadius={page === 0 ? 62 : 48}
              outerRadius={page === 0 ? 88 : 72}
              stroke="#111"
              strokeWidth={3}
              isAnimationActive={false}
            >
              {pieData.map((entry) => (
                <Cell key={entry.categoryId || entry.name} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {page === 0 && (
          <div className="hk-chart__center">
            <span className="hk-chart__coin" aria-hidden>🪙</span>
            <button
              type="button"
              className="hk-chart__balance-label"
              data-testid="home-eye-toggle"
              onClick={onToggleHide}
            >
              {balanceLabel} 👁
            </button>
            <p className="hk-chart__balance-value tabular" data-testid="home-balance-value">
              {displayBalance}
            </p>
          </div>
        )}
      </div>

      {page === 1 && (
        <ul className="hk-chart__legend" data-testid="home-category-legend">
          {legendRows.length === 0 ? (
            <li className="muted">本月尚無支出分類</li>
          ) : (
            legendRows.map((row) => (
              <li key={row.category.id}>
                <span className="hk-chart__legend-swatch" style={{ background: row.fill }} />
                <span className="hk-chart__legend-name">{row.category.name}</span>
                <span className="hk-chart__legend-amt tabular">
                  {hideAmounts ? "•••" : formatCurrency(row.spent)}
                </span>
                <span className="hk-chart__legend-pct muted">{row.pct}%</span>
              </li>
            ))
          )}
        </ul>
      )}

      <div className="hk-chart__dots">
        <button
          type="button"
          className={page === 0 ? "active" : ""}
          aria-label="分類圓餅"
          onClick={() => setPage(0)}
        />
        <button
          type="button"
          className={page === 1 ? "active" : ""}
          aria-label="分類列表"
          onClick={() => setPage(1)}
        />
      </div>
    </section>
  );
}
