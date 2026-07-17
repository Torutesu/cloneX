import { test, expect } from "@playwright/test";
import { signIn, openEmployee } from "./helpers";

test("E2E-004: アバターとペルソナを設定する [USER-REQ]", async ({ page }) => {
  await signIn(page);
  await openEmployee(page);
  await page.getByTestId("nav-persona").click();
  await expect(page).toHaveURL(/\/persona$/);

  await page.getByTestId("preset-ROBOT").click();
  await page.getByTestId("display-name-input").fill("Robo");
  await page.getByTestId("save-persona").click();
  await expect(page.getByText("保存しました")).toBeVisible();
  await expect(page.getByTestId("avatar-preview")).toHaveAttribute("data-avatar", "ROBOT");

  await page.reload();
  await expect(page.getByTestId("avatar-preview")).toHaveAttribute("data-avatar", "ROBOT");
  await expect(page.getByTestId("display-name-input")).toHaveValue("Robo");
});
