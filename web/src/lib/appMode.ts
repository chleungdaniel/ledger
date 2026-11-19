export function isLiveAppMode(): boolean {
  return import.meta.env.VITE_APP_TARGET === "live";
}