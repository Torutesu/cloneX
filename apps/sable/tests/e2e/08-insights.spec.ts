import { test, expect } from "@playwright/test";
import { signIn, openEmployee } from "./helpers";

test("E2E-015: インサイトが頻出質問と未回答を提示する", async ({ page }) => {
  await signIn(page);
  await openEmployee(page);
  await page.getByTestId("nav-insights").click();
  await expect(page).toHaveURL(/\/insights$/);

  await page.getByTestId("regenerate-insights").click();
  await expect(page.getByTestId("top-questions")).toBeVisible({ timeout: 30_000 });

  const sessionCount = page.getByTestId("stat-sessions");
  await expect(sessionCount).not.toContainText(/^0$/);
  await expect(page.locator('[data-testid="tq-row"]').first()).toBeVisible();

  // 未回答クラスタに[回答を作成]
  const unanswered = page
    .locator('[data-testid="tq-row"][data-answered="false"]')
    .first();
  await expect(unanswered).toBeVisible();
  const questionText = await unanswered.getAttribute("data-question");
  await unanswered.getByTestId("create-answer").click();

  // SCR-013の作成モーダル(質問文プリセット)が開く
  await expect(page).toHaveURL(/\/brain\/knowledge/);
  const modal = page.getByTestId("node-modal");
  await expect(modal).toBeVisible();
  await expect(modal.getByTestId("node-title")).toHaveValue(new RegExp(questionText!.slice(0, 6)));
});
