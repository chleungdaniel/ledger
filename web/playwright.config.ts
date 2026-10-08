import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:41789/ledger/",
    trace: "off",
  },
  projects: [
    {
      name: "iphone",
      use: {
        ...devices["iPhone 14"],
        browserName: "chromium",
      },
    },
  ],
  webServer: {
    command: "npm run build && npm run preview",
    url: "http://127.0.0.1:41789/ledger/",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
