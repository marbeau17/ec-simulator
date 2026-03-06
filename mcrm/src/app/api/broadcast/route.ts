import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/broadcast
 *
 * List broadcast jobs with pagination.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
  );
  const offset = (page - 1) * limit;

  const supabase = createAdminClient();

  const { data, error, count } = await supabase
    .from("broadcasts")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Failed to list broadcasts:", error);
    return NextResponse.json(
      { error: "Failed to fetch broadcasts" },
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
    message_text,
    message_template,
    target_filter,
    scheduled_at,
  } = body;

  if (!title || (!message_text && !message_template)) {
    return NextResponse.json(
      { error: "Title and message content are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("broadcasts")
    .insert({
      title,
      message_text: message_text || null,
      message_template: message_template || null,
      target_filter: target_filter || null,
      scheduled_at: scheduled_at || null,
      status: "draft",
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create broadcast:", error);
    return NextResponse.json(
      { error: "Failed to create broadcast" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
