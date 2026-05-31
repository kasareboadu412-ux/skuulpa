import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServiceClient } from "@/lib/supabase-server";
import { requireStaff } from "@/lib/auth-guard";

export const runtime = "nodejs";

/** Haversine distance in metres between two lat/lng pairs. */
function haversineMetres(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * POST /api/teachers/clockin
 *
 * Body: { type: "in" | "out", lat: number, lng: number }
 *
 * Validates that the teacher is within the school's GPS fence
 * (school.settings.gps_lat / gps_lng / gps_radius_m, default 200 m).
 * Records clock_in_time or clock_out_time on teacher_attendance for today.
 */
export async function POST(request: NextRequest) {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { schoolId, userId } = auth;

  try {
    const body = await request.json();
    const { type, lat, lng } = body as { type?: string; lat?: number; lng?: number };

    if (type !== "in" && type !== "out") {
      return NextResponse.json({ error: "type must be 'in' or 'out'" }, { status: 400 });
    }
    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
    }

    const db = getServiceClient();
    const supabase = await createSupabaseServerClient();

    // Fetch teacher row.
    const { data: teacher } = await supabase
      .from("teachers")
      .select("id")
      .eq("user_id", userId)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (!teacher) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
    }

    // Fetch school GPS settings.
    const { data: school } = await db
      .from("schools")
      .select("settings")
      .eq("id", schoolId)
      .maybeSingle();

    const settings = (school?.settings ?? {}) as Record<string, unknown>;
    const schoolLat = Number(settings.gps_lat ?? 0);
    const schoolLng = Number(settings.gps_lng ?? 0);
    const radiusM = Number(settings.gps_radius_m ?? 200); // default 200 m

    // GPS fence check — skip if school hasn't configured coordinates yet.
    if (schoolLat !== 0 || schoolLng !== 0) {
      const dist = haversineMetres(lat, lng, schoolLat, schoolLng);
      if (dist > radiusM) {
        return NextResponse.json(
          {
            error: `You appear to be ${Math.round(dist)} m from school. Clock-in is only allowed within ${radiusM} m.`,
            code: "outside_fence",
            distance_m: Math.round(dist),
            allowed_radius_m: radiusM,
          },
          { status: 403 }
        );
      }
    }

    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toLocaleTimeString("en-GH", {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false, timeZone: "Africa/Accra",
    });

    // Upsert today's attendance record.
    const { data: existing } = await supabase
      .from("teacher_attendance")
      .select("*")
      .eq("teacher_id", teacher.id)
      .eq("date", today)
      .maybeSingle();

    const SCHOOL_START = settings.school_start_time as string ?? "07:30:00";

    if (existing) {
      const updateData: Record<string, unknown> = {};
      if (type === "in") {
        updateData.clock_in_time = now;
        updateData.is_present = true;
        updateData.is_late = now > SCHOOL_START;
        if (now > SCHOOL_START) {
          const [hs, ms] = SCHOOL_START.split(":").map(Number);
          const [h, m] = now.split(":").map(Number);
          updateData.late_minutes = Math.max(0, (h - hs) * 60 + (m - ms));
        } else {
          updateData.late_minutes = 0;
        }
      } else {
        updateData.clock_out_time = now;
      }
      const { data, error } = await supabase
        .from("teacher_attendance")
        .update(updateData)
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: "Failed to update attendance" }, { status: 400 });
      return NextResponse.json({ data, time: now, type });
    }

    // First record of the day.
    const is_late = type === "in" && now > SCHOOL_START;
    let lateMinutes = 0;
    if (is_late) {
      const [hs, ms] = SCHOOL_START.split(":").map(Number);
      const [h, m] = now.split(":").map(Number);
      lateMinutes = Math.max(0, (h - hs) * 60 + (m - ms));
    }

    const { data, error } = await supabase
      .from("teacher_attendance")
      .insert([{
        teacher_id: teacher.id,
        date: today,
        clock_in_time: type === "in" ? now : null,
        clock_out_time: type === "out" ? now : null,
        is_present: type === "in",
        is_late,
        late_minutes: Math.max(0, lateMinutes),
      }])
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: "Failed to record attendance" }, { status: 400 });
    return NextResponse.json({ data, time: now, type }, { status: 201 });
  } catch (err) {
    console.error("Clock-in error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
