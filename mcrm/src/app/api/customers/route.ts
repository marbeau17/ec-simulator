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

  // If filtering by tag, we need to get user IDs first
  let tagFilteredUserIds: string[] | null = null;
  if (tag) {
    const { data: tagRows, error: tagError } = await supabase
      .from("user_tags")
      .select("user_id")
      .eq("tag_name", tag);

    if (tagError) {
      console.error("Failed to filter by tag:", tagError);
      return NextResponse.json(
        { error: "Failed to filter by tag" },
        { status: 500 }
      );
    }

    tagFilteredUserIds = tagRows?.map((r) => r.user_id) ?? [];
    if (tagFilteredUserIds.length === 0) {
      // No users match this tag, return empty result
      return NextResponse.json({
        customers: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      });
    }
  }

  let query = supabase
    .from("users")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Search by display name (PII fields are encrypted so we can only search line_display_name)
  if (search) {
    query = query.ilike("line_display_name", `%${search}%`);
  }

  // Filter by membership tier
  if (membershipTier) {
    query = query.eq("membership_tier", membershipTier);
  }

  // Filter by LINE follow status
  if (lineFollowStatus) {
    query = query.eq("line_follow_status", lineFollowStatus);
  }

  // Filter by tag (using pre-fetched user IDs)
  if (tagFilteredUserIds) {
    query = query.in("id", tagFilteredUserIds);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Failed to list customers:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }

  // Fetch tags for all returned users
  const userIds = data?.map((u) => u.id) ?? [];
  let userTagsMap: Record<string, string[]> = {};
  if (userIds.length > 0) {
    const { data: tagRows } = await supabase
      .from("user_tags")
      .select("user_id, tag_name")
      .in("user_id", userIds);

    if (tagRows) {
      for (const row of tagRows) {
        if (!userTagsMap[row.user_id]) {
          userTagsMap[row.user_id] = [];
        }
        userTagsMap[row.user_id].push(row.tag_name);
      }
    }
  }

  // Fetch message counts per user from conversations
  let messageCountMap: Record<string, number> = {};
  if (userIds.length > 0) {
    const { data: convRows } = await supabase
      .from("conversations")
      .select("user_id")
      .in("user_id", userIds);

    if (convRows) {
      for (const row of convRows) {
        messageCountMap[row.user_id] = (messageCountMap[row.user_id] || 0) + 1;
      }
    }
  }

  // Map to frontend-expected shape
  const customers = (data ?? []).map((user) => ({
    id: user.id,
    lineName: user.line_display_name || "Unknown",
    lineAvatar: undefined,
    tags: userTagsMap[user.id] ?? [],
    membershipTier: user.membership_tier ?? "free",
    lastInteraction: user.last_interaction_at || user.updated_at || user.created_at,
    messageCount: messageCountMap[user.id] ?? 0,
  }));

  // Collect all distinct tags for filter dropdown
  const allTags = new Set<string>();
  if (userIds.length > 0) {
    const { data: allTagRows } = await supabase
      .from("user_tags")
      .select("tag_name")
      .limit(200);
    if (allTagRows) {
      for (const row of allTagRows) {
        allTags.add(row.tag_name);
      }
    }
  }

  return NextResponse.json({
    customers,
    allTags: Array.from(allTags),
    allMembershipTiers: ["free", "light", "standard", "premium"],
    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  });
}
