import { test, expect } from "@playwright/test";
import { signup, createWorkspace, connectAndSyncMailbox } from "./helpers";

// E2E-003: メールボックス同期→提案生成 (SCR-002, SCR-010) — P0
// Given: continuation of E2E-001 (fresh signup through Step 2 of onboarding).
test("mailbox sync generates proposals and links into the review queue", async ({ page }) => {
  await signup(page, { email: `sync-${Date.now()}@example.com`, password: "password123", name: "Sync Tester" });
  await page.waitForURL("**/onboarding");
  await createWorkspace(page, "Sync Co");

  await connectAndSyncMailbox(page);
  await expect(page.getByTestId("sync-summary")).toContainText(/6件のメールから\d+件の提案が生成されました/);

  await page.getByTestId("go-to-review-button").click();
  await page.waitForURL("**/app/review");

  const proposalCards = page.locator('[data-testid^="proposal-card-"]');
  await expect(proposalCards.first()).toBeVisible();

  const newDealCards = page.locator('[data-testid^="proposal-card-"]', { hasText: "NEW_DEAL" });
  expect(await newDealCards.count()).toBeGreaterThanOrEqual(2);

  const firstCard = proposalCards.first();
  await expect(firstCard.locator('[data-testid^="confidence-badge-"]')).toBeVisible();
  await firstCard.locator('[data-testid^="source-accordion-"]').click();
});
