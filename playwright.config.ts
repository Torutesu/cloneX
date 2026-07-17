import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false, // tests share one seeded DB; run serially for determinism
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 30_000,
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Prebuilt browser lives outside the default Playwright cache location in
        // this environment; `playwright install` must never run here (network
        // policy blocks the download), so point directly at the preinstalled binary.
        launchOptions: {
          executablePath: "/opt/pw-browsers/chromium",
        },
      },
    },
  ],
  webServer: {
    command: `pnpm exec next dev -p ${PORT}`,
    // `port` (TCP-accept check) rather than `url` (which requires a 2xx/3xx HTTP
    // response): in Phase 0-1 "/" redirects to "/login", which 404s until Phase 2
    // builds the screen, so a status-based readiness check would never pass even
    // though the server is genuinely up and API routes work fine.
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      AI_MODE: "fixture",
    },
  },
});
