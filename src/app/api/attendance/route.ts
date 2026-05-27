import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const date_from = searchParams.get("date_from");
    const date_to = searchParams.get("date_to");
    const class_id = searchParams.get("class_id");
    const student_id = searchParams.get("student_id");
    const status = searchParams.get("status");

    let query = supabase
      .from("attendance_records")
      .select("*, student:students(*), class:classes(*)")
      .order("date", { ascending: false });

    if (date) {
      query = query.eq("date", date);
    }
    if (date_from) {
      query = query.gte("date", date_from);
    }
    if (date_to) {
      query = query.lte("date", date_to);
    }
    if (class_id) {
      query = query.eq("class_id", class_id);
    }
    if (student_id) {
      query = query.eq("student_id", student_id);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "100");
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

    // Batch attendance for an entire class
    if (body.class_id && !body.student_id) {
      const { class_id, date, records, recorded_by } = body;

      if (!class_id || !date) {
        return NextResponse.json(
          { error: "class_id and date are required for batch attendance" },
          { status: 400 }
        );
      }

      // Get all active students in this class
      const { data: students } = await supabase
        .from("students")
        .select("id")
        .eq("class_id", class_id)
        .eq("status", "active");

      if (!students || students.length === 0) {
        return NextResponse.json(
          { error: "No active students found in this class" },
          { status: 404 }
        );
      }

      // Build record map from explicit records
      const recordMap = new Map<string, string>();
      if (records && Array.isArray(records)) {
        for (const r of records) {
          recordMap.set(r.student_id, r.status ?? "present");
        }
      }

      // Default all students to "present" unless overridden by explicit records
      const attendanceRecords = students.map((student) => ({
        student_id: student.id,
        class_id,
        date,
        status: recordMap.get(student.id) ?? "present",
        recorded_by: recorded_by ?? null,
      }));

      // Upsert to handle re-recording attendance for same date
      const { data, error } = await supabase
        .from("attendance_records")
        .upsert(attendanceRecords, {
          onConflict: "student_id, date",
          ignoreDuplicates: false,
        })
        .select("*, student:students(*), class:classes(*)");

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ data, count: data?.length ?? 0 }, { status: 201 });
    }

    // Single student attendance record
    const { student_id, class_id, date, status, recorded_by } = body;

    if (!student_id || !date) {
      return NextResponse.json(
        { error: "student_id and date are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("attendance_records")
      .upsert(
        [
          {
            student_id,
            class_id: class_id ?? null,
            date,
            status: status ?? "present",
            recorded_by: recorded_by ?? null,
          },
        ],
        { onConflict: "student_id, date", ignoreDuplicates: false }
      )
      .select("*, student:students(*), class:classes(*)")
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
