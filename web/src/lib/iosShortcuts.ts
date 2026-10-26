/** Display name of the installable notification shortcut (must match build script). */
export const LEDGER_NOTIFICATION_SHORTCUT_NAME = "記帳匯入通知";

/** Hosted on GitHub Pages; regenerated via `npm run shortcuts:build`. */
export const LEDGER_NOTIFICATION_SHORTCUT_FILENAME =
  "ledger-notification-import.shortcut";

/**
 * Optional iCloud share record id (hex, no dashes). When set, install opens iCloud
 * instead of shortcuts://import-shortcut.
 */
export const LEDGER_NOTIFICATION_SHORTCUT_ICLOUD_ID: string | null = null;

const OPEN_HREF_PATTERN =
  /^(mailto|shortcuts):|^https:\/\/www\.icloud\.com\/shortcuts\//;

export function ledgerDefaultOrigin(): string {
  return "https://chleungdaniel.github.io/ledger/";
}

export function resolveLedgerOrigin(baseUrl?: string): string {
  if (baseUrl) {
    return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  }
  if (typeof window !== "undefined") {
    return new URL(import.meta.env.BASE_URL, window.location.origin).href;
  }
  return ledgerDefaultOrigin();
}

export function hostedNotificationShortcutUrl(origin?: string): string {
  const base = resolveLedgerOrigin(origin);
  return new URL(
    `shortcuts/${LEDGER_NOTIFICATION_SHORTCUT_FILENAME}`,
    base,
  ).href;
}

export function icloudNotificationShortcutInstallUrl(
  recordId = LEDGER_NOTIFICATION_SHORTCUT_ICLOUD_ID,
): string | null {
  if (!recordId) return null;
  const id = recordId.replace(/-/g, "").toLowerCase();
  return `https://www.icloud.com/shortcuts/${id}`;
}

/**
 * URL opened when the user taps「加入捷徑」. On iPhone this should open Shortcuts
 * to add the workflow; on desktop it may no-op or show Shortcuts on Mac.
 */
export function notificationShortcutInstallHref(origin?: string): string {
  const icloud = icloudNotificationShortcutInstallUrl();
  if (icloud) return icloud;
  const fileUrl = hostedNotificationShortcutUrl(origin);
  const params = new URLSearchParams({
    url: fileUrl,
    name: LEDGER_NOTIFICATION_SHORTCUT_NAME,
  });
  return `shortcuts://import-shortcut?${params.toString()}`;
}

/** DuoPurse-style: only use location navigation for trusted shortcut schemes. */
export function shouldNavigateForShortcutInstall(href: string): boolean {
  return OPEN_HREF_PATTERN.test(href) || href.startsWith("shortcuts://");
}

export function openNotificationShortcutInstall(origin?: string): void {
  const href = notificationShortcutInstallHref(origin);
  if (typeof window === "undefined") return;
  if (shouldNavigateForShortcutInstall(href)) {
    window.location.href = href;
    return;
  }
  window.location.href = href;
}

/** Personal Automation: opens Shortcuts to create「收到通知時」automation. */
export const CREATE_NOTIFICATION_AUTOMATION_HREF = "shortcuts://create-automation";

export function openCreateNotificationAutomation(): void {
  if (typeof window === "undefined") return;
  window.location.href = CREATE_NOTIFICATION_AUTOMATION_HREF;
}

/** Run installed shortcut with sample text (for wizard test on device). */
export function runNotificationShortcutTestHref(
  sampleText = "鐵路：HK$7.90",
): string {
  const params = new URLSearchParams({
    name: LEDGER_NOTIFICATION_SHORTCUT_NAME,
    input: "text",
    text: sampleText,
  });
  return `shortcuts://run-shortcut?${params.toString()}`;
}
