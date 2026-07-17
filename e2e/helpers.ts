import type { Page } from "@playwright/test";

export const DEMO_EMAIL = "demo@clonex.dev";
export const DEMO_PASSWORD = "demo1234";

/** Logs in via the SCR-001 UI form and waits for the SCR-003 dashboard to load. */
export async function loginAsDemoUser(page: Page) {
  await page.goto("/login");
  await page.getByTestId("email-input").fill(DEMO_EMAIL);
  await page.getByTestId("password-input").fill(DEMO_PASSWORD);
  await page.getByTestId("submit-button").click();
  await page.waitForURL("**/app");
}

export async function signup(page: Page, params: { email: string; password: string; name: string }) {
  await page.goto("/signup");
  await page.getByTestId("email-input").fill(params.email);
  await page.getByTestId("password-input").fill(params.password);
  await page.getByTestId("name-input").fill(params.name);
  await page.getByTestId("submit-button").click();
}

export async function createWorkspace(page: Page, name: string) {
  await page.getByTestId("workspace-name-input").fill(name);
  await page.getByTestId("create-workspace-button").click();
}

/** SCR-002 Step 2: connect + sync the fixture mailbox, waiting for the summary text. */
export async function connectAndSyncMailbox(page: Page) {
  await page.getByTestId("connect-mailbox-button").click();
  await page.getByTestId("sync-summary").waitFor({ state: "visible", timeout: 15_000 });
}

/** SCR-015 "今すぐ同期" — used when the test needs proposals to exist but starts from
 * a fresh /app session rather than the onboarding wizard (workspace already seeded). */
export async function syncMailboxFromSettings(page: Page) {
  await page.goto("/app/settings");
  await page.getByTestId("sync-now-button").click();
  await page.getByTestId("sync-now-button").waitFor({ state: "visible" });
}
