import { expect, test } from "@playwright/test";
import path from "node:path";

const artifactsDir = process.env.ARTIFACTS_DIR ?? "/opt/cursor/artifacts/screenshots";

test("記帳 PWA 核心流程", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByTestId("home-page")).toBeVisible();

  await page.getByTestId("quick-expense").click();
  await page.getByTestId("tx-amount").fill("88");
  await page.getByRole("button", { name: "儲存" }).click();
  await expect(page.getByText("-HK$88").first()).toBeVisible();
  await expect(page.getByText("飲食").first()).toBeVisible();

  await page.screenshot({
    path: path.join(artifactsDir, "pwa-home-expense.png"),
    fullPage: true,
  });

  await page.getByTestId("tab-budget").click();
  await page.getByTestId("set-total-budget").click();
  await page.getByTestId("budget-amount").fill("50");
  await page.getByTestId("save-budget").click();
  await expect(page.getByText("已超出預算")).toBeVisible();

  await page.screenshot({
    path: path.join(artifactsDir, "pwa-budget-overspend.png"),
    fullPage: true,
  });

  await page.getByTestId("tab-reports").click();
  await expect(page.getByTestId("reports-page")).toBeVisible();
  await expect(page.getByTestId("report-bar-chart")).toBeVisible();

  await page.screenshot({
    path: path.join(artifactsDir, "pwa-reports.png"),
    fullPage: true,
  });
});
