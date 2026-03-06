import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const now = new Date();

    // Current month boundaries
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

    // Today boundaries
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    // ---------- KPI: Total customers ----------
    const { count: totalCustomers } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    // Customers created before this month (to calculate change)
    const { count: customersLastMonth } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .lt("created_at", currentMonthStart);

    const newCustomersThisMonth = (totalCustomers ?? 0) - (customersLastMonth ?? 0);
    const customerChange =
      customersLastMonth && customersLastMonth > 0
        ? Math.round((newCustomersThisMonth / customersLastMonth) * 1000) / 10
        : 0;

    // ---------- KPI: Monthly messages ----------
    const { count: monthlyMessages } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .gte("created_at", currentMonthStart);

    const { count: previousMonthMessages } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .gte("created_at", previousMonthStart)
      .lte("created_at", previousMonthEnd);

    const messageChange =
      previousMonthMessages && previousMonthMessages > 0
        ? Math.round(
            (((monthlyMessages ?? 0) - previousMonthMessages) / previousMonthMessages) * 1000
          ) / 10
        : 0;

    // ---------- KPI: Reservations this month ----------
    const { count: reservationsThisMonth } = await supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .gte("created_at", currentMonthStart);

    const { count: previousMonthReservations } = await supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .gte("created_at", previousMonthStart)
      .lte("created_at", previousMonthEnd);

    const reservationChange =
      previousMonthReservations && previousMonthReservations > 0
        ? Math.round(
            (((reservationsThisMonth ?? 0) - previousMonthReservations) /
              previousMonthReservations) *
              1000
          ) / 10
        : 0;

    // ---------- KPI: Active events ----------
    const { count: activeEvents } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("is_published", true)
      .gte("end_at", now.toISOString());

    // Events that were active last month
    const { count: previousActiveEvents } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("is_published", true)
      .gte("end_at", previousMonthStart)
      .lt("start_at", currentMonthStart);

    const eventChange =
      previousActiveEvents && previousActiveEvents > 0
        ? Math.round(
            (((activeEvents ?? 0) - previousActiveEvents) / previousActiveEvents) * 1000
          ) / 10
        : 0;

    // ---------- AI Insights (from ec_insights table) ----------
    const { data: insightsRaw } = await supabase
      .from("ec_insights")
      .select("id, title, body, insight_type, is_read, created_at")
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(3);

    const insights = (insightsRaw ?? []).map((i) => ({
      id: i.id,
      title: i.title,
      summary: i.body ?? "",
      priority: i.insight_type === "alert" ? "high" : i.insight_type === "warning" ? "medium" : "low",
      createdAt: i.created_at,
    }));

    // ---------- Customer growth (past 6 months) ----------
    const monthLabels: string[] = [];
    const customerGrowth: Array<{ month: string; count: number }> = [];

    for (let m = 5; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m + 1, 0); // last day of that month
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
      const label = `${d.getMonth() + 1}月`;
      monthLabels.push(label);

      const { count } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .lte("created_at", endOfMonth);

      customerGrowth.push({ month: label, count: count ?? 0 });
    }

    // ---------- Message volume (past 7 days) ----------
    const dayLabels = ["日", "月", "火", "水", "木", "金", "土"];
    const messageVolume: Array<{ date: string; count: number }> = [];

    for (let d = 6; d >= 0; d--) {
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d);
      const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d, 23, 59, 59);
      const label = dayLabels[dayStart.getDay()];

      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .gte("created_at", dayStart.toISOString())
        .lte("created_at", dayEnd.toISOString());

      messageVolume.push({ date: label, count: count ?? 0 });
    }

    // ---------- Recent activity (from messages + users) ----------
    const { data: recentMessages } = await supabase
      .from("messages")
      .select("id, sender_type, content, created_at, conversation_id")
      .order("created_at", { ascending: false })
      .limit(10);

    // Collect conversation IDs to look up user names
    const conversationIds = [
      ...new Set((recentMessages ?? []).map((m) => m.conversation_id)),
    ];

    let conversationUserMap: Record<string, { display_name: string; picture_url: string | null }> = {};
    if (conversationIds.length > 0) {
      const { data: convos } = await supabase
        .from("conversations")
        .select("id, user_id")
        .in("id", conversationIds);

      const userIds = [...new Set((convos ?? []).map((c) => c.user_id))];
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from("users")
          .select("id, display_name, picture_url")
          .in("id", userIds);

        const userMap: Record<string, { display_name: string; picture_url: string | null }> = {};
        for (const u of usersData ?? []) {
          userMap[u.id] = { display_name: u.display_name, picture_url: u.picture_url };
        }

        for (const c of convos ?? []) {
          conversationUserMap[c.id] = userMap[c.user_id] ?? {
            display_name: "不明",
            picture_url: null,
          };
        }
      }
    }

    const recentActivity = (recentMessages ?? []).slice(0, 5).map((m) => {
      const user = conversationUserMap[m.conversation_id] ?? {
        display_name: "不明",
        picture_url: null,
      };
      return {
        id: m.id,
        type: m.sender_type === "bot" ? "message" : m.sender_type === "user" ? "message" : "message",
        description:
          m.sender_type === "bot"
            ? "AI自動応答で対応しました"
            : m.sender_type === "admin"
              ? "管理者がメッセージを送信しました"
              : "メッセージを送信しました",
        timestamp: m.created_at,
        customerName: user.display_name,
        customerAvatar: user.picture_url ?? undefined,
      };
    });

    return NextResponse.json({
      kpi: {
        totalCustomers: totalCustomers ?? 0,
        customerChange,
        monthlyMessages: monthlyMessages ?? 0,
        messageChange,
        reservationsThisMonth: reservationsThisMonth ?? 0,
        reservationChange,
        activeEvents: activeEvents ?? 0,
        eventChange,
      },
      insights,
      customerGrowth,
      messageVolume,
      recentActivity,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
