import { test, expect } from "@playwright/test";
import { signIn, openEmployee, SEED_SLUG } from "./helpers";

async function gotoDeploy(page: import("@playwright/test").Page) {
  await signIn(page);
  await openEmployee(page);
  await page.getByTestId("nav-deploy").click();
  await expect(page).toHaveURL(/\/deploy$/);
}

test("E2E-005: 公開して共有リンクから入口が開ける", async ({ page }) => {
  await gotoDeploy(page);
  const toggle = page.getByTestId("publish-toggle");
  if (!(await toggle.isChecked())) {
    await toggle.click();
    await expect(toggle).toBeChecked();
  }
  await expect(page.getByTestId("share-link")).toContainText(`/d/${SEED_SLUG}`);

  await page.goto(`/d/${SEED_SLUG}`);
  await expect(page.getByTestId("avatar-idle")).toBeVisible();
  const langSelect = page.getByTestId("language-select");
  await expect(langSelect.locator("option")).toHaveCount(4);
  await expect(page.getByTestId("start-demo")).toBeVisible();
});

test("E2E-006: 非公開のデモ入口はブロックされる", async ({ page }) => {
  await gotoDeploy(page);
  const toggle = page.getByTestId("publish-toggle");
  await toggle.click(); // → DRAFT
  await expect(toggle).not.toBeChecked();

  await page.goto(`/d/${SEED_SLUG}`);
  await expect(page.getByText("このデモは現在利用できません")).toBeVisible();
  await expect(page.getByTestId("start-demo")).toHaveCount(0);

  // 後続テストのため公開状態に戻す
  await gotoDeploy(page);
  await page.getByTestId("publish-toggle").click();
  await expect(page.getByTestId("publish-toggle")).toBeChecked();
});
