import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const date_from = searchParams.get("date_from");
    const date_to = searchParams.get("date_to");
    const status = searchParams.get("status");
    const class_id = searchParams.get("class_id");
    const student_id = searchParams.get("student_id");

    let query = supabase
      .from("absence_notifications")
      .select(
        "*, attendance_record:attendance_records(*), student:students(*), class:classes(*)"
      )
      .order("created_at", { ascending: false });

    if (date) {
      query = query.eq("date", date);
    }
    if (date_from) {
      query = query.gte("date", date_from);
    }
    if (date_to) {
      query = query.lte("date", date_to);
    }
    if (status) {
      query = query.eq("notification_status", status);
    }
    if (class_id) {
      query = query.eq("class_id", class_id);
    }
    if (student_id) {
      query = query.eq("student_id", student_id);
    }

    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "50");
    const offset = (page - 1) * limit;

    const { data, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      data,
      pagination: { page, limit, total: count ?? 0 },
    });
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
    const { student_id, attendance_record_id, date, class_id, notification_channel } = body;

    if (!student_id) {
      return NextResponse.json(
        { error: "student_id is required" },
        { status: 400 }
      );
    }

    // If attendance_record_id isn't provided, find or create the attendance record
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
        // Create attendance record marked as absent
        const { data: student } = await supabase
          .from("students")
          .select("class_id")
          .eq("id", student_id)
          .single();

        const { data: newAttendance } = await supabase
          .from("attendance_records")
          .insert([
            {
              student_id,
              class_id: student?.class_id ?? class_id ?? null,
              date: attendanceDate,
              status: "absent",
            },
          ])
          .select("id")
          .single();

        attendanceId = newAttendance?.id;
      }
    }

    const notificationDate = date ?? new Date().toISOString().split("T")[0];

    // Check if notification already exists
    const { data: existing } = await supabase
      .from("absence_notifications")
      .select("*")
      .eq("student_id", student_id)
      .eq("date", notificationDate)
      .single();

    if (existing) {
      return NextResponse.json(
        { data: existing, message: "Notification already exists" }
      );
    }

    const { data: student } = await supabase
      .from("students")
      .select("class_id, parent_primary_phone")
      .eq("id", student_id)
      .single();

    const { data, error } = await supabase
      .from("absence_notifications")
      .insert([
        {
          attendance_record_id: attendanceId,
          student_id,
          class_id: student?.class_id ?? class_id ?? null,
          date: notificationDate,
          notification_channel: notification_channel ?? "whatsapp",
          notification_status: "pending",
        },
      ])
      .select("*, attendance_record:attendance_records(*), student:students(*)")
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
