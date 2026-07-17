import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: 0,
  globalSetup: "./tests/global-setup.ts",
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    // 環境プリインストールのChromiumを使用(playwright installは実行しない)
    launchOptions: { executablePath: "/opt/pw-browsers/chromium" },
  },
  webServer: {
    command: "pnpm next dev -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      AI_MODE: "fixture",
      NEXT_PUBLIC_TTS: "off",
    },
  },
});
