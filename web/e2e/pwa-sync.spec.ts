import { expect, test, devices } from "@playwright/test";
import path from "node:path";

const artifactsDir = process.env.ARTIFACTS_DIR ?? "/opt/cursor/artifacts/screenshots";

async function addExpense(page: import("@playwright/test").Page, amount: string) {
  await page.getByTestId("quick-expense").click();
  await page.getByTestId("tx-amount").fill(amount);
  await page.getByTestId("tx-cat-飲食").click();
  await page.getByTestId("tx-save").click();
  await expect(page.getByTestId("home-page")).toBeVisible();
}

test("Safari → 主畫面 App 手動同步", async ({ browser, baseURL }) => {
  const safari = await browser.newContext({
    ...devices["iPhone 14"],
    baseURL,
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const app = await browser.newContext({
    ...devices["iPhone 14"],
    baseURL,
    permissions: ["clipboard-read", "clipboard-write"],
  });
  await app.addInitScript(() => {
    Object.defineProperty(window.navigator, "standalone", {
      get: () => true,
      configurable: true,
    });
  });

  const safariPage = await safari.newPage();
  const appPage = await app.newPage();

  await safariPage.goto("./");
  await addExpense(safariPage, "88");
  await expect(safariPage.getByTestId("pwa-sync-banner")).toBeVisible();
  await safariPage.screenshot({
    path: path.join(artifactsDir, "v7-pwa-sync-safari-banner.png"),
    fullPage: true,
  });

  await safariPage.getByTestId("pwa-sync-copy").click();
  await expect(safariPage.getByTestId("pwa-sync-export-sheet")).toBeVisible();
  const code = await safariPage.getByTestId("pwa-sync-code-preview").inputValue();
  expect(code.startsWith("LEDGERSYNC1:")).toBe(true);
  await safariPage.getByRole("button", { name: "稍後" }).click();
  await expect(safariPage.getByTestId("pwa-sync-export-sheet")).toBeHidden();

  await appPage.goto("./");
  await appPage.getByTestId("pwa-sync-import").click();
  await expect(appPage.getByTestId("pwa-sync-import-sheet")).toBeVisible();
  await appPage.getByTestId("pwa-sync-paste").fill(code);
  await appPage.getByTestId("pwa-sync-paste").blur();
  await expect(appPage.getByTestId("pwa-sync-preview")).toContainText("1");
  await appPage.screenshot({
    path: path.join(artifactsDir, "v7-pwa-sync-app-preview.png"),
    fullPage: true,
  });

  await appPage.getByTestId("pwa-sync-confirm-import").click();
  await expect(appPage.getByText("HK$88")).toBeVisible();

  await appPage.getByTestId("pwa-sync-import").click();
  await appPage.getByTestId("pwa-sync-paste").fill(code);
  await appPage.getByTestId("pwa-sync-confirm-import").click();
  await expect(appPage.getByTestId("pwa-sync-message")).toContainText("沒有新交易");

  await safariPage.getByTestId("tab-categories").click();
  await expect(safariPage.getByTestId("auto-record-help")).toBeVisible();
  await safariPage.screenshot({
    path: path.join(artifactsDir, "v7-pwa-sync-help.png"),
    fullPage: true,
  });

  await safari.close();
  await app.close();
});
