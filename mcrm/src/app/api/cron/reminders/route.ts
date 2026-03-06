import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushMessage } from "@/lib/line/client";

/**
 * GET /api/cron/reminders
 *
 * Cron job handler that sends reminders for tomorrow's events and reservations.
 * Requires CRON_SECRET bearer token for authentication.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET environment variable is not set");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Calculate tomorrow's date range
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  let eventRemindersSent = 0;
  let reservationRemindersSent = 0;
  const errors: string[] = [];

  // --- Send event reminders ---
  try {
    const { data: registrations, error: regError } = await supabase
      .from("event_registrations")
      .select(
        "id, user:users(id, line_uid, line_display_name), event:events(id, title, event_date, start_time, location)"
      )
      .eq("status", "registered")
      .eq("events.event_date", tomorrowStr);

    if (regError) {
      errors.push(`Event registrations query failed: ${regError.message}`);
    } else if (registrations) {
      for (const reg of registrations) {
        const user = reg.user as { id: string; line_uid: string | null; line_display_name: string | null } | null;
        const event = reg.event as { id: string; title: string; event_date: string; start_time: string | null; location: string | null } | null;

        if (!user?.line_uid || !event) continue;

        try {
          const timeStr = event.start_time
            ? ` at ${event.start_time}`
            : "";
          const locationStr = event.location
            ? `\nLocation: ${event.location}`
            : "";

          await pushMessage(user.line_uid, [
            {
              type: "text",
              text: `Reminder: "${event.title}" is tomorrow${timeStr}!${locationStr}\n\nWe look forward to seeing you!`,
            },
          ]);
          eventRemindersSent++;
        } catch (pushError) {
          console.error(
            `Failed to send event reminder to ${user.line_uid}:`,
            pushError
          );
          errors.push(
            `Event reminder to ${user.line_display_name || user.line_uid} failed`
          );
        }
      }
    }
  } catch (error) {
    console.error("Event reminders processing failed:", error);
    errors.push("Event reminders processing failed");
  }

  // --- Send reservation reminders ---
  try {
    const { data: reservations, error: resError } = await supabase
      .from("reservations")
      .select(
        "id, reservation_date, reservation_time, party_size, user:users(id, line_uid, line_display_name)"
      )
      .eq("reservation_date", tomorrowStr)
      .in("status", ["pending", "confirmed"]);

    if (resError) {
      errors.push(`Reservations query failed: ${resError.message}`);
    } else if (reservations) {
      for (const reservation of reservations) {
        const user = reservation.user as { id: string; line_uid: string | null; line_display_name: string | null } | null;

        if (!user?.line_uid) continue;

        try {
          const timeStr = reservation.reservation_time
            ? ` at ${reservation.reservation_time}`
            : "";
          const partyStr =
            reservation.party_size > 1
              ? ` for ${reservation.party_size} guests`
              : "";

          await pushMessage(user.line_uid, [
            {
              type: "text",
              text: `Reminder: You have a reservation tomorrow${timeStr}${partyStr}.\n\nIf you need to make changes, please contact us. See you soon!`,
            },
          ]);
          reservationRemindersSent++;
        } catch (pushError) {
          console.error(
            `Failed to send reservation reminder to ${user.line_uid}:`,
            pushError
          );
          errors.push(
            `Reservation reminder to ${user.line_display_name || user.line_uid} failed`
          );
        }
      }
    }
  } catch (error) {
    console.error("Reservation reminders processing failed:", error);
    errors.push("Reservation reminders processing failed");
  }

  return NextResponse.json({
    success: true,
    date: tomorrowStr,
    event_reminders_sent: eventRemindersSent,
    reservation_reminders_sent: reservationRemindersSent,
    errors: errors.length > 0 ? errors : undefined,
  });
}
