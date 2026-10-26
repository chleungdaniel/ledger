import { describe, expect, it } from "vitest";
import {
  CREATE_NOTIFICATION_AUTOMATION_HREF,
  LEDGER_NOTIFICATION_SHORTCUT_FILENAME,
  LEDGER_NOTIFICATION_SHORTCUT_NAME,
  hostedNotificationShortcutUrl,
  notificationShortcutInstallHref,
  runNotificationShortcutTestHref,
  shouldNavigateForShortcutInstall,
} from "./iosShortcuts";

describe("iosShortcuts install URLs", () => {
  it("builds import-shortcut href with hosted file URL", () => {
    const href = notificationShortcutInstallHref(
      "https://chleungdaniel.github.io/ledger/",
    );
    expect(href.startsWith("shortcuts://import-shortcut?")).toBe(true);
    expect(href).toContain(
      encodeURIComponent(
        "https://chleungdaniel.github.io/ledger/shortcuts/ledger-notification-import.shortcut",
      ),
    );
    expect(href).toContain(encodeURIComponent(LEDGER_NOTIFICATION_SHORTCUT_NAME));
  });

  it("hosted shortcut path matches public asset filename", () => {
    expect(hostedNotificationShortcutUrl()).toContain(
      LEDGER_NOTIFICATION_SHORTCUT_FILENAME,
    );
  });

  it("marks shortcuts and icloud links as navigable", () => {
    expect(
      shouldNavigateForShortcutInstall(
        notificationShortcutInstallHref("https://chleungdaniel.github.io/ledger/"),
      ),
    ).toBe(true);
    expect(
      shouldNavigateForShortcutInstall(
        "https://www.icloud.com/shortcuts/abc123",
      ),
    ).toBe(true);
  });

  it("exposes create-automation and run-shortcut test links", () => {
    expect(CREATE_NOTIFICATION_AUTOMATION_HREF).toBe(
      "shortcuts://create-automation",
    );
    const run = runNotificationShortcutTestHref();
    expect(run).toContain("shortcuts://run-shortcut?");
    expect(run).toContain(encodeURIComponent("鐵路：HK$7.90"));
  });
});
