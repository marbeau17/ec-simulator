import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/chat/threads
 *
 * List conversations with latest message and user info.
 * Query params:
 *   - status: "ai" | "human" | "closed" | "all" (default "all")
 *   - search: search term for customer name or message content
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const statusFilter = searchParams.get("status") || "all";
  const search = searchParams.get("search") || "";

  const supabase = createAdminClient();

  // Map frontend status to DB status
  // Frontend: ai = active (bot handling), human = pending (admin handling), closed = resolved
  let query = supabase
    .from("conversations")
    .select(
      `
      id,
      user_id,
      status,
      assigned_admin_id,
      last_message_at,
      last_message_preview,
      unread_count,
      created_at,
      updated_at,
      user:users!conversations_user_id_fkey (
        id,
        display_name,
        picture_url,
        membership_tier
      )
    `
    )
    .order("last_message_at", { ascending: false, nullsFirst: false });

  // Apply status filter
  if (statusFilter !== "all") {
    const dbStatus = mapFrontendStatusToDb(statusFilter);
    if (dbStatus) {
      query = query.eq("status", dbStatus);
    }
  }

  const { data: conversations, error } = await query;

  if (error) {
    console.error("Failed to fetch conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }

  // Map to frontend format
  const threads = (conversations || [])
    .filter((conv) => {
      if (!search) return true;
      const user = conv.user as { display_name: string } | null;
      const nameMatch = user?.display_name?.includes(search);
      const messageMatch = conv.last_message_preview?.includes(search);
      return nameMatch || messageMatch;
    })
    .map((conv) => {
      const user = conv.user as {
        id: string;
        display_name: string;
        picture_url: string | null;
        membership_tier: string;
      } | null;

      return {
        id: conv.id,
        customerName: user?.display_name || "不明なユーザー",
        customerAvatar: user?.picture_url || undefined,
        lastMessage: conv.last_message_preview || "",
        lastMessageAt: conv.last_message_at || conv.created_at,
        unreadCount: conv.unread_count || 0,
        status: mapDbStatusToFrontend(conv.status),
      };
    });

  return NextResponse.json({ threads });
}

function mapFrontendStatusToDb(
  frontendStatus: string
): "active" | "pending" | "resolved" | null {
  switch (frontendStatus) {
    case "ai":
      return "active";
    case "human":
      return "pending";
    case "closed":
      return "resolved";
    default:
      return null;
  }
}

function mapDbStatusToFrontend(dbStatus: string): "ai" | "human" | "closed" {
  switch (dbStatus) {
    case "active":
      return "ai";
    case "pending":
      return "human";
    case "resolved":
      return "closed";
    default:
      return "ai";
  }
}
