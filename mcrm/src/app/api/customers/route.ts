import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/customers
 *
 * List customers with pagination, search, and filtering.
 * Query params: page, limit, search, membership_tier, line_follow_status, tag
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
  );
  const search = searchParams.get("search") || "";
  const membershipTier = searchParams.get("membership_tier") || "";
  const lineFollowStatus = searchParams.get("line_follow_status") || "";
  const tag = searchParams.get("tag") || "";

  const offset = (page - 1) * limit;
  const supabase = createAdminClient();

  let query = supabase
    .from("users")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Search by name or tag
  if (search) {
    query = query.or(
      `line_display_name.ilike.%${search}%,full_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  // Filter by membership tier
  if (membershipTier) {
    query = query.eq("membership_tier", membershipTier);
  }

  // Filter by LINE follow status
  if (lineFollowStatus) {
    query = query.eq("line_follow_status", lineFollowStatus);
  }

  // Filter by tag (using contains for JSONB array or joined tags table)
  if (tag) {
    query = query.contains("tags", [tag]);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Failed to list customers:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  });
}
