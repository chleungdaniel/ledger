import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { colorForCategory } from "../../lib/chartColors";
import type { Category } from "../../types";
import { formatCarouselCurrency } from "../../lib/carouselBalanceFormat";
import { formatCurrency } from "../../lib/format";
import {
  CAROUSEL_CHART_HEIGHT,
  CAROUSEL_PIE_INNER_RADIUS,
  CAROUSEL_PIE_OUTER_RADIUS,
} from "../../lib/carouselDonutGeometry";
import { CarouselDonutCenter } from "./CarouselDonutCenter";
import type { HomeScope } from "../../lib/homeScope";

export type CarouselSummaryScope = "month" | "all";

export interface CarouselBalanceData {
  expenseByCategory: { category: Category; spent: number }[];
  totalExpense: number;
  totalIncome: number;
  balance: number;
}

interface HomeChartCarouselProps {
  month: CarouselBalanceData;
  all: CarouselBalanceData;
  /** When set, shown under 所有結餘 as 「含期初結餘 HK$x」 */
  openingBalanceNote: number | null;
  periodScope: HomeScope;
  hideAmounts: boolean;
  onToggleHide: () => void;
  onSummaryScopeChange: (scope: CarouselSummaryScope) => void;
}

function pieDataFromBreakdown(
  expenseByCategory: { category: Category; spent: number }[],
) {
  if (expenseByCategory.length === 0) {
    return [{ name: "無支出", value: 1, fill: "#e5e7eb", categoryId: "" }];
  }
  return expenseByCategory.map((row, i) => ({
    name: row.category.name,
    value: row.spent,
    fill: colorForCategory(row.category.id, i),
    categoryId: row.category.id,
  }));
}

function legendRows(
  expenseByCategory: { category: Category; spent: number }[],
  totalExpense: number,
) {
  const total = totalExpense > 0 ? totalExpense : 1;
  return expenseByCategory.map((row, i) => ({
    ...row,
    fill: colorForCategory(row.category.id, i),
    pct: Math.round((row.spent / total) * 100),
  }));
}

function DonutSlide({
  data,
  balanceLabel,
  balance,
  openingBalanceNote,
  hideAmounts,
  onToggleHide,
  slideId,
  slideRef,
}: {
  data: CarouselBalanceData;
  balanceLabel: string;
  balance: number;
  openingBalanceNote?: number | null;
  hideAmounts: boolean;
  onToggleHide: () => void;
  slideId: "month" | "all";
  slideRef: (el: HTMLDivElement | null) => void;
}) {
  const pieData = useMemo(
    () => pieDataFromBreakdown(data.expenseByCategory),
    [data.expenseByCategory],
  );
  const showOpeningNote =
    slideId === "all" && openingBalanceNote != null && openingBalanceNote > 0;

  return (
    <div
      ref={slideRef}
      className="hk-chart__slide"
      data-testid={`home-chart-slide-${slideId}`}
      data-slide={slideId}
    >
      <div className="hk-chart__donut-wrap">
        <ResponsiveContainer width="100%" height={CAROUSEL_CHART_HEIGHT}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              innerRadius={CAROUSEL_PIE_INNER_RADIUS}
              outerRadius={CAROUSEL_PIE_OUTER_RADIUS}
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
        <CarouselDonutCenter
          balanceLabel={balanceLabel}
          balanceAmount={balance}
          hideAmounts={hideAmounts}
          onToggleHide={onToggleHide}
          eyeTestId={slideId === "month" ? "home-eye-toggle" : "home-eye-toggle-all"}
          balanceTestId={slideId === "month" ? "home-balance-value" : "home-balance-value-all"}
        />
        {showOpeningNote && (
          <p
            className="hk-chart__opening-footnote muted"
            data-testid="home-opening-balance-note"
          >
            {hideAmounts
              ? "含期初結餘 ••••"
              : `含期初結餘 ${formatCarouselCurrency(openingBalanceNote)}`}
          </p>
        )}
      </div>
    </div>
  );
}

