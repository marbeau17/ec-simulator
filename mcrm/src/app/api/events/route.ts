import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/events
 *
 * List events with optional status filter and pagination.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
  );
  const status = searchParams.get("status") || "";
  const offset = (page - 1) * limit;

  const supabase = createAdminClient();

  let query = supabase
    .from("events")
    .select("*", { count: "exact" })
    .order("event_date", { ascending: true })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Failed to list events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
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
 * POST /api/events
 *
 * Create a new event.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();
  const supabase = createAdminClient();

  const {
    title,
    description,
    event_date,
    start_time,
    end_time,
    location,
    max_capacity,
    image_url,
  } = body;

  if (!title || !event_date) {
    return NextResponse.json(
      { error: "Title and event_date are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("events")
    .insert({
      title,
      description: description || null,
      event_date,
      start_time: start_time || null,
      end_time: end_time || null,
      location: location || null,
      max_capacity: max_capacity || null,
      image_url: image_url || null,
      status: "upcoming",
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create event:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
