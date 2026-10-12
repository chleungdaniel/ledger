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

async function assertAllCenterInsideCircle(page: import("@playwright/test").Page) {
  await assertInsideDonutInnerCircle(page, "home-balance-value");
  await assertInsideDonutInnerCircle(page, "home-eye-toggle");
}

for (const width of VIEWPORTS) {
  test(`圓餅中心文字在內圓內 ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("./");

    await setOpeningBalance(page, "2469135.78");

    await openQuickAdd(page, "expense");
    await page.getByTestId("tx-amount").fill("1234567.89");
    await page.getByTestId("tx-cat-家用").click();
    await page.getByTestId("tx-save").click();
    await expect(page.getByTestId("home-page")).toBeVisible();

    await page.waitForFunction(() => document.fonts?.status === "loaded");
    await assertAllCenterInsideCircle(page);
    await expect(page.getByTestId("home-balance-value")).toContainText("-HK$1,234,567.89");

    await scrollCarouselTo(page, 1);
    await expect.poll(async () =>
      page.getByTestId("home-chart-carousel").getAttribute("data-balance-scope"),
    ).toBe("all");

    await assertInsideDonutInnerCircle(page, "home-balance-value-all");
    await assertInsideDonutInnerCircle(page, "home-eye-toggle-all");
    await assertInsideDonutInnerCircle(page, "home-opening-balance-note");
    await expect(page.getByTestId("home-balance-value-all")).toContainText(
      "+HK$1,234,567.89",
    );
  });
}

test("含期初結餘 +HK$95,232.40 截圖 390px", async ({ page }, testInfo) => {
  const webkit = testInfo.project.name.startsWith("webkit-");
  test.skip(
    !webkit && testInfo.project.name !== "iphone-chromium",
    "screenshot on WebKit (or Chromium fallback)",
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await setOpeningBalance(page, "95232.4");

  await scrollCarouselTo(page, 1);
  await expect.poll(async () =>
    page.getByTestId("home-chart-carousel").getAttribute("data-balance-scope"),
  ).toBe("all");
  await expect(page.getByTestId("home-balance-value-all")).toContainText("+HK$95,232.40");
  await page.waitForFunction(() => document.fonts?.status === "loaded");

  await assertInsideDonutInnerCircle(page, "home-balance-value-all");
  await assertInsideDonutInnerCircle(page, "home-opening-balance-note");

  const file = webkit
    ? "carousel-balance-390-webkit.png"
    : "carousel-balance-390-chromium-fallback.png";
  await page.screenshot({
    path: path.join(artifactsDir, file),
    fullPage: false,
  });
});
