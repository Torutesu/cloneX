import { Page, expect } from "@playwright/test";

export const SEED_EMAIL = "demo@example.com";
export const SEED_PASSWORD = "demo1234";
export const SEED_SLUG = "taskflow-demo";

export async function signIn(page: Page) {
  await page.goto("/signin");
  await page.getByTestId("email").fill(SEED_EMAIL);
  await page.getByTestId("password").fill(SEED_PASSWORD);
  await page.getByTestId("signin-submit").click();
  await expect(page).toHaveURL(/\/app$/);
}

/** /app からTaskFlow社員のセッション一覧(社員ホーム)へ */
export async function openEmployee(page: Page) {
  await page.goto("/app");
  await page.getByTestId("employee-card").filter({ hasText: "TaskFlow" }).click();
  await expect(page).toHaveURL(/\/app\/[a-z0-9]+\/sessions$/);
}

/** 買い手としてセッションを開始し、ライブ画面に入る(挨拶ターン表示まで待つ) */
export async function startBuyerSession(
  page: Page,
  opts: { name?: string; company?: string; language?: string } = {},
) {
  await page.goto(`/d/${SEED_SLUG}`);
  if (opts.name) await page.getByTestId("buyer-name").fill(opts.name);
  if (opts.company) await page.getByTestId("buyer-company").fill(opts.company);
  await page.getByTestId("language-select").selectOption(opts.language ?? "ja");
  await page.getByTestId("start-demo").click();
  await expect(page).toHaveURL(/\/d\/.+\/s\/.+/);
  await expect(page.getByTestId("turn").first()).toBeVisible();
}

export async function sendChat(page: Page, text: string) {
  await page.getByTestId("chat-input").fill(text);
  await page.getByTestId("chat-send").click();
}

/** 最後のAIターンを返すロケータ */
export function lastAiTurn(page: Page) {
  return page.locator('[data-testid="turn"][data-role="AI"]').last();
}
