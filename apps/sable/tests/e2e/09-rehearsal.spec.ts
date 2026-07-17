import { test, expect } from "@playwright/test";
import { signIn, openEmployee, sendChat } from "./helpers";

test("E2E-016: リハーサルは本番記録に混ざらない", async ({ page, context }) => {
  await signIn(page);
  await openEmployee(page);
  await page.getByTestId("nav-deploy").click();

  const popupPromise = context.waitForEvent("page");
  await page.getByTestId("rehearsal-start").click();
  const rehearsal = await popupPromise;
  await rehearsal.waitForLoadState();

  await expect(rehearsal.getByTestId("rehearsal-banner")).toContainText("リハーサルモード");
  await expect(rehearsal.getByTestId("turn").first()).toBeVisible();
  await sendChat(rehearsal, "料金を教えて");
  await expect(
    rehearsal.locator('[data-testid="turn"][data-role="AI"]').last(),
  ).toContainText("料金");
  await rehearsal.getByTestId("end-session").click();
  await rehearsal.getByTestId("confirm-end").click();
  await expect(rehearsal).toHaveURL(/\/done$/);
  await rehearsal.close();

  // 一覧に出ない
  await openEmployee(page);
  await expect(page.getByTestId("session-row").filter({ hasText: "リハーサル" })).toHaveCount(0);
  // REHEARSALセッションが1件も並ばないこと(シード2+本テストまでのLIVE分のみ)
  const rows = page.getByTestId("session-row");
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    await expect(rows.nth(i)).not.toHaveAttribute("data-mode", "REHEARSAL");
  }
});
