import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test("E2E-001: サインアップして空の管理画面に着地する", async ({ page }) => {
  await page.goto("/signup");
  await page.getByTestId("name").fill("新規 太郎");
  await page.getByTestId("email").fill(`new-${Date.now()}@example.com`);
  await page.getByTestId("password").fill("password123");
  await page.getByTestId("signup-submit").click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByText("最初のAI社員を作成しましょう")).toBeVisible();
});

test("E2E-002: シードユーザーでサインインする", async ({ page }) => {
  await signIn(page);
  const card = page.getByTestId("employee-card").filter({ hasText: "TaskFlow" });
  await expect(card).toBeVisible();
  await expect(card.getByText("PUBLISHED")).toBeVisible();
  await expect(card.getByText("READY")).toBeVisible();
});
