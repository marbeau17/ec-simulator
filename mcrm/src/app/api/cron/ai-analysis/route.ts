import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateDailyAnalysis } from "@/lib/gemini/analyst";
import { checkRateLimit, recordUsage } from "@/lib/ai/rate-limiter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/ai-analysis
 * Daily AI analysis cron job.
 * Gathers key metrics and generates insights using Gemini Pro.
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

    // Determine the analysis period (today)
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const period = today.toISOString().split("T")[0];

    // Gather metrics from DB
    const [
      { count: customerCount },
      { count: messageCount },
      { count: reservationCount },
      { count: newFollowers },
    ] = await Promise.all([
      supabase
        .from("customers")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfDay.toISOString())
        .lte("created_at", endOfDay.toISOString()),
      supabase
        .from("reservations")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfDay.toISOString())
        .lte("created_at", endOfDay.toISOString()),
      supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfDay.toISOString())
        .lte("created_at", endOfDay.toISOString()),
    ]);

    // Generate analysis
    recordUsage("pro");
    const analysis = await generateDailyAnalysis({
      customerCount: customerCount ?? 0,
      messageCount: messageCount ?? 0,
      reservationCount: reservationCount ?? 0,
      newFollowers: newFollowers ?? 0,
      period,
    });

    // Save to ec_insights table
    const { error: insertError } = await supabase.from("ec_insights").insert({
      insight_type: "daily_analysis",
      period,
      data: analysis as unknown as Record<string, unknown>,
      summary: analysis.summary,
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error("[GET /api/cron/ai-analysis] Insert error:", insertError);
      return NextResponse.json(
        { error: "分析結果の保存に失敗しました", detail: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      period,
      summary: analysis.summary,
      insightsCount: analysis.insights.length,
      recommendationsCount: analysis.recommendations.length,
    });
  } catch (error) {
    console.error("[GET /api/cron/ai-analysis] Unhandled error:", error);
    return NextResponse.json(
      { error: "日次分析の実行中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
