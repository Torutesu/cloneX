import { test, expect } from "@playwright/test";
import { loginAsDemoUser } from "./helpers";

// E2E-010: チャットNLクエリ(stuck deals) (SCR-004, SCR-006) — P0
// Note: AIF-002 is only stubbed through Phase 0-1 (always returns the fixed fallback
// message per src/lib/ai/client.ts) — this assertion on real DealRefCard content will
// only pass once Phase 3 implements the fixture chat-pattern matching.
test("asking about stuck deals returns a DealRefCard linking to Delta社更新", async ({ page }) => {
  await loginAsDemoUser(page);
  await page.goto("/app/chat");

  await page.getByTestId("chat-input").fill("10日以上動いていないディールを見せて");
  await page.getByTestId("chat-send-button").click();

  const messageList = page.getByTestId("chat-message-list");
  await expect(messageList.getByText("deals_search を実行")).toBeVisible();

  const dealRef = messageList.locator('[data-testid^="deal-ref-card-"]', { hasText: "Delta社更新" });
  await expect(dealRef).toBeVisible();

  await dealRef.click();
  await page.waitForURL("**/app/deals/**");
  await expect(page.getByTestId("deal-name")).toContainText("Delta社更新");
});
