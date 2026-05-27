import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const school_id = searchParams.get("school_id");

    let query = supabase
      .from("bus_routes")
      .select("*, bus_stops(*), bus_subscriptions(count)")
      .order("name", { ascending: true });

    if (school_id) {
      query = query.eq("school_id", school_id);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { zones, bus_stops, ...routeData } = body;

    // Create the bus route
    const { data: route, error: routeError } = await supabase
      .from("bus_routes")
      .insert([{ ...routeData, zones: zones ?? [] }])
      .select("*")
      .single();

    if (routeError) {
      return NextResponse.json({ error: routeError.message }, { status: 400 });
    }

    // Create bus stops if provided
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

      if (stopsError) {
        return NextResponse.json({ error: stopsError.message }, { status: 400 });
      }

      return NextResponse.json(
        { data: { ...route, bus_stops: createdStops } },
        { status: 201 }
      );
    }

    return NextResponse.json({ data: route }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
