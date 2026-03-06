import { createClient } from "./client";
import type { RealtimeChannel } from "@supabase/supabase-js";

const supabase = createClient();

/**
 * Subscribe to new messages in a specific conversation.
 * Returns the channel so the caller can unsubscribe later.
 */
export function subscribeToMessages(
  conversationId: string,
  callback: (message: any) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to conversation updates (new conversations or status changes).
 * Returns the channel so the caller can unsubscribe later.
 */
export function subscribeToConversations(
  callback: (conversation: any) => void
): RealtimeChannel {
  const channel = supabase
    .channel("conversations")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "conversations",
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  return channel;
}
