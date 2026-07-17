import { test, expect } from "@playwright/test";
import { DEMO_EMAIL, DEMO_PASSWORD } from "./helpers";

// E2E-002: ログイン (SCR-001, SCR-003) — P0
test("login succeeds with correct credentials and shows the dashboard shell", async ({ page }) => {
  await page.goto("/login");
  await page.getByTestId("email-input").fill(DEMO_EMAIL);
  await page.getByTestId("password-input").fill(DEMO_PASSWORD);
  await page.getByTestId("submit-button").click();

  await page.waitForURL("**/app");
  await expect(page.getByTestId("sidebar-nav-pipeline")).toBeVisible();
  await expect(page.getByTestId("pipeline-summary")).toBeVisible();
});

test("login fails with the wrong password", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByTestId("email-input").fill(DEMO_EMAIL);
  await page.getByTestId("password-input").fill("wrong-password");
  await page.getByTestId("submit-button").click();

  await expect(page.getByTestId("error-banner")).toHaveText("メールまたはパスワードが違います");
  await context.close();
});
