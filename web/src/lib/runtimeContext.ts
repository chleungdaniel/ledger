/** True when running as an installed home-screen / standalone PWA. */
export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  return window.matchMedia("(display-mode: standalone)").matches;
}

/** Safari or in-tab browser — separate IndexedDB from standalone PWA. */
export function isInBrowserTab(): boolean {
  return !isStandalonePwa();
}
