import type { PostbackEvent } from "@/lib/line/webhook";
import { replyMessage } from "@/lib/line/client";
import { createAdminClient } from "@/lib/supabase/admin";

interface PostbackData {
  action: string;
  [key: string]: string;
}

/**
 * Parse postback data string into a key-value object.
 * Expected format: "action=confirm_reservation&reservation_id=123"
 */
function parsePostbackData(data: string): PostbackData {
  const params = new URLSearchParams(data);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result as PostbackData;
}

/**
 * Handle reservation confirmation postback.
 */
async function handleReservationConfirm(
  event: PostbackEvent,
  data: PostbackData
): Promise<void> {
  const supabase = createAdminClient();
  const reservationId = data.reservation_id;

  if (!reservationId) {
    console.error("Missing reservation_id in postback data");
    return;
  }

  const { data: reservation, error } = await supabase
    .from("reservations")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", reservationId)
    .select()
    .single();

  if (error) {
    console.error("Failed to confirm reservation:", error);
    await replyMessage(event.replyToken, [
      {
        type: "text",
        text: "Sorry, we could not confirm your reservation. Please try again or contact us.",
      },
    ]);
    return;
  }

  await replyMessage(event.replyToken, [
    {
      type: "text",
      text: `Your reservation has been confirmed! We look forward to seeing you on ${reservation.reservation_date}.`,
    },
  ]);
}

/**
 * Handle reservation cancellation postback.
 */
async function handleReservationCancel(
  event: PostbackEvent,
  data: PostbackData
): Promise<void> {
  const supabase = createAdminClient();
  const reservationId = data.reservation_id;

  if (!reservationId) {
    console.error("Missing reservation_id in postback data");
    return;
  }

  const { error } = await supabase
    .from("reservations")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", reservationId);

  if (error) {
    console.error("Failed to cancel reservation:", error);
    await replyMessage(event.replyToken, [
      {
        type: "text",
        text: "Sorry, we could not cancel your reservation. Please try again or contact us.",
      },
    ]);
    return;
  }

  await replyMessage(event.replyToken, [
    {
      type: "text",
      text: "Your reservation has been cancelled.",
    },
  ]);
}

/**
 * Handle event registration postback.
 */
async function handleEventRegister(
  event: PostbackEvent,
  data: PostbackData
): Promise<void> {
  const supabase = createAdminClient();
  const eventId = data.event_id;
  const userId = event.source.userId;

  if (!eventId || !userId) {
    console.error("Missing event_id or userId in postback data");
    return;
  }

  // Look up the user
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("line_uid", userId)
    .single();

  if (!user) {
    console.error("User not found for event registration");
    return;
  }

  // Check if already registered
  const { data: existing } = await supabase
    .from("event_registrations")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    await replyMessage(event.replyToken, [
      {
        type: "text",
        text: "You are already registered for this event!",
      },
    ]);
    return;
  }

  // Register for the event
  const { error } = await supabase.from("event_registrations").insert({
    event_id: eventId,
    user_id: user.id,
    status: "registered",
    registered_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Failed to register for event:", error);
    await replyMessage(event.replyToken, [
      {
        type: "text",
        text: "Sorry, we could not register you for this event. It may be full.",
      },
    ]);
    return;
  }

  await replyMessage(event.replyToken, [
    {
      type: "text",
      text: "You have been registered for the event! We will send you a reminder before it starts.",
    },
  ]);
}

/**
 * Handle event cancellation postback.
 */
async function handleEventCancel(
  event: PostbackEvent,
  data: PostbackData
): Promise<void> {
  const supabase = createAdminClient();
  const eventId = data.event_id;
  const userId = event.source.userId;

  if (!eventId || !userId) {
    return;
  }

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("line_uid", userId)
    .single();

  if (!user) return;

  const { error } = await supabase
    .from("event_registrations")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("event_id", eventId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to cancel event registration:", error);
    return;
  }

  await replyMessage(event.replyToken, [
    {
      type: "text",
      text: "Your event registration has been cancelled.",
    },
  ]);
}

/**
 * Handle postback events from LINE.
 * Routes to the appropriate handler based on the action in the postback data.
 */
export async function handlePostback(event: PostbackEvent): Promise<void> {
  const data = parsePostbackData(event.postback.data);

  switch (data.action) {
    case "confirm_reservation":
      await handleReservationConfirm(event, data);
      break;
    case "cancel_reservation":
      await handleReservationCancel(event, data);
      break;
    case "register_event":
      await handleEventRegister(event, data);
      break;
    case "cancel_event":
      await handleEventCancel(event, data);
      break;
    default:
      console.log(`Unhandled postback action: ${data.action}`);
      await replyMessage(event.replyToken, [
        {
          type: "text",
          text: "Sorry, this action is not supported.",
        },
      ]);
  }
}
