import { test, expect } from "@playwright/test";
import { startBuyerSession, sendChat, lastAiTurn } from "./helpers";

test("E2E-007: 買い手がセッションを開始すると挨拶が再生される", async ({ page }) => {
  await startBuyerSession(page, { name: "田中", company: "ACME", language: "ja" });
  const greeting = lastAiTurn(page);
  await expect(greeting).toHaveAttribute("data-lang", "ja");
  await expect(greeting).toContainText("こんにちは");
  // アバターが speaking → idle に遷移する
  const avatar = page.getByTestId("avatar");
  await expect(avatar).toHaveAttribute("data-state", "speaking");
  await expect(avatar).toHaveAttribute("data-state", "idle", { timeout: 15_000 });
});

test("E2E-008: デモステップが進行しステージとナレーションが同期する", async ({ page }) => {
  await startBuyerSession(page);
  await page.getByTestId("next-step").click();
  await expect(page.getByTestId("stage-iframe")).toHaveAttribute("src", /\/demo-target\/dashboard/);
  await expect(page.getByTestId("ai-cursor")).toBeVisible();
  await expect(page.getByTestId("highlight")).toBeVisible();
  await expect(page.getByTestId("step-indicator")).toContainText("1/4");
  const narration = lastAiTurn(page);
  await expect(narration).toHaveAttribute("data-lang", "ja");
  await expect(narration).toContainText("ダッシュボード");
});

test("E2E-009: 質問にBrain参照で回答する", async ({ page }) => {
  await startBuyerSession(page);
  await sendChat(page, "料金を教えて");
  const answer = lastAiTurn(page);
  await expect(answer).toContainText("料金");
  await expect(answer.getByTestId("refs")).toContainText("1件参照");
});

test("E2E-010: 会話の途中で言語が即時切替される [USER-REQ]", async ({ page }) => {
  await startBuyerSession(page, { language: "ja" });
  await sendChat(page, "How much does it cost?");
  const answer = lastAiTurn(page);
  await expect(answer).toHaveAttribute("data-lang", "en");
  await expect(page.getByTestId("lang-badge")).toContainText("English");
  await expect(page.getByTestId("lang-divider")).toContainText("English");
  // 以後のナレーションも英語になる
  await page.getByTestId("next-step").click();
  const narration = lastAiTurn(page);
  await expect(narration).toHaveAttribute("data-lang", "en");
  await expect(narration).toContainText("dashboard");
});

test("E2E-011: 答えられない質問は知識ギャップとして記録される", async ({ page }) => {
  await startBuyerSession(page);
  await sendChat(page, "SSOには対応していますか?");
  const answer = lastAiTurn(page);
  await expect(answer).toContainText("確認して");
  await expect(answer.getByTestId("gap-flag")).toBeVisible();
});

test("E2E-012: セッションを終了すると要約が表示される", async ({ page }) => {
  await startBuyerSession(page, { name: "佐藤", company: "Beta" });
  await page.getByTestId("next-step").click();
  await expect(page.getByTestId("step-indicator")).toContainText("1/4");
  await page.getByTestId("next-step").click();
  await expect(page.getByTestId("step-indicator")).toContainText("2/4");
  await sendChat(page, "料金を教えて");
  await expect(lastAiTurn(page).getByTestId("refs")).toBeVisible();
  await sendChat(page, "タスク管理はできますか?");
  await expect(page.locator('[data-testid="turn"][data-role="AI"]')).toHaveCount(5);

  await page.getByTestId("end-session").click();
  await page.getByTestId("confirm-end").click();
  await expect(page).toHaveURL(/\/done$/);
  await expect(page.getByText("本日のまとめ")).toBeVisible();
  await expect(page.getByTestId("summary")).toBeVisible();
  await expect(page.getByTestId("product-link")).toBeVisible();
  await page.getByTestId("transcript-accordion").click();
  await expect(page.locator('[data-testid="done-turn"]').first()).toBeVisible();
});

test("E2E-017: 買い手がステップを戻れる", async ({ page }) => {
  await startBuyerSession(page);
  await page.getByTestId("next-step").click();
  await expect(page.getByTestId("step-indicator")).toContainText("1/4");
  await page.getByTestId("next-step").click();
  await expect(page.getByTestId("step-indicator")).toContainText("2/4");
  const turnCount = await page.locator('[data-testid="turn"]').count();

  await page.getByTestId("prev-step").click();
  await expect(page.getByTestId("step-indicator")).toContainText("1/4");
  await expect(page.getByTestId("stage-iframe")).toHaveAttribute("src", /\/demo-target\/dashboard/);
  // 再訪ではAIターン(ナレーション)は増えない
  await expect(page.locator('[data-testid="turn"]')).toHaveCount(turnCount);
});
