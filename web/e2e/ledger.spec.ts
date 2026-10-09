import { expect, test } from "@playwright/test";
import path from "node:path";

const artifactsDir = process.env.ARTIFACTS_DIR ?? "/opt/cursor/artifacts/screenshots";

async function addTransaction(
  page: import("@playwright/test").Page,
  kind: "expense" | "income",
  categoryName: string,
  amount: string,
) {
  const open =
    kind === "expense"
      ? page.getByTestId("quick-expense")
      : page.getByTestId("quick-income");
  await open.click();
  await expect(page.getByTestId("tx-form-sheet")).toBeVisible();
  await page.getByTestId("tx-amount").fill(amount);
  await page.getByTestId(`tx-cat-${categoryName}`).click();
  await page.screenshot({
    path: path.join(
      artifactsDir,
      `v2-form-${kind}-${categoryName}.png`,
    ),
    fullPage: true,
  });
  await page.getByTestId("tx-save").click();
  await expect(page.getByTestId("home-page")).toBeVisible();
}

test("記帳 v2：結餘、新分類與報表", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("./");
  await expect(page.getByTestId("home-page")).toBeVisible();

  await addTransaction(page, "income", "回饋", "200");
  await addTransaction(page, "expense", "家用", "150");

  await expect(page.getByTestId("home-monthly-balance")).toHaveText(/\+HK\$50/);
  await expect(page.getByTestId("home-alltime-balance")).toHaveText(/\+HK\$50/);

  await page.screenshot({
    path: path.join(artifactsDir, "v2-home-light.png"),
    fullPage: true,
  });

  await page.emulateMedia({ colorScheme: "dark" });
  await page.screenshot({
    path: path.join(artifactsDir, "v2-home-dark.png"),
    fullPage: true,
  });

  await page.getByTestId("tab-reports").click();
  await expect(page.getByTestId("reports-page")).toBeVisible();
  await expect(page.getByTestId("report-month-balance")).toHaveText(/\+HK\$50/);
  await expect(page.getByTestId("report-cumulative-balance")).toHaveText(/\+HK\$50/);
  await expect(page.getByTestId("report-balance-chart")).toBeVisible();

  await page.emulateMedia({ colorScheme: "light" });
  await page.screenshot({
    path: path.join(artifactsDir, "v2-reports-light.png"),
    fullPage: true,
  });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.screenshot({
    path: path.join(artifactsDir, "v2-reports-dark.png"),
    fullPage: true,
  });
});
