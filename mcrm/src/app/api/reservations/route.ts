import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/reservations
 *
 * List reservations with optional date filter and pagination.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
  );
  const dateFrom = searchParams.get("date_from") || "";
  const dateTo = searchParams.get("date_to") || "";
  const status = searchParams.get("status") || "";
  const offset = (page - 1) * limit;

  const supabase = createAdminClient();

  let query = supabase
    .from("reservations")
    .select("*, user:users(id, line_display_name, full_name)", {
      count: "exact",
    })
    .order("reservation_date", { ascending: true })
    .range(offset, offset + limit - 1);

  if (dateFrom) {
    query = query.gte("reservation_date", dateFrom);
  }

  if (dateTo) {
    query = query.lte("reservation_date", dateTo);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Failed to list reservations:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservations" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  });
}

/**
 * POST /api/reservations
 *
 * Create a reservation with optimistic locking check on slot capacity.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();
  const supabase = createAdminClient();

  const {
    user_id,
    slot_id,
    reservation_date,
    reservation_time,
    party_size,
    notes,
  } = body;

  if (!user_id || !reservation_date) {
    return NextResponse.json(
      { error: "user_id and reservation_date are required" },
      { status: 400 }
    );
  }

  // If a slot is specified, perform optimistic locking check
  if (slot_id) {
    // Fetch the slot with current booking count
    const { data: slot, error: slotError } = await supabase
      .from("reservation_slots")
      .select("*")
      .eq("id", slot_id)
      .single();

    if (slotError || !slot) {
      return NextResponse.json(
        { error: "Reservation slot not found" },
        { status: 404 }
      );
    }

    // Count existing active reservations for this slot
    const { count: currentBookings } = await supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("slot_id", slot_id)
      .in("status", ["pending", "confirmed"]);

    const requestedSize = party_size || 1;

    if (
      slot.max_capacity &&
      (currentBookings ?? 0) + requestedSize > slot.max_capacity
    ) {
      return NextResponse.json(
        {
          error: "This slot is fully booked or does not have enough capacity",
          available: Math.max(0, slot.max_capacity - (currentBookings ?? 0)),
        },
        { status: 409 }
      );
    }
  }

  const { data, error } = await supabase
    .from("reservations")
    .insert({
      user_id,
      slot_id: slot_id || null,
      reservation_date,
      reservation_time: reservation_time || null,
      party_size: party_size || 1,
      notes: notes || null,
      status: "pending",
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create reservation:", error);
    return NextResponse.json(
      { error: "Failed to create reservation" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
