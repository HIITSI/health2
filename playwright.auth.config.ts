import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: [
    "auth.spec.ts",
    "diet.spec.ts",
    "workout.spec.ts",
    "wellness.spec.ts",
    "analysis.spec.ts",
    "service.spec.ts",
    ...(process.env.FITLOG_TEST_PUBLIC_SIGNUP === "true"
      ? ["signup.spec.ts"]
      : []),
  ],
  workers: 1,
  use: { baseURL: "http://127.0.0.1:3001" },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          executablePath:
            process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "/usr/bin/chromium",
          args: [
            "--no-sandbox",
            ...(process.env.FITLOG_TEST_CAMERA_FILE
              ? [
                  "--use-fake-device-for-media-stream",
                  "--use-fake-ui-for-media-stream",
                  `--use-file-for-fake-video-capture=${process.env.FITLOG_TEST_CAMERA_FILE}`,
                ]
              : []),
          ],
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
          args: [
            "--no-sandbox",
            ...(process.env.FITLOG_TEST_CAMERA_FILE
              ? [
                  "--use-fake-device-for-media-stream",
                  "--use-fake-ui-for-media-stream",
                  `--use-file-for-fake-video-capture=${process.env.FITLOG_TEST_CAMERA_FILE}`,
                ]
              : []),
          ],
        },
      },
    },
  ],
  webServer: {
    command: "node scripts/local-app.mjs",
    url: "http://127.0.0.1:3001/login",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
