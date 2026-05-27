import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const student_id = searchParams.get("student_id");
    const route_id = searchParams.get("route_id");
    const school_id = searchParams.get("school_id");

    let query = supabase
      .from("bus_subscriptions")
      .select(
        "*, student:students(*), bus_route:bus_routes(*), stop:bus_stops(*)"
      )
      .order("created_at", { ascending: false });

    if (student_id) {
      query = query.eq("student_id", student_id);
    }
    if (route_id) {
      query = query.eq("bus_route_id", route_id);
    }
    if (school_id) {
      query = query.eq("bus_route.school_id", school_id);
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

    const { student_id, bus_route_id, stop_id, trip_type, start_date, end_date } = body;

    if (!student_id || !bus_route_id || !start_date) {
      return NextResponse.json(
        { error: "student_id, bus_route_id, and start_date are required" },
        { status: 400 }
      );
    }

    // Calculate pro-rated fee
    let feeAmount = 0;

    // Get route zones to find matching fee
    const { data: route } = await supabase
      .from("bus_routes")
      .select("zones")
      .eq("id", bus_route_id)
      .single();

    if (route?.zones) {
      const zones = route.zones as Array<{ zone_name: string; fee: number }>;
      // Find matching zone fee
      if (stop_id) {
        const { data: stop } = await supabase
          .from("bus_stops")
          .select("name")
          .eq("id", stop_id)
          .single();

        if (stop) {
          const matchingZone = zones.find((z) => z.zone_name === stop.name);
          if (matchingZone) {
            feeAmount = matchingZone.fee;
          }
        }
      }

      // If no zone match, use the first zone's fee as default
      if (feeAmount === 0 && zones.length > 0) {
        feeAmount = zones[0].fee;
      }
    }

    // Apply trip type factor
    if (trip_type === "one_way") {
      feeAmount = Math.round((feeAmount * 0.6) * 100) / 100;
    }

    // Calculate term pro-ration if end_date provided
    if (end_date && start_date) {
      const termStart = new Date(start_date);
      const termEnd = new Date(end_date);
      const days = Math.round(
        (termEnd.getTime() - termStart.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Assume a full term is ~90 days, pro-rate accordingly
      const fullTermDays = 90;
      if (days < fullTermDays) {
        feeAmount = Math.round((feeAmount / fullTermDays) * days * 100) / 100;
      }
    }

    const { data, error } = await supabase
      .from("bus_subscriptions")
      .insert([
        {
          student_id,
          bus_route_id,
          stop_id: stop_id ?? null,
          trip_type: trip_type ?? "round_trip",
          fee_amount: feeAmount,
          start_date,
          end_date: end_date ?? null,
          is_active: true,
        },
      ])
      .select("*, student:students(*), bus_route:bus_routes(*), stop:bus_stops(*)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
