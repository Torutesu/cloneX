import { test, expect } from "@playwright/test";
import { loginAsDemoUser, syncMailboxFromSettings } from "./helpers";

// E2E-005: 提案の却下 (SCR-010, SCR-005) — P0
test("rejecting a proposal keeps it out of the pipeline", async ({ page }) => {
  await loginAsDemoUser(page);
  await syncMailboxFromSettings(page);

  await page.goto("/app/review");
  const card = page.locator('[data-testid^="proposal-card-"]', { hasText: "Beta社トライアル" });
  await expect(card).toBeVisible();

  await card.locator('[data-testid^="reject-"]').click();
  await expect(card).not.toBeVisible();

  const history = page.getByTestId("history-section");
  await expect(history.getByText("Beta社トライアル")).toBeVisible();
  await expect(history.getByText("REJECTED")).toBeVisible();

  await page.goto("/app/pipeline");
  await expect(page.locator('[data-testid^="deal-card-"]', { hasText: "Beta社トライアル" })).toHaveCount(0);
});