export function HomeChartCarousel({
  month,
  all,
  openingBalanceNote,
  periodScope,
  hideAmounts,
  onToggleHide,
  onSummaryScopeChange,
}: HomeChartCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(() => (periodScope === "all" ? 1 : 0));
  const [legendScope, setLegendScope] = useState<CarouselSummaryScope>("month");
  const summaryScopeRef = useRef<CarouselSummaryScope>("month");

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const scroller = scrollerRef.current;
    const slide = slideRefs.current[index];
    if (!scroller || !slide) return;
    scroller.scrollTo({ left: slide.offsetLeft, behavior });
  }, []);

  useEffect(() => {
    if (periodScope !== "all") return;
    scrollToIndex(1, "auto");
  }, [periodScope, scrollToIndex]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const slides = slideRefs.current.filter(Boolean) as HTMLDivElement[];
    if (slides.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let best: { index: number; ratio: number } | null = null;
        for (const entry of entries) {
          const idx = slides.indexOf(entry.target as HTMLDivElement);
          if (idx < 0) continue;
          const ratio = entry.intersectionRatio;
          if (!best || ratio > best.ratio) best = { index: idx, ratio };
        }
        if (!best || best.ratio < 0.45) return;
        setActiveIndex(best.index);
        if (best.index === 2) {
          setLegendScope(summaryScopeRef.current);
          return;
        }
        if (best.index === 0) {
          summaryScopeRef.current = "month";
          setLegendScope("month");
          onSummaryScopeChange("month");
        } else if (best.index === 1) {
          summaryScopeRef.current = "all";
          setLegendScope("all");
          onSummaryScopeChange("all");
        }
      },
      { root: scroller, threshold: [0.45, 0.6, 0.75, 0.9] },
    );

    for (const slide of slides) observer.observe(slide);
    return () => observer.disconnect();
  }, [onSummaryScopeChange]);

  const legendData = legendScope === "month" ? month : all;
  const legendItems = useMemo(
    () => legendRows(legendData.expenseByCategory, legendData.totalExpense),
    [legendData],
  );

  const activeBalanceScope: CarouselSummaryScope =
    activeIndex === 1 ? "all" : summaryScopeRef.current;

  return (
    <section
      className="hk-chart"
      data-testid="home-chart-carousel"
      data-carousel-index={activeIndex}
      data-balance-scope={activeBalanceScope}
      data-carousel-balance-label={activeIndex === 1 ? "所有結餘" : "月結餘"}
    >
      <div
        className="hk-chart__snap"
        ref={scrollerRef}
        data-testid="home-chart-scroller"
      >
        <DonutSlide
          slideId="month"
          slideRef={(el) => {
            slideRefs.current[0] = el;
          }}
          data={month}
          balanceLabel="月結餘"
          balance={month.balance}
          hideAmounts={hideAmounts}
          onToggleHide={onToggleHide}
        />
        <DonutSlide
          slideId="all"
          slideRef={(el) => {
            slideRefs.current[1] = el;
          }}
          data={all}
          balanceLabel="所有結餘"
          balance={all.balance}
          openingBalanceNote={openingBalanceNote}
          hideAmounts={hideAmounts}
          onToggleHide={onToggleHide}
        />
        <div
          className="hk-chart__slide hk-chart__slide--legend"
          ref={(el) => {
            slideRefs.current[2] = el;
          }}
          data-testid="home-chart-slide-legend"
          data-slide="legend"
        >
          <ul className="hk-chart__legend" data-testid="home-category-legend">
            {legendItems.length === 0 ? (
              <li className="muted">
                {legendScope === "month" ? "本月尚無支出分類" : "尚無支出分類"}
              </li>
            ) : (
              legendItems.map((row) => (
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
          <p className="hk-chart__legend-scope muted">
            {legendScope === "month" ? "本月分類佔比" : "所有分類佔比"}
          </p>
        </div>
      </div>

      <div className="hk-chart__dots" role="tablist" aria-label="結餘檢視">
        {[0, 1, 2].map((i) => (
          <button
            key={i}
            type="button"
            role="tab"
            className={activeIndex === i ? "active" : ""}
            aria-selected={activeIndex === i}
            aria-label={i === 0 ? "月結餘" : i === 1 ? "所有結餘" : "分類列表"}
            data-testid={`home-chart-dot-${i}`}
            onClick={() => scrollToIndex(i)}
          />
        ))}
      </div>
    </section>
  );
}
