import { expect, test } from "@playwright/test";
import path from "node:path";

const artifactsDir = process.env.ARTIFACTS_DIR ?? "/opt/cursor/artifacts/screenshots";

function localDateTimeInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function addTransaction(
  page: import("@playwright/test").Page,
  kind: "expense" | "income",
  categoryName: string,
  amount: string,
  date?: Date,
) {
  const open =
    kind === "expense"
      ? page.getByTestId("quick-expense")
      : page.getByTestId("quick-income");
  await open.click();
  await expect(page.getByTestId("tx-form-sheet")).toBeVisible();
  await page.getByTestId("tx-amount").fill(amount);
  await page.getByTestId(`tx-cat-${categoryName}`).click();
  if (date) {
    await page.locator('input[type="datetime-local"]').fill(localDateTimeInput(date));
  }
  await page.getByTestId("tx-save").click();
  await expect(page.getByTestId("home-page")).toBeVisible();
}

test("記帳 v4：截圖匯入審核與深層連結", async ({ page }) => {
  await page.goto("./?importFixture=wallet");
  await expect(page.getByTestId("import-page")).toBeVisible();
  await expect(page.getByTestId("import-review-list")).toBeVisible();
  const rows = page.getByTestId("import-row");
  await expect(rows.first()).toBeVisible();
  await page.screenshot({
    path: path.join(artifactsDir, "v4-import-review.png"),
    fullPage: true,
  });
  await page.getByTestId("import-commit").click();
  await expect(page.getByTestId("home-page")).toBeVisible();

  await page.goto("./?add=1&amount=12.5&merchant=Corner%20Cafe&type=expense");
  await expect(page.getByTestId("tx-form-deeplink")).toBeVisible();
  await expect(page.getByTestId("tx-amount")).toHaveValue("12.5");
  await page.screenshot({
    path: path.join(artifactsDir, "v4-deeplink-sheet.png"),
    fullPage: true,
  });
  await page.getByTestId("tx-save").click();
  await expect(page.getByTestId("home-page")).toBeVisible();
});

test("記帳 v4：銀色主題、報表每月/所有", async ({ page }) => {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15, 12, 0);

  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("./");
  await expect(page.getByTestId("home-page")).toBeVisible();

  await addTransaction(page, "income", "回饋", "100", prevMonth);
  await addTransaction(page, "expense", "家用", "30");

  await page.screenshot({
    path: path.join(artifactsDir, "v4-home-light.png"),
    fullPage: true,
  });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.screenshot({
    path: path.join(artifactsDir, "v4-home-dark.png"),
    fullPage: true,
  });

  await page.getByTestId("tab-reports").click();
  await expect(page.getByTestId("report-period-month")).toHaveClass(/active/);
  await page.screenshot({
    path: path.join(artifactsDir, "v4-reports-month.png"),
    fullPage: true,
  });

  await page.getByTestId("report-period-all").click();
  await expect(page.getByTestId("report-summary-balance")).toHaveText(/\+HK\$70/);
  await page.screenshot({
    path: path.join(artifactsDir, "v4-reports-all.png"),
    fullPage: true,
  });

  await page.getByTestId("tab-categories").click();
  await expect(page.getByTestId("auto-record-help")).toBeVisible();
  await page.screenshot({
    path: path.join(artifactsDir, "v4-auto-record-help.png"),
    fullPage: true,
  });
});
