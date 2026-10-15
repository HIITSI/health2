import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "navigation.spec.ts",
  fullyParallel: true,
  use: { baseURL: "http://127.0.0.1:3002", screenshot: "only-on-failure" },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          executablePath:
            process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "/usr/bin/chromium",
          args: ["--no-sandbox"],
        },
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 13"],
        defaultBrowserType: "chromium",
        launchOptions: {
          executablePath:
            process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "/usr/bin/chromium",
          args: ["--no-sandbox"],
        },
      },
    },
  ],
  webServer: {
    command: "npm run start -- --port 3002",
    url: "http://127.0.0.1:3002",
    reuseExistingServer: false,
  },
});
