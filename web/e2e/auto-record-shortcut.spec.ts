import { expect, test } from "@playwright/test";

test("自動記帳精靈：加入捷徑連結指向可安裝的捷徑檔", async ({ page, request }) => {
  await page.goto("./");
  await page.getByTestId("tab-categories").click();
  await expect(page.getByTestId("auto-record-wizard")).toBeVisible();
  await page.getByRole("button", { name: "開始設定" }).click();

  const install = page.getByTestId("wizard-add-shortcut");
  await expect(install).toBeVisible();
  const href = await install.getAttribute("href");
  expect(href).toMatch(/^shortcuts:\/\/import-shortcut\?/);
  expect(href).toContain("ledger-notification-import.shortcut");

  const fileUrl =
    "https://chleungdaniel.github.io/ledger/shortcuts/ledger-notification-import.shortcut";
  const localShortcut = new URL(
    "./shortcuts/ledger-notification-import.shortcut",
    page.url(),
  ).href;
  const res = await request.get(localShortcut);
  expect(res.ok()).toBe(true);
  expect(res.headers()["content-type"] ?? "").toMatch(/octet-stream|shortcut|apple/i);

  const body = await res.body();
  expect(body.length).toBeGreaterThan(500);
  const latin = body.toString("latin1");
  expect(latin).toContain("chleungdaniel.github.io/ledger/");
  expect(href).toContain(encodeURIComponent(fileUrl));
});
