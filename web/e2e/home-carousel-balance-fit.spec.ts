import { expect, test } from "@playwright/test";
import { openQuickAdd } from "./helpers";

const VIEWPORTS = [320, 390, 430] as const;

async function assertCarouselBalanceFits(
  page: import("@playwright/test").Page,
  testId: string,
) {
  const result = await page.getByTestId(testId).evaluate((textEl) => {
    const fit = textEl.closest(".hk-chart__balance-fit") as HTMLElement | null;
    const donut = textEl.closest(".hk-chart__donut-wrap") as HTMLElement | null;
    if (!fit || !donut) return { ok: false, reason: "missing nodes" };
    const innerMax = donut.clientWidth * (124 / 220) * 0.9;
    const textRect = textEl.getBoundingClientRect();
    const donutRect = donut.getBoundingClientRect();
    const center = textEl.closest(".hk-chart__center") as HTMLElement | null;
    const centerRect = center?.getBoundingClientRect();
    const holeRadiusPx = (donutRect.width * 62) / 220;
    const textInsideHole =
      centerRect != null &&
      textRect.left >= donutRect.left + donutRect.width / 2 - holeRadiusPx + 1 &&
      textRect.right <= donutRect.left + donutRect.width / 2 + holeRadiusPx - 1;
    const boxInsideHole = fit.clientWidth <= innerMax + 2;
    return {
      ok: textInsideHole,
      textInsideHole,
      boxInsideHole,
      scrollWidth: textEl.scrollWidth,
      fitWidth: fit.clientWidth,
      innerMax,
      text: textEl.textContent,
    };
  });
  expect(result.ok, JSON.stringify(result)).toBe(true);
}

async function scrollCarouselTo(page: import("@playwright/test").Page, index: number) {
  await page.getByTestId("home-chart-scroller").evaluate((el, i) => {
    el.scrollTo({ left: el.clientWidth * i, behavior: "auto" });
  }, index);
}

async function setOpeningBalance(page: import("@playwright/test").Page, amount: string) {
  await page.getByTestId("tab-categories").click();
  await page.getByTestId("opening-balance-edit").click();
  await page.getByTestId("opening-balance-input").fill(amount);
  await page.getByTestId("opening-balance-save").click();
  await page.getByTestId("tab-home").click();
  await expect(page.getByTestId("home-page")).toBeVisible();
}

for (const width of VIEWPORTS) {
  test(`首頁圓餅結餘字體適配 ${width}px 寬`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("./");

    await setOpeningBalance(page, "2469135.78");

    await openQuickAdd(page, "expense");
    await page.getByTestId("tx-amount").fill("1234567.89");
    await page.getByTestId("tx-cat-家用").click();
    await page.getByTestId("tx-save").click();
    await expect(page.getByTestId("home-page")).toBeVisible();

    await assertCarouselBalanceFits(page, "home-balance-value");
    await expect(page.getByTestId("home-balance-value")).toContainText("-HK$1,234,567.89");

    await scrollCarouselTo(page, 1);
    await expect.poll(async () =>
      page.getByTestId("home-chart-carousel").getAttribute("data-balance-scope"),
    ).toBe("all");

    await assertCarouselBalanceFits(page, "home-balance-value-all");
    await expect(page.getByTestId("home-balance-value-all")).toContainText(
      "+HK$1,234,567.89",
    );
  });
}
