import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateWeeklyReport } from "@/lib/gemini/analyst";
import { checkRateLimit, recordUsage } from "@/lib/ai/rate-limiter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/ai-weekly-report
 * Weekly AI report cron job.
 * Gathers weekly metrics and generates a detailed report using Gemini Pro.
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate with CRON_SECRET
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit check for pro model
    const rateCheck = checkRateLimit("pro");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterMs: rateCheck.retryAfterMs },
        { status: 429 }
      );
    }

    const supabase = createAdminClient();

    // Determine the analysis period (past 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const period = `${startDate.toISOString().split("T")[0]} ~ ${endDate.toISOString().split("T")[0]}`;

    // Gather weekly metrics

    // Sales / customer metrics
    const [
      { count: totalCustomers },
      { count: newCustomers },
      { count: totalMessages },
      { count: totalReservations },
    ] = await Promise.all([
      supabase.from("customers").select("*", { count: "exact", head: true }),
      supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startDate.toISOString()),
      supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startDate.toISOString()),
      supabase
        .from("reservations")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startDate.toISOString()),
    ]);

    const salesMetrics = {
      totalCustomers: totalCustomers ?? 0,
      newCustomers: newCustomers ?? 0,
      totalMessages: totalMessages ?? 0,
      totalReservations: totalReservations ?? 0,
    };

    // Segment data - count customers by membership tier
    const { data: segmentRows } = await supabase
      .from("customers")
      .select("membership_tier");

    const segmentData: Record<string, number> = {};
    for (const row of segmentRows ?? []) {
      const tier = (row.membership_tier as string) ?? "未設定";
      segmentData[tier] = (segmentData[tier] ?? 0) + 1;
    }

    // Broadcast results
    const { data: broadcasts } = await supabase
      .from("broadcasts")
      .select("id, title, sent_count, read_count, click_count")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false })
      .limit(10);

    const broadcastResults = {
      totalBroadcasts: broadcasts?.length ?? 0,
      broadcasts: (broadcasts ?? []).map((b) => ({
        title: b.title,
        sentCount: b.sent_count ?? 0,
        readCount: b.read_count ?? 0,
        clickCount: b.click_count ?? 0,
      })),
    };

    // Generate weekly report
    recordUsage("pro");
    const report = await generateWeeklyReport({
      salesMetrics,
      segmentData,
      broadcastResults,
      period,
    });

    // Save to ec_insights table
    const { error: insertError } = await supabase.from("ec_insights").insert({
      insight_type: "weekly_report",
      period,
      data: report as unknown as Record<string, unknown>,
      summary: report.summary,
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error("[GET /api/cron/ai-weekly-report] Insert error:", insertError);
      return NextResponse.json(
        { error: "レポートの保存に失敗しました", detail: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      period,
      summary: report.summary,
      highlightsCount:
        report.highlights.positive.length + report.highlights.negative.length,
      insightsCount: report.insights.length,
      recommendationsCount: report.recommendations.length,
      nextWeekActionsCount: report.nextWeekActions.length,
    });
  } catch (error) {
    console.error("[GET /api/cron/ai-weekly-report] Unhandled error:", error);
    return NextResponse.json(
      { error: "週次レポートの実行中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
