import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test("E2E-003: ウィザードでAI社員を作成しBrainが自動構築される", async ({ page }) => {
  await signIn(page);
  await page.goto("/app/new");
  // Step1
  await page.getByTestId("product-name").fill("Acme Board");
  await page.getByTestId("product-url").fill("https://acme-board.example.com");
  await page.getByTestId("display-name").fill("Aki");
  await page.getByTestId("wizard-next").click();
  // Step2
  await page.getByTestId("build-brain").click();
  await expect(page.getByTestId("build-result")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("build-result")).toContainText("ナレッジ 8件");
  await expect(page.getByTestId("build-result")).toContainText("4ステップ");
  // Step3
  await expect(page.getByTestId("goto-persona")).toBeVisible();
});
