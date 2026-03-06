import { test, expect } from "@playwright/test";
import { mockAuthenticatedSession } from "./helpers/mock-auth";

const mockThreads = [
  {
    id: "thread_1",
    customerName: "田中太郎",
    lastMessage: "はい、お願いします！",
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    unreadCount: 2,
    status: "ai",
  },
  {
    id: "thread_2",
    customerName: "佐藤花子",
    lastMessage: "メニューの写真を送っていただけますか？",
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    unreadCount: 1,
    status: "human",
  },
  {
    id: "thread_3",
    customerName: "鈴木一郎",
    lastMessage: "ありがとうございました。また来ます。",
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    unreadCount: 0,
    status: "closed",
  },
];

test.describe("Chat page", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);

    // Mock chat threads API
    await page.route("**/api/chat/threads", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ threads: mockThreads }),
      })
    );
  });

  test("renders thread list with status badges", async ({ page }) => {
    await page.goto("/dashboard/chat");

    // Verify threads are displayed
    await expect(page.getByText("田中太郎")).toBeVisible();
    await expect(page.getByText("佐藤花子")).toBeVisible();
    await expect(page.getByText("鈴木一郎")).toBeVisible();

    // Verify last messages are shown
    await expect(page.getByText("はい、お願いします！")).toBeVisible();

    // Verify status badges
    await expect(page.getByText("AI対応中").first()).toBeVisible();
    await expect(page.getByText("手動対応")).toBeVisible();
    await expect(page.getByText("終了")).toBeVisible();
  });

  test("search filters threads", async ({ page }) => {
    await page.goto("/dashboard/chat");

    // Wait for threads to render
    await expect(page.getByText("田中太郎")).toBeVisible();

    // Search for a specific customer
    const searchInput = page.getByPlaceholder("会話を検索...");
    await searchInput.fill("佐藤");

    // Only matching thread should be visible
    await expect(page.getByText("佐藤花子")).toBeVisible();
    await expect(page.getByText("田中太郎")).not.toBeVisible();
    await expect(page.getByText("鈴木一郎")).not.toBeVisible();
  });

  test("status filter buttons work", async ({ page }) => {
    await page.goto("/dashboard/chat");

    // Wait for threads to render
    await expect(page.getByText("田中太郎")).toBeVisible();

    // Click the "終了" filter button to show only closed threads
    await page
      .getByRole("button", { name: "終了" })
      .click();

    // Only closed thread should be visible
    await expect(page.getByText("鈴木一郎")).toBeVisible();
    await expect(page.getByText("田中太郎")).not.toBeVisible();
    await expect(page.getByText("佐藤花子")).not.toBeVisible();

    // Click "すべて" to reset filter
    await page
      .getByRole("button", { name: "すべて" })
      .click();

    // All threads should be visible again
    await expect(page.getByText("田中太郎")).toBeVisible();
    await expect(page.getByText("佐藤花子")).toBeVisible();
    await expect(page.getByText("鈴木一郎")).toBeVisible();
  });

  test("thread links navigate to individual chat", async ({ page }) => {
    await page.goto("/dashboard/chat");

    // Verify thread links have correct href
    const firstThread = page.getByRole("link").filter({ hasText: "田中太郎" });
    await expect(firstThread).toHaveAttribute(
      "href",
      "/dashboard/chat/thread_1"
    );
  });

  test("shows empty state when no threads match", async ({ page }) => {
    await page.goto("/dashboard/chat");

    // Wait for threads to render
    await expect(page.getByText("田中太郎")).toBeVisible();

    // Search for something that doesn't exist
    const searchInput = page.getByPlaceholder("会話を検索...");
    await searchInput.fill("存在しない名前");

    // Empty state message should appear
    await expect(page.getByText("会話が見つかりません")).toBeVisible();
  });
});
