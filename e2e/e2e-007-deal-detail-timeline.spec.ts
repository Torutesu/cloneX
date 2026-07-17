import { test, expect } from "@playwright/test";
import { loginAsDemoUser } from "./helpers";

// E2E-007: ディール詳細のタイムラインとインライン編集 (SCR-006) — P0
test("deal detail shows email timeline entries and supports inline edits", async ({ page }) => {
  await loginAsDemoUser(page);
  await page.goto("/app/pipeline");

  await page.locator('[data-testid^="deal-card-"]', { hasText: "Acme社導入" }).click();
  await page.waitForURL("**/app/deals/**");

  const timeline = page.getByTestId("timeline");
  const emailItem = timeline.locator('[data-testid^="timeline-item-"]', { hasText: "見積" });
  await expect(emailItem).toBeVisible();
  await emailItem.click();
  await expect(emailItem).toContainText("田中です");

  await page.getByTestId("deal-amount").click();
  const amountInput = page.getByTestId("deal-amount").locator("input");
  await amountInput.fill("15000");
  await amountInput.press("Enter");

  await expect(page.getByTestId("deal-amount")).toContainText("15000");
  await expect(timeline).toContainText(/金額/);

  await page.getByTestId("note-tab").click();
  await page.getByTestId("note-input").fill("電話で合意");
  await page.getByTestId("add-note-button").click();

  await expect(page.getByTestId("note-tab")).toContainText("電話で合意");
  await expect(timeline).toContainText("電話で合意");
});
