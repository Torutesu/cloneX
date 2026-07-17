import { test, expect } from "@playwright/test";
import { loginAsDemoUser, syncMailboxFromSettings } from "./helpers";

// E2E-004: NEW_DEAL承認→パイプライン反映 (SCR-010, SCR-005, SCR-006) — P0
test("approving a NEW_DEAL proposal materializes it onto the pipeline board", async ({ page }) => {
  await loginAsDemoUser(page);
  await syncMailboxFromSettings(page);

  await page.goto("/app/review");
  const card = page.locator('[data-testid^="proposal-card-"]', { hasText: "Acme社との商談" });
  await expect(card).toBeVisible();

  const approveButton = card.locator('[data-testid^="approve-"]');
  await approveButton.click();

  await expect(page.getByText(/ディール.*Acme社との商談.*を作成しました/)).toBeVisible();
  await expect(card).not.toBeVisible();
  await expect(page.getByTestId("history-section").getByText("Acme社との商談")).toBeVisible();

  await page.goto("/app/pipeline");
  const dealCard = page.locator('[data-testid^="deal-card-"]', { hasText: "Acme社との商談" });
  await expect(dealCard).toBeVisible();

  await dealCard.click();
  await page.waitForURL("**/app/deals/**");
  const timeline = page.getByTestId("timeline");
  await expect(timeline.getByText("AIがディールを作成")).toBeVisible();
  await expect(timeline.getByText(/メール受信/)).toBeVisible();
});
