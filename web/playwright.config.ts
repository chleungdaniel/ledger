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
      name: "iphone-chromium",
      use: {
        ...devices["iPhone 14"],
        browserName: "chromium",
      },
    },
    {
      name: "webkit-iphone-13",
      use: {
        ...devices["iPhone 13"],
      },
    },
    {
      name: "webkit-iphone-se",
      use: {
        ...devices["iPhone SE"],
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
