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
    const date = searchParams.get("date");
    const date_from = searchParams.get("date_from");
    const date_to = searchParams.get("date_to");
    const status = searchParams.get("status");
    const class_id = searchParams.get("class_id");
    const student_id = searchParams.get("student_id");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "50");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("absence_notifications")
      .select(
        "*, attendance_record:attendance_records(*), student:students!inner(id, first_name, last_name, school_id, class:classes(*))",
        { count: "exact" }
      )
      .eq("student.school_id", schoolId)
      .order("created_at", { ascending: false });

    if (date) query = query.eq("date", date);
    if (date_from) query = query.gte("date", date_from);
    if (date_to) query = query.lte("date", date_to);
    if (status) query = query.eq("notification_status", status);
    if (class_id) query = query.eq("class_id", class_id);
    if (student_id) query = query.eq("student_id", student_id);

    const { data, error, count } = await query.range(offset, offset + limit - 1);
    if (error) return NextResponse.json({ error: "Failed to fetch absence notifications" }, { status: 400 });
    return NextResponse.json({ data, pagination: { page, limit, total: count ?? 0 } });
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
    const { student_id, attendance_record_id, date, class_id, notification_channel } = body;

    if (!student_id) return NextResponse.json({ error: "student_id is required" }, { status: 400 });

    // Verify student belongs to this school
    const { data: studentRow } = await supabase
      .from("students")
      .select("id, class_id")
      .eq("id", student_id)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (!studentRow) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    let attendanceId = attendance_record_id;
    if (!attendanceId) {
      const attendanceDate = date ?? new Date().toISOString().split("T")[0];
      const { data: existingAttendance } = await supabase
        .from("attendance_records")
        .select("id")
        .eq("student_id", student_id)
        .eq("date", attendanceDate)
        .single();

      if (existingAttendance) {
        attendanceId = existingAttendance.id;
      } else {
        const { data: newAttendance } = await supabase
          .from("attendance_records")
          .insert([{ student_id, class_id: studentRow.class_id ?? class_id ?? null, date: attendanceDate, status: "absent" }])
          .select("id")
          .single();
        attendanceId = newAttendance?.id;
      }
    }

    const notificationDate = date ?? new Date().toISOString().split("T")[0];

    const { data: existing } = await supabase
      .from("absence_notifications")
      .select("*")
      .eq("student_id", student_id)
      .eq("date", notificationDate)
      .single();

    if (existing) return NextResponse.json({ data: existing, message: "Notification already exists" });

    const { data, error } = await supabase
      .from("absence_notifications")
      .insert([{
        attendance_record_id: attendanceId,
        student_id,
        class_id: studentRow.class_id ?? class_id ?? null,
        date: notificationDate,
        notification_channel: notification_channel ?? "whatsapp",
        notification_status: "pending",
      }])
      .select("*, attendance_record:attendance_records(*), student:students(*)")
      .single();

    if (error) return NextResponse.json({ error: "Failed to create absence notification" }, { status: 400 });
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
