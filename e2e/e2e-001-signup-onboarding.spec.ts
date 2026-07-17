import { test, expect } from "@playwright/test";

// E2E-001: サインアップ→オンボーディング導線 (SCR-001, SCR-002) — P0
test("signup leads into the onboarding wizard", async ({ page }) => {
  await page.goto("/signup");

  const uniqueEmail = `new-${Date.now()}@example.com`;
  await page.getByTestId("email-input").fill(uniqueEmail);
  await page.getByTestId("password-input").fill("password123");
  await page.getByTestId("name-input").fill("New User");
  await page.getByTestId("submit-button").click();

  await page.waitForURL("**/onboarding");
  await expect(page.getByTestId("workspace-name-input")).toBeVisible();

  await page.getByTestId("workspace-name-input").fill("Test Inc");
  await page.getByTestId("create-workspace-button").click();

  await expect(page.getByTestId("connect-mailbox-button")).toBeVisible();
});
