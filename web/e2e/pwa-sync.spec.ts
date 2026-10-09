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

test("Safari → 主畫面 App 同步（一鍵複製／一鍵合併）", async ({ browser, baseURL }) => {
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
  await expect(safariPage.getByTestId("pwa-sync-card")).toBeVisible();

  await safariPage.emulateMedia({ colorScheme: "dark" });
  await safariPage.screenshot({
    path: path.join(artifactsDir, "v8-sync-safari-card-dark.png"),
    fullPage: true,
  });

  await safariPage.emulateMedia({ colorScheme: "light" });
  await safariPage.getByTestId("pwa-sync-copy").click();
  await expect(safariPage.getByTestId("pwa-sync-export-toast")).toContainText("已複製");
  await safariPage.screenshot({
    path: path.join(artifactsDir, "v8-sync-safari-card-light.png"),
    fullPage: true,
  });

  const code = await safariPage.evaluate(() => navigator.clipboard.readText());
  expect(code.startsWith("LEDGERSYNC1:")).toBe(true);
  await expect(safariPage.getByTestId("pwa-sync-card")).toBeHidden();

  await appPage.goto("./");
  await appPage.emulateMedia({ colorScheme: "light" });
  await appPage.getByTestId("pwa-sync-run").click();
  await expect(appPage.getByTestId("pwa-sync-result-toast")).toContainText("已同步 1 筆");
  await expect(appPage.getByRole("button", { name: /飲食.*88/ })).toBeVisible();
  await appPage.screenshot({
    path: path.join(artifactsDir, "v8-sync-app-result-light.png"),
    fullPage: true,
  });

  await appPage.getByTestId("pwa-sync-undo").click();
  await expect(appPage.getByRole("button", { name: /飲食.*88/ })).toBeHidden();

  await appPage.getByTestId("pwa-sync-run").click();
  await expect(appPage.getByTestId("pwa-sync-result-toast")).toContainText("已同步 1 筆");

  await appPage.getByTestId("pwa-sync-run").click();
  await expect(appPage.getByTestId("pwa-sync-result-toast")).toContainText("沒有新交易");

  await appPage.emulateMedia({ colorScheme: "dark" });
  await appPage.screenshot({
    path: path.join(artifactsDir, "v8-sync-app-result-dark.png"),
    fullPage: true,
  });

  await safari.close();
  await app.close();
});
