import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const date_from = searchParams.get("date_from");
    const date_to = searchParams.get("date_to");
    const student_id = searchParams.get("student_id");
    const class_id = searchParams.get("class_id");

    let query = supabase
      .from("daily_feeding_attendance")
      .select("*, student:students(*, class:classes(*))")
      .order("date", { ascending: false });

    if (date) {
      query = query.eq("date", date);
    }
    if (student_id) {
      query = query.eq("student_id", student_id);
    }
    if (date_from) {
      query = query.gte("date", date_from);
    }
    if (date_to) {
      query = query.lte("date", date_to);
    }
    if (class_id) {
      query = query.eq("student.class_id", class_id);
    }

    // Pagination
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
      pagination: { page, limit, total: count },
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

    // Batch recording for a class
    if (body.class_id && Array.isArray(body.records)) {
      const { class_id, date, records, recorded_by } = body;

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

      // Merge explicit records with all students
      const recordMap = new Map<string, boolean>();
      if (records) {
        for (const r of records) {
          recordMap.set(r.student_id, r.was_fed ?? true);
        }
      }

      const attendanceRecords = students.map((student) => ({
        student_id: student.id,
        date: date ?? new Date().toISOString().split("T")[0],
        was_fed: recordMap.get(student.id) ?? true,
        recorded_by: recorded_by ?? null,
      }));

      // Upsert to avoid duplicate per student per date
      const { data, error } = await supabase
        .from("daily_feeding_attendance")
        .upsert(attendanceRecords, {
          onConflict: "student_id, date",
          ignoreDuplicates: false,
        })
        .select("*, student:students(*, class:classes(*))");

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ data, count: data?.length ?? 0 }, { status: 201 });
    }

    // Single student attendance record
    const { student_id, date, was_fed, recorded_by } = body;

    if (!student_id) {
      return NextResponse.json(
        { error: "student_id is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("daily_feeding_attendance")
      .upsert(
        [
          {
            student_id,
            date: date ?? new Date().toISOString().split("T")[0],
            was_fed: was_fed ?? true,
            recorded_by: recorded_by ?? null,
          },
        ],
        { onConflict: "student_id, date", ignoreDuplicates: false }
      )
      .select("*, student:students(*)")
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
