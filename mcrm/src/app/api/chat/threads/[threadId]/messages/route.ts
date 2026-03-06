import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushMessage } from "@/lib/line/client";

interface RouteContext {
  params: Promise<{ threadId: string }>;
}

/**
 * POST /api/chat/threads/[threadId]/messages
 *
 * Admin sends a reply message. Saves to DB and pushes to LINE.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { threadId } = await context.params;
  const body = await request.json();
  const { content } = body;

  if (!content || typeof content !== "string" || !content.trim()) {
    return NextResponse.json(
      { error: "Message content is required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Fetch conversation with user's LINE UID
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select(
      `
      id,
      user_id,
      status,
      user:users!conversations_user_id_fkey (
        id,
        line_user_id
      )
    `
    )
    .eq("id", threadId)
    .single();

  if (convError || !conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  // Save admin message to messages table
  const { data: savedMessage, error: msgError } = await supabase
    .from("messages")
    .insert({
      conversation_id: threadId,
      sender_type: "admin" as const,
      sender_id: null,
      content: content.trim(),
      message_type: "text" as const,
      line_message_id: null,
      metadata: null,
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

  // Update conversation's last message fields
  await supabase
    .from("conversations")
    .update({
      last_message_at: savedMessage.created_at,
      last_message_preview: content.trim().slice(0, 100),
      updated_at: new Date().toISOString(),
    })
    .eq("id", threadId);

  // Send message to user via LINE push API
  const user = conversation.user as { id: string; line_user_id: string | null } | null;

  if (user?.line_user_id) {
    try {
      await pushMessage(user.line_user_id, [
        { type: "text", text: content.trim() },
      ]);
    } catch (pushError) {
      console.error("Failed to send LINE push message:", pushError);
      // Return success with warning - message is saved even if LINE push fails
      return NextResponse.json(
        {
          message: savedMessage,
          warning: "Message saved but failed to deliver via LINE",
        },
        { status: 201 }
      );
    }
  }

  return NextResponse.json({ message: savedMessage }, { status: 201 });
}
