import { Page } from "@playwright/test";

/**
 * Mock the authentication endpoints so that protected pages render
 * without requiring a real Supabase session.
 *
 * Call this BEFORE navigating to any /dashboard route.
 */
export async function mockAuthenticatedSession(page: Page) {
  // Mock GET /api/auth/me to return a valid admin user
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "test-admin-id",
          auth_user_id: "test-auth-id",
          display_name: "テスト管理者",
          email: "admin@example.com",
          role: "admin",
          is_active: true,
          created_at: new Date().toISOString(),
          last_login_at: new Date().toISOString(),
        },
      }),
    })
  );
}

/**
 * Mock the login endpoint to return a successful response.
 */
export async function mockLoginSuccess(page: Page) {
  await page.route("**/api/auth/login", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "test-admin-id",
          auth_user_id: "test-auth-id",
          display_name: "テスト管理者",
          email: "admin@example.com",
          role: "admin",
          is_active: true,
        },
      }),
    })
  );
}

/**
 * Mock the login endpoint to return an authentication error.
 */
export async function mockLoginFailure(page: Page) {
  await page.route("**/api/auth/login", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        error: "メールアドレスまたはパスワードが正しくありません。",
      }),
    })
  );
}
