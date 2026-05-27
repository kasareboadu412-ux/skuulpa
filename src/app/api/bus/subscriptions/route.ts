import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireStaff } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { schoolId } = auth;

  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const student_id = searchParams.get("student_id");
    const route_id = searchParams.get("route_id");

    let query = supabase
      .from("bus_subscriptions")
      .select("*, student:students!inner(id, first_name, last_name, school_id), bus_route:bus_routes!inner(id, name, school_id), stop:bus_stops(*)")
      .eq("student.school_id", schoolId)
      .order("created_at", { ascending: false });

    if (student_id) query = query.eq("student_id", student_id);
    if (route_id) query = query.eq("bus_route_id", route_id);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: "Failed to fetch bus subscriptions" }, { status: 400 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { schoolId } = auth;

  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { student_id, bus_route_id, stop_id, trip_type, start_date, end_date } = body;

    if (!student_id || !bus_route_id || !start_date) {
      return NextResponse.json({ error: "student_id, bus_route_id, and start_date are required" }, { status: 400 });
    }

    // Verify student belongs to this school
    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("id", student_id)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    // Verify bus route belongs to this school
    const { data: route } = await supabase
      .from("bus_routes")
      .select("id, zones")
      .eq("id", bus_route_id)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (!route) return NextResponse.json({ error: "Bus route not found" }, { status: 404 });

    let feeAmount = 0;
    if (route.zones) {
      const zones = route.zones as Array<{ zone_name: string; fee: number }>;
      if (stop_id) {
        const { data: stop } = await supabase.from("bus_stops").select("name").eq("id", stop_id).single();
        if (stop) {
          const matchingZone = zones.find((z) => z.zone_name === stop.name);
          if (matchingZone) feeAmount = matchingZone.fee;
        }
      }
      if (feeAmount === 0 && zones.length > 0) feeAmount = zones[0].fee;
    }

    if (trip_type === "one_way") feeAmount = Math.round(feeAmount * 0.6 * 100) / 100;

    if (end_date && start_date) {
      const days = Math.round((new Date(end_date).getTime() - new Date(start_date).getTime()) / (1000 * 60 * 60 * 24));
      const fullTermDays = 90;
      if (days < fullTermDays) feeAmount = Math.round((feeAmount / fullTermDays) * days * 100) / 100;
    }

    const { data, error } = await supabase
      .from("bus_subscriptions")
      .insert([{
        student_id,
        bus_route_id,
        stop_id: stop_id ?? null,
        trip_type: trip_type ?? "round_trip",
        fee_amount: feeAmount,
        start_date,
        end_date: end_date ?? null,
        is_active: true,
      }])
      .select("*, student:students(*), bus_route:bus_routes(*), stop:bus_stops(*)")
      .single();

    if (error) return NextResponse.json({ error: "Failed to create bus subscription" }, { status: 400 });
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
