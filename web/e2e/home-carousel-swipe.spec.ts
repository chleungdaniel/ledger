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

async function scrollCarouselTo(page: import("@playwright/test").Page, index: number) {
  await page.getByTestId("home-chart-scroller").evaluate((el, i) => {
    el.scrollTo({ left: el.clientWidth * i, behavior: "auto" });
  }, index);
}

test("首頁圓餅滑動：月結餘↔所有結餘與摘要同步", async ({ page }) => {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 10, 12, 0);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0);

  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("./");

  await addTx(page, "income", "回饋", "80", prevMonth);
  await addTx(page, "expense", "家用", "25", today);

  const carousel = page.getByTestId("home-chart-carousel");
  await expect(carousel).toHaveAttribute("data-balance-scope", "month");
  await expect(carousel).toHaveAttribute("data-carousel-balance-label", "月結餘");
  await expect(page.getByTestId("home-summary-expense-label")).toContainText("月支出");
  await expect(page.getByTestId("home-summary-expense")).toContainText("HK$25");
  await expect(page.getByTestId("home-balance-value")).toContainText("-HK$25");

  await page.screenshot({
    path: path.join(artifactsDir, "v11-carousel-month.png"),
    fullPage: false,
  });

  await scrollCarouselTo(page, 1);
  await expect
    .poll(async () => carousel.getAttribute("data-balance-scope"))
    .toBe("all");
  await expect(carousel).toHaveAttribute("data-carousel-balance-label", "所有結餘");
  await expect(page.getByTestId("home-summary-income-label")).toContainText("總收入");
  await expect(page.getByTestId("home-summary-income")).toContainText("HK$80");
  await expect(page.getByTestId("home-balance-value-all")).toContainText("HK$55");

  await page.screenshot({
    path: path.join(artifactsDir, "v11-carousel-all.png"),
    fullPage: false,
  });

  await page.getByTestId("home-chart-dot-0").click();
  await expect.poll(async () => carousel.getAttribute("data-balance-scope")).toBe("month");
  await expect(page.getByTestId("home-summary-expense-label")).toContainText("月支出");

  await page.goto("./?add=1&amount=3&type=expense&merchant=Swipe%20Test&auto=1");
  await expect(page.getByTestId("imports-inbox-page")).toBeVisible();
  await page.getByTestId("deeplink-confirm-save").click();
  await page.getByRole("button", { name: "返回" }).click();
  await expect(page.getByTestId("home-page")).toBeVisible({ timeout: 15_000 });
});
