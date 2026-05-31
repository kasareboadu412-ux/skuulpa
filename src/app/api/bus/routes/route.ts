import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireStaffModule } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireStaffModule("bus");
  if (auth instanceof NextResponse) return auth;
  const { schoolId } = auth;

  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("bus_routes")
      .select("*, bus_stops(*), bus_subscriptions(count)")
      .eq("school_id", schoolId)
      .order("name", { ascending: true });

    if (error) return NextResponse.json({ error: "Failed to fetch bus routes" }, { status: 400 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireStaffModule("bus");
  if (auth instanceof NextResponse) return auth;
  const { schoolId } = auth;

  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { zones, bus_stops, ...routeData } = body;

    const { data: route, error: routeError } = await supabase
      .from("bus_routes")
      .insert([{ ...routeData, school_id: schoolId, zones: zones ?? [] }])
      .select("*")
      .single();

    if (routeError) return NextResponse.json({ error: "Failed to create bus route" }, { status: 400 });

    if (bus_stops && Array.isArray(bus_stops) && bus_stops.length > 0) {
      const stopsWithRouteId = bus_stops.map(
        (stop: { name: string; address?: string; lat?: number; lng?: number; sort_order?: number }) => ({
          bus_route_id: route.id,
          name: stop.name,
          address: stop.address ?? null,
          lat: stop.lat ?? null,
          lng: stop.lng ?? null,
          sort_order: stop.sort_order ?? 0,
        })
      );

      const { data: createdStops, error: stopsError } = await supabase
        .from("bus_stops")
        .insert(stopsWithRouteId)
        .select("*");

      if (stopsError) return NextResponse.json({ error: "Failed to create bus stops" }, { status: 400 });
      return NextResponse.json({ data: { ...route, bus_stops: createdStops } }, { status: 201 });
    }

    return NextResponse.json({ data: route }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
