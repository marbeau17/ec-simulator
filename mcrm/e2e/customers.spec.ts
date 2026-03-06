import { test, expect } from "@playwright/test";
import { mockAuthenticatedSession } from "./helpers/mock-auth";

const mockCustomers = Array.from({ length: 15 }, (_, i) => ({
  id: `cust_${i + 1}`,
  lineName: [
    "田中太郎",
    "佐藤花子",
    "鈴木一郎",
    "山田美咲",
    "高橋健太",
    "渡辺優子",
    "伊藤翔",
    "中村美月",
    "小林大輝",
    "加藤さくら",
    "松本直樹",
    "井上真由美",
    "木村拓也",
    "林あかり",
    "斎藤隆",
  ][i],
  lineAvatar: undefined,
  tags: [
    ["常連", "VIP対象"],
    ["新規", "イベント参加"],
    ["常連", "誕生日月"],
    ["新規"],
    ["常連", "VIP対象", "イベント参加"],
  ][i % 5],
  membershipTier: ["VIP", "Gold", "Silver", "Regular"][i % 4],
  lastInteraction: new Date(
    Date.now() - 1000 * 60 * 60 * (i * 3 + 1)
  ).toISOString(),
  messageCount: (i + 1) * 7,
}));

test.describe("Customers page", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);

    // Mock customers API
    await page.route("**/api/customers", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ customers: mockCustomers }),
      })
    );
  });

  test("renders customer table with data", async ({ page }) => {
    await page.goto("/dashboard/customers");

    // Verify table headers
    await expect(page.getByRole("columnheader", { name: "顧客" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "タグ" })).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "会員ランク" })
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "最終応対" })
    ).toBeVisible();

    // Verify first customer is rendered
    await expect(page.getByText("田中太郎")).toBeVisible();

    // Verify pagination info (15 total, showing 10 per page)
    await expect(page.getByText(/15 件中/)).toBeVisible();
  });

  test("search filters customers by name", async ({ page }) => {
    await page.goto("/dashboard/customers");

    // Wait for table to load
    await expect(page.getByText("田中太郎")).toBeVisible();

    // Type in the search field
    const searchInput = page.getByPlaceholder("顧客名で検索...");
    await searchInput.fill("佐藤");

    // Verify filtered results - 佐藤花子 should be visible
    await expect(page.getByText("佐藤花子")).toBeVisible();

    // Other customers should not be visible
    await expect(page.getByText("田中太郎")).not.toBeVisible();

    // Pagination should reflect filtered count
    await expect(page.getByText(/1 件中/)).toBeVisible();
  });

  test("pagination controls work", async ({ page }) => {
    await page.goto("/dashboard/customers");

    // Wait for table to load
    await expect(page.getByText("田中太郎")).toBeVisible();

    // We have 15 customers, 10 per page, so 2 pages
    await expect(page.getByText("1 / 2")).toBeVisible();

    // Click next page button
    const nextButton = page.locator("button").filter({ has: page.locator("svg") }).last();
    // More reliable: find the pagination area and the next button within it
    const paginationArea = page.getByText(/件中/).locator("..");
    // The forward chevron button
    await page
      .getByRole("button")
      .filter({ has: page.locator('[class*="lucide-chevron-right"]') })
      .click();

    // Should show page 2
    await expect(page.getByText("2 / 2")).toBeVisible();

    // Page 2 should show the remaining customers
    await expect(page.getByText("松本直樹")).toBeVisible();
  });

  test("customer detail link navigates correctly", async ({ page }) => {
    await page.goto("/dashboard/customers");

    // Wait for table to load
    await expect(page.getByText("田中太郎")).toBeVisible();

    // Click the detail button for the first customer
    const firstDetailButton = page.getByRole("link", { name: "詳細" }).first();
    await expect(firstDetailButton).toBeVisible();

    // Verify href attribute points to customer detail page
    await expect(firstDetailButton).toHaveAttribute(
      "href",
      /\/dashboard\/customers\/cust_/
    );
  });
});
