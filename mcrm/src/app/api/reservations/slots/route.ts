import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/reservations/slots
 *
 * List available reservation slots by date range.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const dateFrom = searchParams.get("date_from") || "";
  const dateTo = searchParams.get("date_to") || "";

  if (!dateFrom || !dateTo) {
    return NextResponse.json(
      { error: "date_from and date_to query parameters are required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Fetch slots in the date range
  const { data: slots, error } = await supabase
    .from("reservation_slots")
    .select("*")
    .gte("slot_date", dateFrom)
    .lte("slot_date", dateTo)
    .eq("is_active", true)
    .order("slot_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Failed to list reservation slots:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservation slots" },
      { status: 500 }
    );
  }

  // For each slot, compute remaining capacity
  const slotsWithAvailability = await Promise.all(
    (slots ?? []).map(async (slot) => {
      const { count } = await supabase
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .eq("slot_id", slot.id)
        .in("status", ["pending", "confirmed"]);

      const booked = count ?? 0;

      return {
        ...slot,
        booked_count: booked,
        available_capacity: slot.max_capacity
          ? Math.max(0, slot.max_capacity - booked)
          : null,
      };
    })
  );

  return NextResponse.json({ data: slotsWithAvailability });
}

/**
 * POST /api/reservations/slots
 *
 * Create a reservation slot (admin only).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();
  const supabase = createAdminClient();

  const {
    slot_date,
    start_time,
    end_time,
    max_capacity,
    label,
  } = body;

  if (!slot_date || !start_time) {
    return NextResponse.json(
      { error: "slot_date and start_time are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("reservation_slots")
    .insert({
      slot_date,
      start_time,
      end_time: end_time || null,
      max_capacity: max_capacity || null,
      label: label || null,
      is_active: true,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create reservation slot:", error);
    return NextResponse.json(
      { error: "Failed to create reservation slot" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
