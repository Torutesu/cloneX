import { test, expect } from "@playwright/test";
import { signIn, openEmployee, startBuyerSession, sendChat, lastAiTurn } from "./helpers";

test("E2E-014: 知識ギャップを解消すると次のセッションから回答できる", async ({ page }) => {
  await signIn(page);
  await openEmployee(page);
  await page.getByTestId("nav-knowledge").click();
  await expect(page).toHaveURL(/\/brain\/knowledge$/);

  const gapRow = page
    .locator('[data-testid="gap-row"]')
    .filter({ hasText: "SSOには対応していますか?" })
    .first();
  await expect(gapRow).toBeVisible();
  const gapId = await gapRow.getAttribute("data-gap-id");

  await gapRow.getByTestId("gap-answer").click();
  const modal = page.getByTestId("node-modal");
  await expect(modal.getByTestId("node-title")).toHaveValue(/SSO/);
  await modal.getByTestId("node-body").fill("SAML SSOに対応しています。");
  await modal.getByTestId("node-save").click();

  await expect(page.locator(`[data-gap-id="${gapId}"]`)).toHaveCount(0);
  await expect(
    page.locator('[data-testid="node-row"]').filter({ hasText: "SSO" }).first(),
  ).toBeVisible();

  // 新規セッションで同じ質問に回答できる
  await startBuyerSession(page);
  await sendChat(page, "SSOには対応していますか?");
  const answer = lastAiTurn(page);
  await expect(answer).toContainText("SAML SSO");
  await expect(answer.getByTestId("refs")).toBeVisible();
  await expect(answer.getByTestId("gap-flag")).toHaveCount(0);
});
