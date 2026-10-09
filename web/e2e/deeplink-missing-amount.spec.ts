import { expect, test } from "@playwright/test";
import path from "node:path";

const artifactsDir = process.env.ARTIFACTS_DIR ?? "/opt/cursor/artifacts/screenshots";

test("捷徑 auto=1 無金額時顯示提示與原始參數", async ({ page }) => {
  await page.goto("./?add=1&merchant=Octopus%20Card&auto=1&type=expense");
  await expect(page.getByTestId("tx-form-deeplink")).toBeVisible();
  await expect(page.getByTestId("deeplink-missing-amount")).toContainText("捷徑未傳入金額");
  await expect(page.getByTestId("deeplink-raw-params")).toContainText("merchant=Octopus");
  await expect(page.getByTestId("tx-amount")).toHaveValue("");
  await expect(page.getByTestId("tx-cat-交通")).toHaveClass(/active/);

  await page.screenshot({
    path: path.join(artifactsDir, "v9-deeplink-missing-amount.png"),
    fullPage: true,
  });
});
