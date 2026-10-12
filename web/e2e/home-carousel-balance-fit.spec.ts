import { expect, test } from "@playwright/test";
import path from "node:path";
import { assertInsideDonutInnerCircle } from "./donutInnerCircle";
import { openQuickAdd } from "./helpers";

const VIEWPORTS = [320, 390, 430] as const;
const artifactsDir = process.env.ARTIFACTS_DIR ?? "/opt/cursor/artifacts/screenshots";

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

async function assertReadableAmount(page: import("@playwright/test").Page, testId: string) {
  const fontPx = await page.getByTestId(testId).evaluate((el) => {
    const raw = el.getAttribute("data-font-size-px");
    if (raw) return parseFloat(raw);
    return parseFloat(getComputedStyle(el).fontSize);
  });
  expect(fontPx).toBeGreaterThanOrEqual(15);
}

for (const width of VIEWPORTS) {
  test(`圓餅結餘可讀且在內圓內 ${width}px（95232.40）`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("./");
    await setOpeningBalance(page, "95232.4");

    await scrollCarouselTo(page, 1);
    await expect.poll(async () =>
      page.getByTestId("home-chart-carousel").getAttribute("data-balance-scope"),
    ).toBe("all");
    await page.waitForFunction(() => document.fonts?.status === "loaded");

    await expect(page.getByTestId("home-balance-value-all")).toContainText("HK$95,232");
    await expect(page.getByTestId("home-balance-value-all")).not.toContainText("+HK$");
    await assertReadableAmount(page, "home-balance-value-all");
    await assertInsideDonutInnerCircle(page, "home-balance-value-all");
    await expect(page.getByTestId("home-opening-balance-note")).toContainText(
      "含期初結餘 HK$95,232.40",
    );

    await page.screenshot({
      path: path.join(artifactsDir, `carousel-balance-${width}-95232.png`),
      fullPage: false,
    });
  });

  test(`圓餅結餘可讀且在內圓內 ${width}px（-1234567.89）`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("./");

    await openQuickAdd(page, "expense");
    await page.getByTestId("tx-amount").fill("1234567.89");
    await page.getByTestId("tx-cat-家用").click();
    await page.getByTestId("tx-save").click();
    await expect(page.getByTestId("home-page")).toBeVisible();
    await page.waitForFunction(() => document.fonts?.status === "loaded");

    await assertReadableAmount(page, "home-balance-value");
    await assertInsideDonutInnerCircle(page, "home-balance-value");
    await expect(page.getByTestId("home-balance-value")).toContainText("-HK$1,234,567");

    await page.screenshot({
      path: path.join(artifactsDir, `carousel-balance-${width}-negative.png`),
      fullPage: false,
    });
  });
}
