import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface RouteContext {
  params: Promise<{ threadId: string }>;
}

/**
 * PUT /api/chat/threads/[threadId]/mode
 *
 * Toggle conversation between AI mode and human mode.
 * mode: "ai" -> status: "active", mode: "human" -> status: "pending"
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { threadId } = await context.params;
  const body = await request.json();
  const { mode } = body;

  if (!mode || !["ai", "human"].includes(mode)) {
    return NextResponse.json(
      { error: 'Invalid mode. Must be "ai" or "human".' },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const dbStatus = mode === "ai" ? "active" : "pending";

  const { data, error } = await supabase
    .from("conversations")
    .update({
      status: dbStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", threadId)
    .select("id, status")
    .single();

  if (error) {
    console.error("Failed to update conversation mode:", error);
    return NextResponse.json(
      { error: "Failed to update conversation mode" },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ id: data.id, status: data.status, mode });
}
