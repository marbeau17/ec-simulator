import type { MessageEvent } from "@/lib/line/webhook";
import { replyMessage } from "@/lib/line/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { chat } from "@/lib/gemini/chat";

/**
 * Handle LINE message event.
 * Processes text messages through AI, saves conversation history,
 * and handles escalation when the AI flags a message with [ESCALATE].
 */
export async function handleMessage(event: MessageEvent): Promise<void> {
  // Only handle text messages
  if (event.message.type !== "text") {
    return;
  }

  const userId = event.source.userId;
  if (!userId) {
    console.error("Message event missing userId");
    return;
  }

  const userText = event.message.text;
  const supabase = createAdminClient();

  // Find or create the user record
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("line_uid", userId)
    .single();

  if (userError || !user) {
    console.error("User not found for line_uid:", userId, userError);
    return;
  }

  // Find an active conversation or create a new one
  let conversationId: string;

  const { data: existingConversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_id", user.id)
    .in("status", ["active", "escalated"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existingConversation) {
    conversationId = existingConversation.id;
  } else {
    const { data: newConversation, error: convError } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        status: "active",
        channel: "line",
      })
      .select("id")
      .single();

    if (convError || !newConversation) {
      console.error("Failed to create conversation:", convError);
      return;
    }

    conversationId = newConversation.id;
  }

  // Save the incoming user message
  const { error: inMsgError } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_type: "user",
    sender_id: user.id,
    content: userText,
    channel: "line",
  });

  if (inMsgError) {
    console.error("Failed to save incoming message:", inMsgError);
  }

  // Generate AI response
  let aiResponse: string;

  try {
    aiResponse = await chat(conversationId, userText);
  } catch (error) {
    console.error("AI chat error:", error);
    aiResponse =
      "Sorry, I am unable to process your request right now. A staff member will assist you shortly.";
  }

  // Check for escalation tag
  const isEscalated = aiResponse.includes("[ESCALATE]");

  if (isEscalated) {
    // Remove the [ESCALATE] tag from the response sent to user
    aiResponse = aiResponse.replace(/\[ESCALATE\]/g, "").trim();

    // Update conversation status to escalated
    const { error: escError } = await supabase
      .from("conversations")
      .update({
        status: "escalated",
        escalated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    if (escError) {
      console.error("Failed to escalate conversation:", escError);
    }
  }

  // Save the AI response message
  const { error: outMsgError } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_type: "bot",
    content: aiResponse,
    channel: "line",
  });

  if (outMsgError) {
    console.error("Failed to save AI response message:", outMsgError);
  }

  // Reply to the user via LINE
  try {
    await replyMessage(event.replyToken, [
      {
        type: "text",
        text: aiResponse,
      },
    ]);
  } catch (error) {
    console.error("Failed to reply via LINE:", error);
  }

  // Update user's last interaction timestamp
  const { error: updateError } = await supabase
    .from("users")
    .update({ last_interaction_at: new Date().toISOString() })
    .eq("id", user.id);

  if (updateError) {
    console.error("Failed to update last_interaction_at:", updateError);
  }
}
