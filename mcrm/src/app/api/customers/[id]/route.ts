import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/customers/[id]
 *
 * Get a single customer's detail with decrypted PII (via RPC),
 * tags, and recent conversations.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = await context.params;
  const supabase = createAdminClient();

  // Fetch customer with decrypted PII via RPC
  const { data: customer, error: customerError } = await supabase
    .rpc("get_customer_with_pii", { customer_id: id })
    .single();

  if (customerError) {
    // Fallback to direct query if RPC doesn't exist
    const { data: fallback, error: fallbackError } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (fallbackError || !fallback) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Fetch tags separately
    const { data: tags } = await supabase
      .from("user_tags")
      .select("tag:tags(id, name, color)")
      .eq("user_id", id);

    // Fetch recent conversations
    const { data: conversations } = await supabase
      .from("conversations")
      .select("id, status, channel, created_at, updated_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      data: {
        ...fallback,
        tags: tags?.map((t) => t.tag) ?? [],
        recent_conversations: conversations ?? [],
      },
    });
  }

  // Fetch tags
  const { data: tags } = await supabase
    .from("user_tags")
    .select("tag:tags(id, name, color)")
    .eq("user_id", id);

  // Fetch recent conversations
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, status, channel, created_at, updated_at")
    .eq("user_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    data: {
      ...customer,
      tags: tags?.map((t) => t.tag) ?? [],
      recent_conversations: conversations ?? [],
    },
  });
}

/**
 * PUT /api/customers/[id]
 *
 * Update customer fields.
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = await context.params;
  const body = await request.json();
  const supabase = createAdminClient();

  // Allowed fields for update
  const allowedFields = [
    "full_name",
    "email",
    "phone",
    "line_display_name",
    "membership_tier",
    "line_follow_status",
    "notes",
    "tags",
    "date_of_birth",
    "gender",
    "address",
  ];

  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Failed to update customer:", error);
    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Customer not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ data });
}
