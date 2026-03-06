import { test, expect } from "@playwright/test";
import { mockAuthenticatedSession } from "./helpers/mock-auth";

const mockDashboardData = {
  kpi: {
    totalCustomers: 1234,
    customerChange: 5.2,
    monthlyMessages: 8765,
    messageChange: 12.1,
    reservationsThisMonth: 345,
    reservationChange: -2.3,
    activeEvents: 8,
    eventChange: 0,
  },
  insights: [
    {
      id: "ins_1",
      title: "来店頻度の変化",
      summary: "VIP顧客の来店頻度が先月比で15%増加しています。",
      priority: "high",
      createdAt: new Date().toISOString(),
    },
    {
      id: "ins_2",
      title: "新規フォロワー増加",
      summary: "LINE友だち登録が今週急増しています。",
      priority: "medium",
      createdAt: new Date().toISOString(),
    },
    {
      id: "ins_3",
      title: "予約キャンセル率",
      summary: "キャンセル率は安定して低い水準を維持しています。",
      priority: "low",
      createdAt: new Date().toISOString(),
    },
  ],
  customerGrowth: [
    { month: "8月", count: 980 },
    { month: "9月", count: 1050 },
    { month: "10月", count: 1120 },
    { month: "11月", count: 1180 },
    { month: "12月", count: 1210 },
    { month: "1月", count: 1234 },
  ],
  messageVolume: [
    { date: "月", count: 120 },
    { date: "火", count: 145 },
    { date: "水", count: 98 },
    { date: "木", count: 167 },
    { date: "金", count: 210 },
  ],
  recentActivity: [
    {
      id: "act_1",
      type: "follow",
      description: "LINE友だち追加",
      timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      customerName: "田中太郎",
    },
    {
      id: "act_2",
      type: "message",
      description: "チャットメッセージを送信",
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      customerName: "佐藤花子",
    },
  ],
};

test.describe("Dashboard page", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);

    // Mock the dashboard API
    await page.route("**/api/dashboard", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDashboardData),
      })
    );
  });

  test("renders KPI cards with data", async ({ page }) => {
    await page.goto("/dashboard");

    // Verify all 4 KPI card titles are visible
    await expect(page.getByText("総顧客数")).toBeVisible();
    await expect(page.getByText("月間メッセージ")).toBeVisible();
    await expect(page.getByText("今月の予約")).toBeVisible();
    await expect(page.getByText("アクティブイベント")).toBeVisible();

    // Verify KPI values rendered
    await expect(page.getByText("1,234")).toBeVisible();
    await expect(page.getByText("8,765")).toBeVisible();
    await expect(page.getByText("345")).toBeVisible();
  });

  test("renders AI insights section", async ({ page }) => {
    await page.goto("/dashboard");

    // Verify the AI insights heading
    await expect(page.getByText("AI インサイト")).toBeVisible();

    // Verify individual insight cards
    await expect(page.getByText("来店頻度の変化")).toBeVisible();
    await expect(page.getByText("新規フォロワー増加")).toBeVisible();
    await expect(page.getByText("予約キャンセル率")).toBeVisible();

    // Verify priority badges
    await expect(page.getByText("重要")).toBeVisible();
  });

  test("renders recent activity feed", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByText("最近のアクティビティ")).toBeVisible();
    await expect(page.getByText("田中太郎")).toBeVisible();
    await expect(page.getByText("佐藤花子")).toBeVisible();
  });

  test("sidebar navigation links are functional", async ({ page }) => {
    await page.goto("/dashboard");

    // Verify sidebar navigation items are present
    const sidebar = page.locator("aside");
    await expect(sidebar.getByText("ダッシュボード")).toBeVisible();
    await expect(sidebar.getByText("顧客管理")).toBeVisible();
    await expect(sidebar.getByText("チャット")).toBeVisible();
    await expect(sidebar.getByText("メッセージ配信")).toBeVisible();
    await expect(sidebar.getByText("イベント")).toBeVisible();
    await expect(sidebar.getByText("予約管理")).toBeVisible();
    await expect(sidebar.getByText("分析")).toBeVisible();
    await expect(sidebar.getByText("設定")).toBeVisible();

    // Click on customers link and verify navigation
    await sidebar.getByText("顧客管理").click();
    await page.waitForURL("**/dashboard/customers");
    await expect(page).toHaveURL(/\/dashboard\/customers/);
  });
});
