import { test, expect } from "@playwright/test";
import { loginAsDemoUser } from "./helpers";

// E2E-008: コンタクト手動作成(新規企業同時作成) (SCR-007) — P0
test("creating a contact with a new company name, then rejecting a duplicate email", async ({ page }) => {
  await loginAsDemoUser(page);
  await page.goto("/app/contacts");

  await page.getByTestId("add-contact-button").click();
  await page.getByTestId("contact-name-input").fill("山田花子");
  await page.getByTestId("contact-email-input").fill("hanako@newco.example");
  await page.getByTestId("contact-company-input").fill("NewCo");
  await page.getByTestId("submit-button").click();

  const row = page.locator('[data-testid^="contact-row-"]', { hasText: "山田花子" });
  await expect(row).toBeVisible();
  await expect(row).toContainText("NewCo");

  await page.getByTestId("add-contact-button").click();
  await page.getByTestId("contact-name-input").fill("山田花子2");
  await page.getByTestId("contact-email-input").fill("hanako@newco.example");
  await page.getByTestId("submit-button").click();

  await expect(page.getByTestId("contact-modal-error")).toHaveText("このメールは登録済みです");
});
