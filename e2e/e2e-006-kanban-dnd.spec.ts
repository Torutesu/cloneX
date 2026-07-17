import { test, expect } from "@playwright/test";
import { loginAsDemoUser } from "./helpers";

// E2E-006: カンバンでステージ移動 (SCR-005, SCR-006) — P0
test("dragging a deal card to another stage column persists after reload", async ({ page }) => {
  await loginAsDemoUser(page);
  await page.goto("/app/pipeline");

  const card = page.locator('[data-testid^="deal-card-"]', { hasText: "Gamma社導入" });
  await expect(card).toBeVisible();
  await expect(page.getByTestId("stage-column-Qualified")).toContainText("Gamma社導入");

  await card.dragTo(page.getByTestId("stage-column-Proposal"));

  await expect(page.getByTestId("stage-column-Proposal")).toContainText("Gamma社導入");
  await expect(page.getByTestId("stage-column-Qualified")).not.toContainText("Gamma社導入");

  await page.reload();
  await expect(page.getByTestId("stage-column-Proposal")).toContainText("Gamma社導入");

  await page.locator('[data-testid^="deal-card-"]', { hasText: "Gamma社導入" }).click();
  await page.waitForURL("**/app/deals/**");
  const timelineItems = page.getByTestId("timeline").locator('[data-testid^="timeline-item-"]');
  await expect(timelineItems.first()).toContainText("Qualified → Proposal");
});
