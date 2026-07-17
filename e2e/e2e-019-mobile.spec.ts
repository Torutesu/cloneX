import { test, expect } from "@playwright/test";
import { loginAsDemoUser } from "./helpers";

// Guaranteed-fresh proposal for steps 5/6: earlier P0 specs run first against the same
// seeded DB and may have already approved/rejected every proposal the mailbox fixtures
// produce, so this test can't rely on leftover PENDING proposals from those specs.
// TASK-type auto-approve is never toggled on by any other P0 spec (only NEW_DEAL is,
// in E2E-013), so this is guaranteed to land PENDING regardless of run order.
const MOBILE_TASK_EMAIL = {
  fromEmail: "sato@mobiletest.example",
  subject: "モバイル動線確認のお願い",
  bodyText:
    "佐藤です。次回のミーティングまでにモバイル動線の最終確認をお願いします。特にレビュー画面の承認操作を確認してください。",
};

// E2E-019: モバイルビューポートでの主要動線 (SCR-001, SCR-003, SCR-005, SCR-010) — P0
test.describe("E2E-019 mobile", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("hamburger nav, horizontally-scrollable pipeline, and review approve all work at 390px", async ({ page }) => {
    // Step 1: log in at the mobile viewport.
    await loginAsDemoUser(page);
    await expect(page).toHaveURL(/\/app$/);

    // Seed a guaranteed PENDING proposal for later steps (see comment above).
    await page.request.post("/api/ingest/email", { data: MOBILE_TASK_EMAIL });

    // Step 2: dashboard is 1-column and does not cause horizontal scroll at 390px.
    await expect(page.getByTestId("mobile-menu-button")).toBeVisible();
    const dashboardScrollWidth = await page.evaluate(() => document.scrollingElement?.scrollWidth ?? 0);
    expect(dashboardScrollWidth).toBeLessThanOrEqual(391);

    // Step 3: hamburger menu -> Pipeline.
    await page.getByTestId("mobile-menu-button").click();
    const drawer = page.getByTestId("mobile-drawer");
    await expect(drawer).toBeVisible();
    await drawer.getByTestId("sidebar-nav-pipeline").click();

    // Step 4: drawer closes, pipeline renders, and every stage column (incl. the last,
    // "Lost") is reachable via horizontal scroll without the document itself scrolling.
    await page.waitForURL("**/app/pipeline");
    await expect(page.getByTestId("mobile-drawer")).toHaveCount(0);

    const pipelineScrollWidth = await page.evaluate(() => document.scrollingElement?.scrollWidth ?? 0);
    expect(pipelineScrollWidth).toBeLessThanOrEqual(391);

    const lostColumn = page.getByTestId("stage-column-Lost");
    await lostColumn.scrollIntoViewIfNeeded();
    await expect(lostColumn).toBeInViewport();

    // Step 5: hamburger menu -> Review, tap approve on the pending TASK proposal.
    await page.getByTestId("mobile-menu-button").click();
    await expect(drawer).toBeVisible();
    await drawer.getByTestId("sidebar-nav-review").click();
    await page.waitForURL("**/app/review");

    const card = page.locator('[data-testid^="proposal-card-"]', { hasText: "モバイル動線の最終確認をする" });
    await expect(card).toBeVisible();
    const approveButton = card.locator('[data-testid^="approve-"]');
    await approveButton.click();

    // Step 6: approval succeeds (tappable target) and the card moves into history.
    await expect(page.getByText("タスク『モバイル動線の最終確認をする』を作成しました")).toBeVisible();
    await expect(card).not.toBeVisible();
    await expect(page.getByTestId("history-section").getByText("モバイル動線の最終確認をする")).toBeVisible();
  });
});
