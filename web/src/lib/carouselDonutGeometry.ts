/** Recharts Pie coordinate space (must match HomeChartCarousel). */
export const CAROUSEL_CHART_HEIGHT = 220;
export const CAROUSEL_PIE_INNER_RADIUS = 72;
export const CAROUSEL_PIE_OUTER_RADIUS = 88;

/** Max text width as a fraction of the horizontal chord at this Y offset. */
export const CAROUSEL_CENTER_TEXT_WIDTH_FACTOR = 0.75;

/** Estimated vertical offset from donut center to each stack row (px, screen space). */
export const CAROUSEL_OFFSET_LABEL_Y = -8;
export const CAROUSEL_OFFSET_AMOUNT_Y = 6;

export interface DonutScreenGeometry {
  centerX: number;
  centerY: number;
  innerRadiusPx: number;
  scale: number;
}

/** Horizontal chord width inside the inner circle at |offsetY| from center. */
export function innerChordWidthPx(
  innerRadiusPx: number,
  offsetYFromCenterPx: number,
): number {
  const y = Math.abs(offsetYFromCenterPx);
  if (innerRadiusPx <= 0 || y >= innerRadiusPx) return 0;
  return 2 * Math.sqrt(innerRadiusPx * innerRadiusPx - y * y);
}

export function maxCenterTextWidthPx(
  innerRadiusPx: number,
  offsetYFromCenterPx: number,
  factor = CAROUSEL_CENTER_TEXT_WIDTH_FACTOR,
): number {
  return innerChordWidthPx(innerRadiusPx, offsetYFromCenterPx) * factor;
}

export function measureDonutScreenGeometry(
  donutWrap: HTMLElement,
): DonutScreenGeometry | null {
  const surface = donutWrap.querySelector(".recharts-surface") as SVGSVGElement | null;
  if (!surface) return null;

  const surfaceRect = surface.getBoundingClientRect();
  if (surfaceRect.width <= 0 || surfaceRect.height <= 0) return null;

  const attrW = parseFloat(surface.getAttribute("width") || "");
  const attrH = parseFloat(surface.getAttribute("height") || "");
  const logicalW = attrW > 0 ? attrW : surfaceRect.width;
  const logicalH = attrH > 0 ? attrH : surfaceRect.height;

  const scaleX = surfaceRect.width / logicalW;
  const scaleY = surfaceRect.height / logicalH;
  const scale = Math.min(scaleX, scaleY);

  return {
    centerX: surfaceRect.left + surfaceRect.width / 2,
    centerY: surfaceRect.top + surfaceRect.height / 2,
    innerRadiusPx: CAROUSEL_PIE_INNER_RADIUS * scale,
    scale,
  };
}

export function rectCornersInsideCircle(
  rect: DOMRect,
  centerX: number,
  centerY: number,
  radiusPx: number,
  insetPx = 2,
): boolean {
  const r = Math.max(0, radiusPx - insetPx);
  const r2 = r * r;
  const points: [number, number][] = [
    [rect.left, rect.top],
    [rect.right, rect.top],
    [rect.right, rect.bottom],
    [rect.left, rect.bottom],
    [rect.left + rect.width / 2, rect.top + rect.height / 2],
  ];
  for (const [x, y] of points) {
    const dx = x - centerX;
    const dy = y - centerY;
    if (dx * dx + dy * dy > r2) return false;
  }
  return true;
}
