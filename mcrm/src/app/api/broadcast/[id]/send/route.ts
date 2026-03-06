import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { lineClient } from "@/lib/line/client";
import type { messagingApi } from "@line/bot-sdk";

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
    .from("broadcast_jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !broadcast) {
    return NextResponse.json(
      { error: "Broadcast not found" },
      { status: 404 }
    );
  }

  if (broadcast.status === "completed" || broadcast.status === "sending") {
    return NextResponse.json(
      { error: `Broadcast already ${broadcast.status}` },
      { status: 400 }
    );
  }

  // Mark as sending
  await supabase
    .from("broadcast_jobs")
    .update({ status: "sending", started_at: new Date().toISOString() })
    .eq("id", id);

  try {
    // Build target user query based on filter
    let userQuery = supabase
      .from("users")
      .select("id, line_user_id")
      .eq("is_followed", true)
      .not("line_user_id", "is", null);

    const filter = broadcast.target_filter as Record<string, unknown> | null;

    if (filter) {
      if (filter.membership_tier) {
        userQuery = userQuery.eq(
          "membership_tier",
          filter.membership_tier as string
        );
      }
      if (filter.tags && Array.isArray(filter.tags)) {
        // Get user IDs that have any of the specified tags
        const { data: tagRows } = await supabase
          .from("tags")
          .select("id")
          .in("name", filter.tags as string[]);

        if (tagRows && tagRows.length > 0) {
          const tagIds = tagRows.map((t) => t.id);
          const { data: userTagRows } = await supabase
            .from("user_tags")
            .select("user_id")
            .in("tag_id", tagIds);

          if (userTagRows && userTagRows.length > 0) {
            const userIds = [...new Set(userTagRows.map((ut) => ut.user_id))];
            userQuery = userQuery.in("id", userIds);
          } else {
            // No users match the tag filter
            await supabase
              .from("broadcast_jobs")
              .update({
                status: "completed",
                completed_at: new Date().toISOString(),
                target_count: 0,
                sent_count: 0,
                failed_count: 0,
              })
              .eq("id", id);

            return NextResponse.json({
              data: { broadcast_id: id, total: 0, sent: 0, failed: 0 },
            });
          }
        }
      }
    }

    const { data: users, error: userError } = await userQuery;

    if (userError) {
      throw new Error(`Failed to query target users: ${userError.message}`);
    }

    const targetUsers = (users ?? []).filter(
      (u) => u.line_user_id !== null
    ) as Array<{ id: string; line_user_id: string }>;

    if (targetUsers.length === 0) {
      await supabase
        .from("broadcast_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          target_count: 0,
          sent_count: 0,
          failed_count: 0,
        })
        .eq("id", id);

      return NextResponse.json({
        data: { broadcast_id: id, total: 0, sent: 0, failed: 0 },
      });
    }

    // Prepare message from message_content
    const content = broadcast.message_content as Record<string, unknown>;
    let messages: messagingApi.Message[];

    if (broadcast.message_type === "flex" && content.flex) {
      messages = [
        {
          type: "flex",
          altText: (content.altText as string) || broadcast.title,
          contents: content.flex,
        } as messagingApi.FlexMessage,
      ];
    } else {
      messages = [
        {
          type: "text",
          text: (content.text as string) || "",
        },
      ];
    }

    // Send in batches of 500 (LINE Multicast API limit)
    const BATCH_SIZE = 500;
    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < targetUsers.length; i += BATCH_SIZE) {
      const batch = targetUsers.slice(i, i + BATCH_SIZE);
      const lineUids = batch.map((u) => u.line_user_id);

      try {
        await lineClient.multicast({
          to: lineUids,
          messages,
        });

        sentCount += batch.length;

        // Log success for each user in this batch
        const logEntries = batch.map((u) => ({
          broadcast_job_id: id,
          user_id: u.id,
          status: "sent" as const,
          sent_at: new Date().toISOString(),
        }));

        await supabase.from("broadcast_logs").insert(logEntries);
      } catch (batchError) {
        console.error(
          `Broadcast batch ${Math.floor(i / BATCH_SIZE)} failed:`,
          batchError
        );
        failedCount += batch.length;

        // Log failure for each user in this batch
        const logEntries = batch.map((u) => ({
          broadcast_job_id: id,
          user_id: u.id,
          status: "failed" as const,
          error_message:
            batchError instanceof Error
              ? batchError.message
              : "Unknown error",
          sent_at: new Date().toISOString(),
        }));

        await supabase.from("broadcast_logs").insert(logEntries);
      }
    }

    // Update broadcast job final status
    const finalStatus = sentCount === 0 ? "failed" : "completed";

    await supabase
      .from("broadcast_jobs")
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        target_count: targetUsers.length,
        sent_count: sentCount,
        failed_count: failedCount,
      })
      .eq("id", id);

    return NextResponse.json({
      data: {
        broadcast_id: id,
        total: targetUsers.length,
        sent: sentCount,
        failed: failedCount,
      },
    });
  } catch (error) {
    console.error("Broadcast execution failed:", error);

    await supabase
      .from("broadcast_jobs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json(
      { error: "Broadcast execution failed" },
      { status: 500 }
    );
  }
}
