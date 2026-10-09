import { expect, test } from "@playwright/test";
import path from "node:path";

const artifactsDir = process.env.ARTIFACTS_DIR ?? "/opt/cursor/artifacts/screenshots";

function localDateTimeInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function addTx(
  page: import("@playwright/test").Page,
  kind: "expense" | "income",
  category: string,
  amount: string,
  date?: Date,
) {
  await (kind === "expense"
    ? page.getByTestId("quick-expense")
    : page.getByTestId("quick-income")).click();
  await page.getByTestId("tx-amount").fill(amount);
  await page.getByTestId(`tx-cat-${category}`).click();
  if (date) {
    await page.locator('input[type="datetime-local"]').fill(localDateTimeInput(date));
  }
  await page.getByTestId("tx-save").click();
  await expect(page.getByTestId("home-page")).toBeVisible();
}

test("報表彩色圖表截圖（每月 / 所有，淺色與深色）", async ({ page }) => {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 12, 12, 0);
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 8, 12, 0);

  await page.goto("./");
  await addTx(page, "income", "薪資", "800", twoMonthsAgo);
  await addTx(page, "expense", "飲食", "120", twoMonthsAgo);
  await addTx(page, "expense", "交通", "80", twoMonthsAgo);

  await addTx(page, "income", "回饋", "200", prev);
  await addTx(page, "expense", "飲食", "250", prev);
  await addTx(page, "expense", "交通", "180", prev);
  await addTx(page, "expense", "購物", "500", prev);

  await addTx(page, "expense", "家用", "40");
  await addTx(page, "income", "回饋", "60");

  await page.getByTestId("tab-reports").click();
  await expect(page.getByTestId("report-pie-chart")).toBeVisible();
  await expect(page.getByTestId("report-category-bar-chart")).toBeVisible();

  await page.emulateMedia({ colorScheme: "light" });
  await page.getByTestId("report-period-month").click();
  await page.screenshot({
    path: path.join(artifactsDir, "v5-reports-month-light.png"),
    fullPage: true,
  });

  await page.emulateMedia({ colorScheme: "dark" });
  await page.screenshot({
    path: path.join(artifactsDir, "v5-reports-month-dark.png"),
    fullPage: true,
  });

  await page.getByTestId("report-period-all").click();
  await expect(page.getByTestId("report-balance-chart")).toBeVisible();

  await page.emulateMedia({ colorScheme: "light" });
  await page.screenshot({
    path: path.join(artifactsDir, "v5-reports-all-light.png"),
    fullPage: true,
  });

  await page.emulateMedia({ colorScheme: "dark" });
  await page.screenshot({
    path: path.join(artifactsDir, "v5-reports-all-dark.png"),
    fullPage: true,
  });
});
