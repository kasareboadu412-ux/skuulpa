import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireStaffModule } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireStaffModule("feeding");
  if (auth instanceof NextResponse) return auth;
  const { schoolId } = auth;

  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const date_from = searchParams.get("date_from");
    const date_to = searchParams.get("date_to");
    const student_id = searchParams.get("student_id");
    const class_id = searchParams.get("class_id");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "100");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("daily_feeding_attendance")
      .select("*, student:students!inner(id, first_name, last_name, school_id, class:classes(*))", { count: "exact" })
      .eq("student.school_id", schoolId)
      .order("date", { ascending: false });

    if (date) query = query.eq("date", date);
    if (student_id) query = query.eq("student_id", student_id);
    if (date_from) query = query.gte("date", date_from);
    if (date_to) query = query.lte("date", date_to);
    if (class_id) query = query.eq("student.class_id", class_id);

    const { data, error, count } = await query.range(offset, offset + limit - 1);
    if (error) return NextResponse.json({ error: "Failed to fetch feeding attendance" }, { status: 400 });
    return NextResponse.json({ data, pagination: { page, limit, total: count ?? 0 } });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireStaffModule("feeding");
  if (auth instanceof NextResponse) return auth;
  const { schoolId } = auth;

  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();

    if (body.class_id && Array.isArray(body.records)) {
      const { class_id, date, records, recorded_by } = body;

      // Verify class belongs to this school
      const { data: classRow } = await supabase
        .from("classes")
        .select("id")
        .eq("id", class_id)
        .eq("school_id", schoolId)
        .maybeSingle();

      if (!classRow) return NextResponse.json({ error: "Class not found" }, { status: 404 });

      const { data: students } = await supabase
        .from("students")
        .select("id")
        .eq("class_id", class_id)
        .eq("school_id", schoolId)
        .eq("status", "active");

      if (!students || students.length === 0) {
        return NextResponse.json({ error: "No active students found in this class" }, { status: 404 });
      }

      const recordMap = new Map<string, boolean>();
      for (const r of records) recordMap.set(r.student_id, r.was_fed ?? true);

      const attendanceRecords = students.map((student) => ({
        student_id: student.id,
        date: date ?? new Date().toISOString().split("T")[0],
        was_fed: recordMap.get(student.id) ?? true,
        recorded_by: recorded_by ?? null,
      }));

      const { data, error } = await supabase
        .from("daily_feeding_attendance")
        .upsert(attendanceRecords, { onConflict: "student_id, date", ignoreDuplicates: false })
        .select("*, student:students(*, class:classes(*))");

      if (error) return NextResponse.json({ error: "Failed to record feeding attendance" }, { status: 400 });
      return NextResponse.json({ data, count: data?.length ?? 0 }, { status: 201 });
    }

    const { student_id, date, was_fed, recorded_by } = body;
    if (!student_id) return NextResponse.json({ error: "student_id is required" }, { status: 400 });

    // Verify student belongs to this school
    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("id", student_id)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const { data, error } = await supabase
      .from("daily_feeding_attendance")
      .upsert(
        [{ student_id, date: date ?? new Date().toISOString().split("T")[0], was_fed: was_fed ?? true, recorded_by: recorded_by ?? null }],
        { onConflict: "student_id, date", ignoreDuplicates: false }
      )
      .select("*, student:students(*)")
      .single();

    if (error) return NextResponse.json({ error: "Failed to record feeding attendance" }, { status: 400 });
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
