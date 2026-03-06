import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { lineClient } from "@/lib/line/client";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/broadcast/[id]/send
 *
 * Execute a broadcast: query target users by filter,
 * send via LINE Multicast API in batches of 500,
 * and log results to broadcast_logs.
 */
export async function POST(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = await context.params;
  const supabase = createAdminClient();

  // Fetch the broadcast job
  const { data: broadcast, error: fetchError } = await supabase
    .from("broadcasts")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !broadcast) {
    return NextResponse.json(
      { error: "Broadcast not found" },
      { status: 404 }
    );
  }

  if (broadcast.status === "sent" || broadcast.status === "sending") {
    return NextResponse.json(
      { error: `Broadcast already ${broadcast.status}` },
      { status: 400 }
    );
  }

  // Mark as sending
  await supabase
    .from("broadcasts")
    .update({ status: "sending", started_at: new Date().toISOString() })
    .eq("id", id);

  try {
    // Build target user query based on filter
    let userQuery = supabase
      .from("users")
      .select("line_uid")
      .eq("line_follow_status", "following")
      .not("line_uid", "is", null);

    const filter = broadcast.target_filter as Record<string, string> | null;

    if (filter) {
      if (filter.membership_tier) {
        userQuery = userQuery.eq("membership_tier", filter.membership_tier);
      }
      if (filter.tag) {
        userQuery = userQuery.contains("tags", [filter.tag]);
      }
    }

    const { data: users, error: userError } = await userQuery;

    if (userError) {
      throw new Error(`Failed to query target users: ${userError.message}`);
    }

    const lineUids = (users ?? [])
      .map((u) => u.line_uid)
      .filter((uid): uid is string => uid !== null);

    if (lineUids.length === 0) {
      await supabase
        .from("broadcasts")
        .update({
          status: "sent",
          completed_at: new Date().toISOString(),
          total_recipients: 0,
          success_count: 0,
          failure_count: 0,
        })
        .eq("id", id);

      return NextResponse.json({
        data: { broadcast_id: id, total: 0, sent: 0, failed: 0 },
      });
    }

    // Prepare message
    const messages: Array<{ type: "text"; text: string }> = [
      {
        type: "text",
        text: broadcast.message_text || "",
      },
    ];

    // Send in batches of 500 (LINE Multicast API limit)
    const BATCH_SIZE = 500;
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < lineUids.length; i += BATCH_SIZE) {
      const batch = lineUids.slice(i, i + BATCH_SIZE);

      try {
        await lineClient.multicast({
          to: batch,
          messages,
        });

        successCount += batch.length;

        // Log success for this batch
        await supabase.from("broadcast_logs").insert({
          broadcast_id: id,
          batch_index: Math.floor(i / BATCH_SIZE),
          recipient_count: batch.length,
          status: "success",
          sent_at: new Date().toISOString(),
        });
      } catch (batchError) {
        console.error(
          `Broadcast batch ${Math.floor(i / BATCH_SIZE)} failed:`,
          batchError
        );
        failureCount += batch.length;

        // Log failure for this batch
        await supabase.from("broadcast_logs").insert({
          broadcast_id: id,
          batch_index: Math.floor(i / BATCH_SIZE),
          recipient_count: batch.length,
          status: "failed",
          error_message:
            batchError instanceof Error
              ? batchError.message
              : "Unknown error",
          sent_at: new Date().toISOString(),
        });
      }
    }

    // Update broadcast status
    await supabase
      .from("broadcasts")
      .update({
        status: "sent",
        completed_at: new Date().toISOString(),
        total_recipients: lineUids.length,
        success_count: successCount,
        failure_count: failureCount,
      })
      .eq("id", id);

    return NextResponse.json({
      data: {
        broadcast_id: id,
        total: lineUids.length,
        sent: successCount,
        failed: failureCount,
      },
    });
  } catch (error) {
    console.error("Broadcast execution failed:", error);

    await supabase
      .from("broadcasts")
      .update({
        status: "failed",
        error_message:
          error instanceof Error ? error.message : "Unknown error",
        completed_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json(
      { error: "Broadcast execution failed" },
      { status: 500 }
    );
  }
}
