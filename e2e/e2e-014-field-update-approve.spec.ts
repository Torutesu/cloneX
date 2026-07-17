import { test, expect } from "@playwright/test";
import { loginAsDemoUser } from "./helpers";

// E2E-014: FIELD_UPDATE承認 (SCR-015, SCR-010, SCR-006) — P0
test("approving a FIELD_UPDATE proposal updates the deal amount and timeline", async ({ page }) => {
  await loginAsDemoUser(page);
  await page.goto("/app/settings");

  await page.getByTestId("manual-add-email-button").click();
  await page.getByTestId("manual-email-from-input").fill("taro@acme.example");
  await page.getByTestId("manual-email-subject-input").fill("Acme社導入 予算確定のご連絡");
  await page
    .getByTestId("manual-email-body-input")
    .fill(
      "田中です。社内稟議が通りました。予算は2万ドルで確定です。当初のお見積りから追加オプションを含めた金額になります。契約書のご準備をお願いします。",
    );
  await page.getByTestId("manual-email-submit").click();

  await page.goto("/app/review");
  const card = page.locator('[data-testid^="proposal-card-"]', { hasText: "FIELD_UPDATE" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("12000");
  await expect(card).toContainText("20000");

  await card.locator('[data-testid^="approve-"]').click();

  await page.goto("/app/pipeline");
  await page.locator('[data-testid^="deal-card-"]', { hasText: "Acme社導入" }).click();
  await page.waitForURL("**/app/deals/**");

  await expect(page.getByTestId("deal-amount")).toContainText("20,000");
  await expect(page.getByTestId("timeline")).toContainText(/12000.*20000|12,000.*20,000/);
});
