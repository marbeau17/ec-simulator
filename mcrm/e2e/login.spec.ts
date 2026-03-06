import { test, expect } from "@playwright/test";
import {
  mockLoginSuccess,
  mockLoginFailure,
} from "./helpers/mock-auth";

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("renders the login form with branding", async ({ page }) => {
    // Verify branding
    await expect(page.locator("h1")).toHaveText("MCRM");

    // Verify form elements
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "ログイン" })
    ).toBeVisible();
  });

  test("shows validation error when fields are empty", async ({ page }) => {
    // Click submit without filling anything
    await page.getByRole("button", { name: "ログイン" }).click();

    // The form uses native required attributes, so the browser prevents submission.
    // Verify that we did NOT navigate away.
    await expect(page).toHaveURL(/\/login/);
  });

  test("shows error message on login failure", async ({ page }) => {
    await mockLoginFailure(page);

    await page.locator("#email").fill("wrong@example.com");
    await page.locator("#password").fill("badpassword");
    await page.getByRole("button", { name: "ログイン" }).click();

    // Wait for the error message to appear
    await expect(
      page.getByText("メールアドレスまたはパスワードが正しくありません。")
    ).toBeVisible();
  });

  test("redirects to dashboard on successful login", async ({ page }) => {
    await mockLoginSuccess(page);

    await page.locator("#email").fill("admin@example.com");
    await page.locator("#password").fill("password123");
    await page.getByRole("button", { name: "ログイン" }).click();

    // Should redirect to /dashboard
    await page.waitForURL("**/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("toggles password visibility", async ({ page }) => {
    const passwordInput = page.locator("#password");

    // Initially password type
    await expect(passwordInput).toHaveAttribute("type", "password");

    // Click the toggle button (the eye icon button next to password)
    await passwordInput.fill("secret");
    await page
      .locator("#password")
      .locator("..")
      .locator("button")
      .click();

    // Now should be text type
    await expect(passwordInput).toHaveAttribute("type", "text");
  });
});
