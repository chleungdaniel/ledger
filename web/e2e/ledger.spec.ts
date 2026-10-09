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

test("記帳 v3：青綠主題、報表每月/所有", async ({ page }) => {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15, 12, 0);

  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("./");
  await expect(page.getByTestId("home-page")).toBeVisible();

  await addTransaction(page, "income", "回饋", "100", prevMonth);
  await addTransaction(page, "expense", "家用", "30");

  await expect(page.getByTestId("home-monthly-balance")).toHaveText(/−HK\$30|HK\$-30|-HK\$30/);
  await expect(page.getByTestId("home-alltime-balance")).toHaveText(/\+HK\$70/);

  await page.screenshot({
    path: path.join(artifactsDir, "v3-home-light.png"),
    fullPage: true,
  });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.screenshot({
    path: path.join(artifactsDir, "v3-home-dark.png"),
    fullPage: true,
  });

  await page.getByTestId("tab-reports").click();
  await expect(page.getByTestId("reports-page")).toBeVisible();
  await expect(page.getByTestId("report-period-month")).toHaveClass(/active/);

  await expect(page.getByTestId("report-summary-balance")).toHaveText(/−HK\$30|HK\$-30|-HK\$30/);
  await page.screenshot({
    path: path.join(artifactsDir, "v3-reports-month.png"),
    fullPage: true,
  });

  await page.getByTestId("report-period-all").click();
  await expect(page.getByTestId("reports-page")).toHaveAttribute("data-report-period", "all");
  await expect(page.getByTestId("report-summary-income")).toHaveText(/HK\$100/);
  await expect(page.getByTestId("report-summary-expense")).toHaveText(/HK\$30/);
  await expect(page.getByTestId("report-summary-balance")).toHaveText(/\+HK\$70/);
  await expect(page.getByTestId("report-cumulative-balance")).toHaveText(/\+HK\$70/);

  await page.screenshot({
    path: path.join(artifactsDir, "v3-reports-all.png"),
    fullPage: true,
  });

  await page.getByTestId("tab-home").click();
  await page.getByTestId("tab-reports").click();
  await expect(page.getByTestId("report-period-all")).toHaveClass(/active/);
});
