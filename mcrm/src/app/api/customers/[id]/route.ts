import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/customers/[id]
 *
 * Get a single customer's detail with tags, recent conversations
 * (with messages), and reservation history.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = await context.params;
  const supabase = createAdminClient();

  // Fetch customer
  let customer: Record<string, unknown> | null = null;

  // Try RPC first for decrypted PII
  const { data: rpcData, error: rpcError } = await supabase
    .rpc("get_customer_with_pii", { customer_id: id })
    .single();

  if (!rpcError && rpcData) {
    customer = rpcData;
  } else {
    // Fallback to direct query
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
    customer = fallback;
  }

  // Fetch tags
  const { data: tags } = await supabase
    .from("user_tags")
    .select("tag_name")
    .eq("user_id", id);

  // Fetch recent conversations with their messages
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, status, channel, ai_summary, created_at, updated_at")
    .eq("user_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch messages from recent conversations
  let recentMessages: Array<{
    id: string;
    sender: string;
    content: string;
    timestamp: string;
  }> = [];

  if (conversations && conversations.length > 0) {
    const convIds = conversations.map((c) => c.id);
    const { data: messages } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_type, content, created_at")
      .in("conversation_id", convIds)
      .eq("message_type", "text")
      .order("created_at", { ascending: true })
      .limit(50);

    if (messages) {
      recentMessages = messages.map((m) => ({
        id: m.id,
        sender: m.sender_type,
        content: m.content || "",
        timestamp: m.created_at,
      }));
    }
  }

  // Fetch reservation history
  const { data: reservations } = await supabase
    .from("reservations")
    .select("id, status, purpose, created_at, slot:reservation_slots(slot_date, start_time, end_time, location)")
    .eq("user_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  // Count total messages
  let totalMessages = 0;
  if (conversations && conversations.length > 0) {
    const convIds = conversations.map((c) => c.id);
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", convIds);
    totalMessages = count ?? 0;
  }

  // Count total reservations
  const { count: totalReservations } = await supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", id);

  // Build recent activity from conversations and reservations
  const recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }> = [];

  if (conversations) {
    for (const conv of conversations.slice(0, 5)) {
      recentActivity.push({
        id: conv.id,
        type: "message",
        description: conv.ai_summary || `${conv.channel}チャット (${conv.status})`,
        timestamp: conv.updated_at || conv.created_at,
      });
    }
  }

  if (reservations) {
    for (const res of reservations.slice(0, 5)) {
      const slot = res.slot as Record<string, unknown> | null;
      const dateStr = slot?.slot_date || "";
      const timeStr = slot?.start_time ? String(slot.start_time).slice(0, 5) : "";
      recentActivity.push({
        id: res.id,
        type: "reservation",
        description: `予約${res.status === "confirmed" ? "確定" : res.status === "cancelled" ? "キャンセル" : res.status === "completed" ? "完了" : res.status} - ${dateStr} ${timeStr}${res.purpose ? ` ${res.purpose}` : ""}`,
        timestamp: res.created_at,
      });
    }
  }

  // Sort activity by timestamp descending
  recentActivity.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return NextResponse.json({
    data: {
      id: (customer as Record<string, unknown>).id,
      lineName: (customer as Record<string, unknown>).line_display_name || "Unknown",
      lineUid: (customer as Record<string, unknown>).line_uid || "",
      lineAvatar: undefined,
      membershipTier: (customer as Record<string, unknown>).membership_tier || "free",
      tags: tags?.map((t) => t.tag_name) ?? [],
      followedAt: (customer as Record<string, unknown>).created_at,
      lastInteraction:
        (customer as Record<string, unknown>).last_interaction_at ||
        (customer as Record<string, unknown>).updated_at ||
        (customer as Record<string, unknown>).created_at,
      totalMessages,
      totalReservations: totalReservations ?? 0,
      persona: {
        summary: (customer as Record<string, unknown>).ai_persona_summary || "まだ分析データがありません。",
        interests: [],
        communicationStyle: "",
      },
      conversations: recentMessages,
      recentActivity: recentActivity.slice(0, 10),
      // Also include raw data for any additional use
      raw: customer,
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
