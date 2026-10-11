import { expect, type Page } from "@playwright/test";

export async function openQuickAdd(page: Page, kind: "expense" | "income") {
  await page.getByTestId("home-fab").click();
  await expect(page.getByTestId("home-fab-sheet")).toBeVisible();
  const testId = kind === "expense" ? "quick-expense" : "quick-income";
  await page.getByTestId(testId).click();
}
