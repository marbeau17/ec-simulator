import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/insights
 * List insights with optional filters.
 *
 * Query params:
 *  - insight_type: Filter by type (e.g., "daily_analysis", "weekly_report")
 *  - limit: Number of results (default: 20, max: 100)
 *  - offset: Pagination offset (default: 0)
 *  - is_pinned: Filter pinned insights ("true" or "false")
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const insightType = searchParams.get("insight_type");
    const isPinned = searchParams.get("is_pinned");
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 1),
      100
    );
    const offset = Math.max(
      parseInt(searchParams.get("offset") ?? "0", 10) || 0,
      0
    );

    const supabase = createAdminClient();

    let query = supabase
      .from("ec_insights")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (insightType) {
      query = query.eq("insight_type", insightType);
    }

    if (isPinned === "true") {
      query = query.eq("is_pinned", true);
    } else if (isPinned === "false") {
      query = query.eq("is_pinned", false);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error("[GET /api/insights] Query error:", error);
      return NextResponse.json(
        { error: "インサイトの取得に失敗しました", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      insights: data ?? [],
      total: count ?? 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("[GET /api/insights] Unhandled error:", error);
    return NextResponse.json(
      { error: "インサイトの取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
