import type { FollowEvent } from "@/lib/line/webhook";
import { getProfile, replyMessage } from "@/lib/line/client";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Handle LINE follow event.
 * Creates or updates the user in Supabase when they add/re-add the bot.
 */
export async function handleFollow(event: FollowEvent): Promise<void> {
  const userId = event.source.userId;
  if (!userId) {
    console.error("Follow event missing userId");
    return;
  }

  const supabase = createAdminClient();

  // Fetch the user's LINE profile
  let displayName = "Unknown";
  let pictureUrl: string | null = null;
  let statusMessage: string | null = null;

  try {
    const profile = await getProfile(userId);
    displayName = profile.displayName;
    pictureUrl = profile.pictureUrl ?? null;
    statusMessage = profile.statusMessage ?? null;
  } catch (error) {
    console.error("Failed to fetch LINE profile:", error);
  }

  // Upsert user into the users table
  const { error } = await supabase.from("users").upsert(
    {
      line_uid: userId,
      line_display_name: displayName,
      line_picture_url: pictureUrl,
      line_status_message: statusMessage,
      line_follow_status: "following",
      last_interaction_at: new Date().toISOString(),
    },
    {
      onConflict: "line_uid",
    }
  );

  if (error) {
    console.error("Failed to upsert user:", error);
    return;
  }

  // Send a welcome message
  try {
    await replyMessage(event.replyToken, [
      {
        type: "text",
        text: "Thank you for following us! How can we help you today?",
      },
    ]);
  } catch (error) {
    console.error("Failed to send welcome message:", error);
  }
}
