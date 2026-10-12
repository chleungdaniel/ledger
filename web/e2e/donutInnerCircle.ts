import { expect, type Page } from "@playwright/test";

export async function assertInsideDonutInnerCircle(page: Page, testId: string) {
  const result = await page.getByTestId(testId).evaluate((el, id) => {
    const wrap = el.closest(".hk-chart__donut-wrap") as HTMLElement | null;
    if (!wrap) return { ok: false, reason: "no donut wrap" };
    const surface = wrap.querySelector(".recharts-surface") as SVGSVGElement | null;
    if (!surface) return { ok: false, reason: "no chart surface" };
    const INNER_R = 72;
    const surfaceRect = surface.getBoundingClientRect();
    const attrW = parseFloat(surface.getAttribute("width") || "");
    const attrH = parseFloat(surface.getAttribute("height") || "");
    const logicalW = attrW > 0 ? attrW : surfaceRect.width;
    const logicalH = attrH > 0 ? attrH : surfaceRect.height;
    const scale = Math.min(
      surfaceRect.width / logicalW,
      surfaceRect.height / logicalH,
    );
    const innerRadiusPx = INNER_R * scale;
    const cx = surfaceRect.left + surfaceRect.width / 2;
    const cy = surfaceRect.top + surfaceRect.height / 2;
    const inset = 2;
    const r = Math.max(0, innerRadiusPx - inset);
    const r2 = r * r;
    const target = document.querySelector(`[data-testid="${id}"]`);
    if (!target) return { ok: false, reason: "no target" };
    const rect = target.getBoundingClientRect();
    const points: [number, number][] = [
      [rect.left, rect.top],
      [rect.right, rect.top],
      [rect.right, rect.bottom],
      [rect.left, rect.bottom],
      [rect.left + rect.width / 2, rect.top + rect.height / 2],
    ];
    for (const [x, y] of points) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy > r2) {
        return {
          ok: false,
          reason: `outside circle: testid=${id}`,
          innerRadiusPx,
          cx,
          cy,
        };
      }
    }
    return { ok: true, innerRadiusPx };
  }, testId);
  expect(result.ok, JSON.stringify(result)).toBe(true);
}
