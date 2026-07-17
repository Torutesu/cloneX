import { test, expect } from "@playwright/test";
import { loginAsDemoUser } from "./helpers";

// E2E-009: 企業詳細の関連表示 (SCR-008, SCR-007, SCR-006) — P0
test("company detail lists related contacts and deals, and links into deal detail", async ({ page }) => {
  await loginAsDemoUser(page);
  await page.goto("/app/companies");

  await page.locator('[data-testid^="company-row-"]', { hasText: "Acme" }).click();
  await page.waitForURL("**/app/companies/**");

  await expect(page.getByText("田中太郎")).toBeVisible();
  const relatedDeal = page.locator('[data-testid^="deal-card-"]', { hasText: "Acme社導入" });
  await expect(relatedDeal).toBeVisible();

  await relatedDeal.click();
  await page.waitForURL("**/app/deals/**");
  await expect(page.getByTestId("deal-name")).toContainText("Acme社導入");
});
