import { test, expect } from "@playwright/test";
import { loginAsDemoUser } from "./helpers";

// E2E-011: チャット→フォローアップ草稿→承認→タイムライン記録 (SCR-004, SCR-010, SCR-006) — P0
// Note: AIF-003 is only stubbed through Phase 0-1 (see src/lib/ai/client.ts) — the
// DraftPreviewCard step only passes once Phase 3 implements real draft generation.
test("chat-driven followup draft can be queued and approved into the deal timeline", async ({ page }) => {
  await loginAsDemoUser(page);
  await page.goto("/app/chat");

  await page.getByTestId("chat-input").fill("田中太郎さんにフォローアップして");
  await page.getByTestId("chat-send-button").click();

  const draftCard = page.getByTestId("draft-preview-card");
  await expect(draftCard).toBeVisible();
  await expect(draftCard).toContainText("田中太郎");

  await page.getByTestId("add-to-review-button").click();

  await page.goto("/app/review");
  const proposalCard = page.locator('[data-testid^="proposal-card-"]', { hasText: "田中太郎" });
  await expect(proposalCard).toBeVisible();
  await proposalCard.locator('[data-testid^="approve-"]').click();

  await page.goto("/app/pipeline");
  await page.locator('[data-testid^="deal-card-"]', { hasText: "Acme社導入" }).click();
  await page.waitForURL("**/app/deals/**");
  await expect(page.getByTestId("timeline")).toContainText("フォローアップを送信");
});
