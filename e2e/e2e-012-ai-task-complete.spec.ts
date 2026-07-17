import { test, expect } from "@playwright/test";
import { loginAsDemoUser, syncMailboxFromSettings } from "./helpers";

// E2E-012: AI生成タスクの完了 (SCR-010, SCR-013) — P0
// Given: a taskTitle-bearing NEW_DEAL proposal approved (same setup as E2E-004).
test("completing an AI-generated task records it on the deal timeline", async ({ page }) => {
  await loginAsDemoUser(page);
  await syncMailboxFromSettings(page);

  // Given(spec: E2E-004の続きでよい): 提案が未承認ならここで承認し、
  // フルスイートで既にE2E-004が承認済みの場合はそのまま進む。
  await page.goto("/app/review");
  const card = page.locator('[data-testid^="proposal-card-"]', { hasText: "Acme社との商談" });
  if ((await card.count()) > 0) {
    await card.locator('[data-testid^="approve-"]').click();
    await expect(card).not.toBeVisible();
  }

  await page.goto("/app/tasks");
  const taskRow = page.locator('[data-testid^="task-row-"]', { hasText: "見積もりを送付する" });
  await expect(taskRow).toBeVisible();
  await expect(taskRow).toContainText("🤖");
  await expect(taskRow).toContainText("Acme社との商談");

  await taskRow.locator('[data-testid^="task-checkbox-"]').check();
  await page.getByTestId("filter-tab-OPEN").click();
  await expect(taskRow).not.toBeVisible();

  const dealCard = page.locator('[data-testid^="deal-card-"]', { hasText: "Acme社との商談" });
  await page.goto("/app/pipeline");
  await dealCard.click();
  await page.waitForURL("**/app/deals/**");
  await expect(page.getByTestId("timeline")).toContainText("完了: 見積もりを送付する");
});
