/** Vivid chart palette — reports only; app chrome stays silver/graphite. */
export const CATEGORY_CHART_PALETTE = [
  "#f97066", // coral
  "#fbbf24", // amber
  "#38bdf8", // sky blue
  "#c084fc", // violet pink
  "#34d399", // emerald
  "#fb923c", // orange
  "#22d3ee", // cyan
  "#fb7185", // rose
];

const categoryColorMap = new Map<string, string>();

export function colorForCategory(categoryId: string, fallbackIndex = 0): string {
  const cached = categoryColorMap.get(categoryId);
  if (cached) return cached;
  let hash = fallbackIndex;
  for (let i = 0; i < categoryId.length; i++) {
    hash = (hash + categoryId.charCodeAt(i) * (i + 1)) % 997;
  }
  const color = CATEGORY_CHART_PALETTE[hash % CATEGORY_CHART_PALETTE.length];
  categoryColorMap.set(categoryId, color);
  return color;
}

export function chartIncomeColor(): string {
  return "#22c55e";
}

export function chartExpenseColor(): string {
  return "#f97066";
}

export function chartCumulativeLineColor(): string {
  return "#3b82f6";
}

export function chartPositiveBarColor(): string {
  return "#10b981";
}

export function chartNegativeBarColor(): string {
  return "#f43f5e";
}
