import { test, expect, type Page } from "@playwright/test";
import { loginAsDemoUser } from "./helpers";

const HIGH_CONFIDENCE_EMAIL = {
  from: "kounyuu@shindeal.example",
  subject: "発注確定の件",
  body: "お世話になっております。ShinDeal社の新規です。稟議が正式に承認されましたので、正式に発注します。契約書をお送りください。よろしくお願いいたします。",
};

const MID_CONFIDENCE_EMAIL = {
  from: "tanto@kentocorp.example",
  subject: "発注確定の件",
  body: "Kento Corpの検討です。社内では発注できるかもしれないという方向で話は進んでいますが、まだ最終決裁が下りていません。来月には結論が出る見込みです。",
};

async function addEmailManually(page: Page, email: typeof HIGH_CONFIDENCE_EMAIL) {
  await page.getByTestId("manual-add-email-button").click();
  await page.getByTestId("manual-email-from-input").fill(email.from);
  await page.getByTestId("manual-email-subject-input").fill(email.subject);
  await page.getByTestId("manual-email-body-input").fill(email.body);
  await page.getByTestId("manual-email-submit").click();
}

// E2E-013: 自動承認(しきい値) (SCR-015, SCR-005, SCR-010) — P0
test("auto-approve threshold materializes high-confidence proposals directly", async ({ page }) => {
  await loginAsDemoUser(page);
  await page.goto("/app/settings");

  await page.getByTestId("auto-approve-toggle-NEW_DEAL").check();
  await page.getByTestId("auto-approve-threshold-NEW_DEAL").fill("0.9");
  await page.getByTestId("save-auto-approve-button").click();

  await addEmailManually(page, HIGH_CONFIDENCE_EMAIL);
  await expect(page.getByText("自動承認されました")).toBeVisible();

  await page.goto("/app/pipeline");
  await expect(page.locator('[data-testid^="deal-card-"]', { hasText: "ShinDeal" })).toBeVisible();

  await page.goto("/app/review");
  const historyRow = page.getByTestId("history-section").locator('[data-testid^="proposal-card-"]', {
    hasText: "ShinDeal",
  });
  await expect(historyRow).toContainText("⚡");
  await expect(historyRow).toContainText("AUTO_APPROVED");
});

test("auto-approve threshold leaves mid-confidence proposals pending", async ({ page }) => {
  await loginAsDemoUser(page);
  await page.goto("/app/settings");

  await page.getByTestId("auto-approve-toggle-NEW_DEAL").check();
  await page.getByTestId("auto-approve-threshold-NEW_DEAL").fill("0.99");
  await page.getByTestId("save-auto-approve-button").click();

  await addEmailManually(page, MID_CONFIDENCE_EMAIL);

  await page.goto("/app/review");
  await expect(
    page.locator('[data-testid^="proposal-card-"]', { hasText: "Kento Corp" }),
  ).toBeVisible();
});
