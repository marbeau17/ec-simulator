import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushMessage } from "@/lib/line/client";

interface RouteContext {
  params: Promise<{ conversationId: string }>;
}

/**
 * GET /api/chat/[conversationId]
 *
 * Get messages for a conversation, ordered chronologically.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { conversationId } = await context.params;
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "50", 10))
  );
  const offset = (page - 1) * limit;

  const supabase = createAdminClient();

  // Verify conversation exists
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("id, user_id, status, channel, created_at")
    .eq("id", conversationId)
    .single();

  if (convError || !conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  // Fetch messages
  const { data: messages, error: msgError, count } = await supabase
    .from("messages")
    .select("*", { count: "exact" })
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (msgError) {
    console.error("Failed to fetch messages:", msgError);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    conversation,
    messages,
    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  });
}

/**
 * POST /api/chat/[conversationId]
 *
 * Admin sends a message to the user via LINE push API.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { conversationId } = await context.params;
  const body = await request.json();
  const { content, admin_id } = body;

  if (!content) {
    return NextResponse.json(
      { error: "Message content is required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Fetch conversation with user details
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("id, user_id, status, user:users(id, line_uid)")
    .eq("id", conversationId)
    .single();

  if (convError || !conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  const user = conversation.user as { id: string; line_uid: string | null } | null;

  if (!user?.line_uid) {
    return NextResponse.json(
      { error: "User does not have a LINE account linked" },
      { status: 400 }
    );
  }

  // Save admin message to messages table
  const { data: savedMessage, error: msgError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_type: "admin",
      sender_id: admin_id || null,
      content,
      channel: "line",
    })
    .select()
    .single();

  if (msgError) {
    console.error("Failed to save admin message:", msgError);
    return NextResponse.json(
      { error: "Failed to save message" },
      { status: 500 }
    );
  }

  // Send message to user via LINE push API
  try {
    await pushMessage(user.line_uid, [
      {
        type: "text",
        text: content,
      },
    ]);
  } catch (pushError) {
    console.error("Failed to send LINE push message:", pushError);
    return NextResponse.json(
      {
        error: "Message saved but failed to deliver via LINE",
        message: savedMessage,
      },
      { status: 502 }
    );
  }

  // Update conversation status if it was escalated (admin is now responding)
  if (conversation.status === "escalated") {
    await supabase
      .from("conversations")
      .update({
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);
  }

  return NextResponse.json({ data: savedMessage }, { status: 201 });
}
