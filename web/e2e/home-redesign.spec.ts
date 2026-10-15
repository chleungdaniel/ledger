import { expect, test } from "@playwright/test";
import path from "node:path";
import { openQuickAdd } from "./helpers";

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
  await openQuickAdd(page, kind);
  await page.getByTestId("tx-amount").fill(amount);
  await page.getByTestId(`tx-cat-${category}`).click();
  if (date) {
    await page.locator('input[type="datetime-local"]').fill(localDateTimeInput(date));
  }
  await page.getByTestId("tx-save").click();
  await expect(page.getByTestId("home-page")).toBeVisible();
}

test("首頁 HK 設計：月/所有、分組、FAB、眼睛、深層連結", async ({ page }) => {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15, 12, 0);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0);

  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("./");
  await expect(page.getByTestId("home-page")).toBeVisible();
  await expect(page.getByTestId("home-period-picker")).toBeVisible();

  await addTx(page, "income", "回饋", "100", prevMonth);
  await addTx(page, "expense", "家用", "20", today);
  await addTx(page, "expense", "交通", "10", today);

  await expect(page.getByTestId("home-summary-expense")).toContainText("HK$30");
  await expect(page.getByTestId("home-summary-income")).toContainText("HK$0");
  await expect(page.getByTestId("home-balance-value")).toContainText("-HK$30");
  await expect(page.getByTestId("home-tx-amount").first()).toContainText("-HK$");

  const dayGroups = page.getByTestId("home-day-group");
  await expect(dayGroups.first()).toBeVisible();
  await expect(dayGroups.first().getByTestId("home-day-label")).toHaveText(
    /\d{4}\/\d{2}\/\d{2} 星期/,
  );
  const firstDayNet = dayGroups.first().getByTestId("home-day-net");
  await expect(firstDayNet).toContainText("-HK$30");

  await page.screenshot({
    path: path.join(artifactsDir, "v10-home-month-light.png"),
    fullPage: false,
  });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.screenshot({
    path: path.join(artifactsDir, "v10-home-month-dark.png"),
    fullPage: false,
  });
  await page.emulateMedia({ colorScheme: "light" });

  await page.getByTestId("home-eye-toggle").click();
  await expect(page.getByTestId("home-balance-value")).toHaveText("••••");
  await page.getByTestId("home-eye-toggle").click();
  await expect(page.getByTestId("home-balance-value")).toContainText("-HK$30");

  await page.getByTestId("home-period-picker").click();
  await page.getByTestId("home-scope-all").click();
  await expect(page.getByTestId("home-page")).toHaveAttribute("data-home-scope", "all");
  await expect(page.getByTestId("home-summary-expense-label")).toContainText("總支出");
  await expect(page.getByTestId("home-summary-expense")).toContainText("HK$30");
  await expect(page.getByTestId("home-summary-income")).toContainText("HK$100");
  await expect(page.getByTestId("home-balance-value-all")).toContainText("HK$70");

  await page.screenshot({
    path: path.join(artifactsDir, "v10-home-all-light.png"),
    fullPage: false,
  });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.screenshot({
    path: path.join(artifactsDir, "v10-home-all-dark.png"),
    fullPage: false,
  });
  await page.emulateMedia({ colorScheme: "light" });

  await page.getByTestId("home-chart-dot-2").click();
  await expect(page.getByTestId("home-category-legend")).toBeVisible();

  const swipeRow = page.getByTestId("home-swipe-row").first();
  await swipeRow.evaluate((el) => {
    el.classList.add("hk-swipe-row--open", "hk-swipe-row--reveal");
    const row = el.querySelector(".hk-tx-row") as HTMLElement | null;
    if (row) row.style.transform = "translateX(-88px)";
  });
  await page.screenshot({
    path: path.join(artifactsDir, "v10-home-swipe-delete.png"),
    fullPage: false,
  });

  await page.locator(".hk-day-list").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(artifactsDir, "v10-home-scrolled-days.png"),
    fullPage: false,
  });

  await page.getByTestId("home-fab").click();
  await expect(page.getByTestId("home-fab-sheet")).toBeVisible();
  await page.getByTestId("quick-expense").click();
  await expect(page.getByTestId("tx-form-sheet")).toBeVisible();
  await page.getByRole("button", { name: "取消" }).click();
  await expect(page.getByTestId("home-page")).toBeVisible();

  await page.goto("./?add=1&amount=5.5&merchant=E2E%20Auto&type=expense&auto=1");
  await expect(page.getByTestId("deeplink-confirm-sheet")).toBeVisible();
  await page.getByTestId("deeplink-confirm-save").click();
  await expect(page.getByTestId("home-page")).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("home-period-picker").click();
  await page.getByTestId("home-scope-all").click();
  await expect(page.getByTestId("home-summary-expense")).toContainText("HK$35.5");
});
