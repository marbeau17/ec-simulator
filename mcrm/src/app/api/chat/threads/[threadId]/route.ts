import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface RouteContext {
  params: Promise<{ threadId: string }>;
}

/**
 * GET /api/chat/threads/[threadId]
 *
 * Get conversation detail with all messages and customer info.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { threadId } = await context.params;
  const supabase = createAdminClient();

  // Fetch conversation with user details and tags
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select(
      `
      id,
      user_id,
      status,
      assigned_admin_id,
      unread_count,
      created_at,
      updated_at,
      user:users!conversations_user_id_fkey (
        id,
        display_name,
        picture_url,
        membership_tier,
        is_followed,
        first_contacted_at,
        created_at
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

  // Fetch messages
  const { data: messages, error: msgError } = await supabase
    .from("messages")
    .select("id, sender_type, sender_id, content, message_type, created_at, metadata")
    .eq("conversation_id", threadId)
    .order("created_at", { ascending: true });

  if (msgError) {
    console.error("Failed to fetch messages:", msgError);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }

  // Fetch total message count for this user
  const user = conversation.user as {
    id: string;
    display_name: string;
    picture_url: string | null;
    membership_tier: string;
    is_followed: boolean;
    first_contacted_at: string | null;
    created_at: string;
  } | null;

  let totalMessages = 0;
  let userTags: string[] = [];

  if (user) {
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", threadId);

    totalMessages = count || 0;

    // Fetch user tags
    const { data: tagRows } = await supabase
      .from("user_tags")
      .select("tag:tags!user_tags_tag_id_fkey(name)")
      .eq("user_id", user.id);

    userTags = (tagRows || []).map((row) => {
      const tag = row.tag as { name: string } | null;
      return tag?.name || "";
    }).filter(Boolean);
  }

  // Map DB status to frontend status
  const statusMap: Record<string, "ai" | "human" | "closed"> = {
    active: "ai",
    pending: "human",
    resolved: "closed",
  };

  // Map messages to frontend format
  const mappedMessages = (messages || []).map((msg) => ({
    id: msg.id,
    sender: msg.sender_type === "bot" ? "ai" : msg.sender_type,
    content: msg.content || "",
    timestamp: msg.created_at,
  }));

  // Build response matching ThreadDetail interface
  const response = {
    id: conversation.id,
    customer: {
      id: user?.id || conversation.user_id,
      lineName: user?.display_name || "不明なユーザー",
      lineAvatar: user?.picture_url || undefined,
      membershipTier: formatMembershipTier(user?.membership_tier),
      tags: userTags,
      totalMessages,
      followedAt: user?.first_contacted_at || user?.created_at || conversation.created_at,
    },
    status: statusMap[conversation.status] || "ai",
    messages: mappedMessages,
  };

  return NextResponse.json(response);
}

function formatMembershipTier(tier?: string): string {
  const tierMap: Record<string, string> = {
    free: "一般",
    bronze: "ブロンズ",
    silver: "シルバー",
    gold: "ゴールド",
    platinum: "プラチナ",
  };
  return tierMap[tier || "free"] || "一般";
}
