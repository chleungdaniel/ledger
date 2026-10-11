import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import {
  chartExpenseColor,
  chartIncomeColor,
  colorForCategory,
} from "../../lib/chartColors";
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
  totalIncome,
  totalExpense,
  balance,
  balanceLabel,
  hideAmounts,
  onToggleHide,
}: HomeChartCarouselProps) {
  const [page, setPage] = useState(0);

  const pieData = useMemo(() => {
    if (expenseByCategory.length === 0) {
      return [{ name: "無支出", value: 1, fill: "#e5e7eb" }];
    }
    return expenseByCategory.map((row, i) => ({
      name: row.category.name,
      value: row.spent,
      fill: colorForCategory(row.category.id, i),
    }));
  }, [expenseByCategory]);

  const compareData = useMemo(
    () => [
      { name: "支出", value: totalExpense || 0.01, fill: chartExpenseColor() },
      { name: "收入", value: totalIncome || 0.01, fill: chartIncomeColor() },
    ],
    [totalExpense, totalIncome],
  );

  const displayBalance = hideAmounts ? "••••" : formatCurrency(balance, true);

  return (
    <section className="hk-chart" data-testid="home-chart-carousel">
      <div className="hk-chart__donut-wrap">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={page === 0 ? pieData : compareData}
              dataKey="value"
              nameKey="name"
              innerRadius={62}
              outerRadius={88}
              stroke="#111"
              strokeWidth={3}
              isAnimationActive={false}
            >
              {(page === 0 ? pieData : compareData).map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
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
      </div>
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
          aria-label="收支比較"
          onClick={() => setPage(1)}
        />
      </div>
    </section>
  );
}
