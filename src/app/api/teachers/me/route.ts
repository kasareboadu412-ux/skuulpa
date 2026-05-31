import { NextResponse } from "next/server";
import { createSupabaseServerClient, getServiceClient } from "@/lib/supabase-server";
import { requireStaff } from "@/lib/auth-guard";

export const runtime = "nodejs";

/**
 * GET /api/teachers/me — return the current teacher's profile, classes, and subjects.
 * Works for any staff role; only teacher rows that match the auth user are returned.
 */
export async function GET() {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { userId, schoolId } = auth;

  try {
    const supabase = await createSupabaseServerClient();

    const { data: teacher } = await supabase
      .from("teachers")
      .select("*")
      .eq("user_id", userId)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (!teacher) {
      return NextResponse.json(
        { error: "No teacher profile linked to this account. Ask an administrator to add you." },
        { status: 404 }
      );
    }

    const teacherId = (teacher as { id: string }).id;

    // Classes where this teacher is the class teacher
    const { data: ownedClasses } = await supabase
      .from("classes")
      .select("id, name, sort_order, students(count)")
      .eq("school_id", schoolId)
      .eq("teacher_id", teacherId);

    // Subject assignments
    const { data: subjectAssignments } = await supabase
      .from("teacher_subject_assignments")
      .select("class_id, subject_id, class:classes(id, name), subject:subjects(id, name, code)")
      .eq("teacher_id", teacherId);

    // Today's clock-in record
    const today = new Date().toISOString().split("T")[0];
    const { data: todayAttendance } = await supabase
      .from("teacher_attendance")
      .select("*")
      .eq("teacher_id", teacherId)
      .eq("date", today)
      .maybeSingle();

    return NextResponse.json({
      data: {
        teacher,
        owned_classes: ownedClasses ?? [],
        subject_assignments: subjectAssignments ?? [],
        today_attendance: todayAttendance,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/teachers/me — clock-in/out for current teacher.
 * Body: { action: "in" | "out" }
 */
export async function POST(request: Request) {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { userId, schoolId } = auth;

  try {
    const body = await request.json();
    const action = (body.action ?? "in") as "in" | "out";

    const db = getServiceClient();
    const { data: teacher } = await db
      .from("teachers")
      .select("id")
      .eq("user_id", userId)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

    const teacherId = (teacher as { id: string }).id;
    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toTimeString().split(" ")[0];

    const { data: existing } = await db
      .from("teacher_attendance")
      .select("*")
      .eq("teacher_id", teacherId)
      .eq("date", today)
      .maybeSingle();

    if (action === "out") {
      if (!existing) return NextResponse.json({ error: "Not yet clocked in" }, { status: 400 });
      const { data, error } = await db
        .from("teacher_attendance")
        .update({ clock_out_time: now })
        .eq("id", (existing as { id: string }).id)
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: "Failed to clock out" }, { status: 400 });
      return NextResponse.json({ data });
    }

    // Clock in
    if (existing && (existing as { clock_in_time: string | null }).clock_in_time) {
      return NextResponse.json({ data: existing, message: "Already clocked in" });
    }

    const isLate = now > "07:30:00";
    let lateMinutes = 0;
    if (isLate) {
      const [h, m] = now.split(":").map(Number);
      lateMinutes = Math.max(0, (h - 7) * 60 + m - 30);
    }

    if (existing) {
      const { data, error } = await db
        .from("teacher_attendance")
        .update({ clock_in_time: now, is_present: true, is_late: isLate, late_minutes: lateMinutes })
        .eq("id", (existing as { id: string }).id)
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: "Failed to clock in" }, { status: 400 });
      return NextResponse.json({ data });
    }

    const { data, error } = await db
      .from("teacher_attendance")
      .insert([{
        teacher_id: teacherId,
        date: today,
        clock_in_time: now,
        is_present: true,
        is_late: isLate,
        late_minutes: lateMinutes,
      }])
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: "Failed to clock in" }, { status: 400 });
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
