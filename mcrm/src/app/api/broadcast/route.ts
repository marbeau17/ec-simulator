import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/broadcast
 *
 * List broadcast jobs with pagination, optional status filter,
 * and delivery stats from broadcast_logs.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
  );
  const offset = (page - 1) * limit;
  const statusFilter = searchParams.get("status");

  const supabase = createAdminClient();

  let query = supabase
    .from("broadcast_jobs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data, error, count } = await query.range(
    offset,
    offset + limit - 1
  );

  if (error) {
    console.error("Failed to list broadcast jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch broadcast jobs" },
      { status: 500 }
    );
  }

  // Fetch delivery stats from broadcast_logs for each job
  const jobIds = (data ?? []).map((job) => job.id);
  let logStats: Record<string, { sent: number; failed: number }> = {};

  if (jobIds.length > 0) {
    const { data: logs } = await supabase
      .from("broadcast_logs")
      .select("broadcast_job_id, status")
      .in("broadcast_job_id", jobIds);

    if (logs) {
      for (const log of logs) {
        if (!logStats[log.broadcast_job_id]) {
          logStats[log.broadcast_job_id] = { sent: 0, failed: 0 };
        }
        if (log.status === "sent") {
          logStats[log.broadcast_job_id].sent += 1;
        } else if (log.status === "failed") {
          logStats[log.broadcast_job_id].failed += 1;
        }
      }
    }
  }

  const broadcasts = (data ?? []).map((job) => {
    const stats = logStats[job.id] || { sent: 0, failed: 0 };
    return {
      ...job,
      delivery_stats: {
        sent: stats.sent,
        failed: stats.failed,
        total: stats.sent + stats.failed,
      },
    };
  });

  return NextResponse.json({
    broadcasts,
    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  });
}

/**
 * POST /api/broadcast
 *
 * Create a new broadcast job in draft status.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();
  const supabase = createAdminClient();

  const {
    title,
    message_type,
    message_content,
    target_filter,
    scheduled_at,
  } = body;

  if (!title) {
    return NextResponse.json(
      { error: "Title is required" },
      { status: 400 }
    );
  }

  if (!message_content) {
    return NextResponse.json(
      { error: "Message content is required" },
      { status: 400 }
    );
  }

  // Validate target_filter if provided
  if (target_filter && typeof target_filter !== "object") {
    return NextResponse.json(
      { error: "target_filter must be a JSON object" },
      { status: 400 }
    );
  }

  const validTypes = ["text", "flex", "template", "imagemap"];
  const resolvedType = message_type && validTypes.includes(message_type) ? message_type : "text";

  // Count target users based on filter
  let targetCount = 0;
  try {
    let countQuery = supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("is_followed", true);

    if (target_filter) {
      if (target_filter.membership_tier) {
        countQuery = countQuery.eq(
          "membership_tier",
          target_filter.membership_tier
        );
      }
      if (target_filter.tags && Array.isArray(target_filter.tags)) {
        // Filter users who have any of the specified tags via user_tags join
        // For simplicity, we'll get an approximate count
        const { data: tagRows } = await supabase
          .from("tags")
          .select("id")
          .in("name", target_filter.tags);

        if (tagRows && tagRows.length > 0) {
          const tagIds = tagRows.map((t) => t.id);
          const { data: userTagRows } = await supabase
            .from("user_tags")
            .select("user_id")
            .in("tag_id", tagIds);

          if (userTagRows && userTagRows.length > 0) {
            const userIds = [...new Set(userTagRows.map((ut) => ut.user_id))];
            countQuery = countQuery.in("id", userIds);
          } else {
            targetCount = 0;
          }
        }
      }
    }

    const { count: userCount } = await countQuery;
    targetCount = userCount ?? 0;
  } catch (e) {
    console.error("Failed to count target users:", e);
    // Non-fatal: proceed with 0
  }

  const { data, error } = await supabase
    .from("broadcast_jobs")
    .insert({
      title,
      message_type: resolvedType,
      message_content:
        typeof message_content === "string"
          ? { text: message_content }
          : message_content,
      target_filter: target_filter || {},
      target_count: targetCount,
      status: scheduled_at ? "scheduled" : "draft",
      scheduled_at: scheduled_at || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create broadcast job:", error);
    return NextResponse.json(
      { error: "Failed to create broadcast job" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
