import { test, expect } from "@playwright/test";
import { signIn, openEmployee } from "./helpers";

test("E2E-013: セッション一覧と詳細タイムラインを確認できる", async ({ page }) => {
  await signIn(page);
  await openEmployee(page); // セッション一覧が社員ホーム
  const row = page
    .getByTestId("session-row")
    .filter({ hasText: "田中" })
    .filter({ hasText: "ja→en" })
    .first();
  await expect(row).toBeVisible();
  await row.click();
  await expect(page).toHaveURL(/\/sessions\/.+/);

  // 資格確認カード
  const qual = page.getByTestId("qualification-card");
  await expect(qual).toBeVisible();
  await expect(qual).toContainText("用途");
  await expect(qual).toContainText("関心度");

  // タイムラインのイベント
  await expect(page.locator('[data-testid="tl-event"][data-type="LANGUAGE_SWITCH"]')).toBeVisible();
  await expect(page.locator('[data-testid="tl-event"][data-type="GAP_RECORDED"]')).toBeVisible();
});
