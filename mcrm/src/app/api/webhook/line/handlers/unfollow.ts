import type { UnfollowEvent } from "@/lib/line/webhook";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Handle LINE unfollow (block) event.
 * Updates the user's follow status to 'unfollowed' in Supabase.
 */
export async function handleUnfollow(event: UnfollowEvent): Promise<void> {
  const userId = event.source.userId;
  if (!userId) {
    console.error("Unfollow event missing userId");
    return;
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("users")
    .update({
      line_follow_status: "unfollowed",
      updated_at: new Date().toISOString(),
    })
    .eq("line_uid", userId);

  if (error) {
    console.error("Failed to update user follow status:", error);
  }
}
