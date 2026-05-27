import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacher_id = searchParams.get("teacher_id");
    const date = searchParams.get("date");
    const date_from = searchParams.get("date_from");
    const date_to = searchParams.get("date_to");
    const school_id = searchParams.get("school_id");

    let query = supabase
      .from("teacher_attendance")
      .select("*, teacher:teachers(*)")
      .order("date", { ascending: false });

    if (teacher_id) {
      query = query.eq("teacher_id", teacher_id);
    }
    if (date) {
      query = query.eq("date", date);
    }
    if (date_from) {
      query = query.gte("date", date_from);
    }
    if (date_to) {
      query = query.lte("date", date_to);
    }
    if (school_id) {
      query = query.eq("teacher.school_id", school_id);
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
    const { teacher_id, date, clock_in_time, clock_out_time, recorded_by } = body;

    if (!teacher_id) {
      return NextResponse.json(
        { error: "teacher_id is required" },
        { status: 400 }
      );
    }

    const today = date ?? new Date().toISOString().split("T")[0];

    // Check if attendance record exists for today
    const { data: existing } = await supabase
      .from("teacher_attendance")
      .select("*")
      .eq("teacher_id", teacher_id)
      .eq("date", today)
      .single();

    if (existing) {
      // Update existing record — clock in/out
      const updateData: Record<string, unknown> = {};

      if (clock_in_time) {
        updateData.clock_in_time = clock_in_time;
        updateData.is_present = true;

        // Check if late (e.g., after 7:30 AM)
        if (clock_in_time > "07:30:00") {
          updateData.is_late = true;
          // Calculate late minutes
          const [h, m] = clock_in_time.split(":").map(Number);
          const lateMinutes = (h - 7) * 60 + m - 30;
          updateData.late_minutes = Math.max(0, lateMinutes);
        }
      }

      if (clock_out_time) {
        updateData.clock_out_time = clock_out_time;
      }

      const { data, error } = await supabase
        .from("teacher_attendance")
        .update(updateData)
        .eq("id", existing.id)
        .select("*, teacher:teachers(*)")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ data });
    }

    // Create new attendance record
    const is_late = clock_in_time && clock_in_time > "07:30:00";
    let lateMinutes = 0;
    if (is_late && clock_in_time) {
      const [h, m] = clock_in_time.split(":").map(Number);
      lateMinutes = (h - 7) * 60 + m - 30;
    }

    const { data, error } = await supabase
      .from("teacher_attendance")
      .insert([
        {
          teacher_id,
          date: today,
          clock_in_time: clock_in_time ?? null,
          clock_out_time: clock_out_time ?? null,
          is_present: !!clock_in_time,
          is_late,
          late_minutes: Math.max(0, lateMinutes),
          recorded_by: recorded_by ?? null,
        },
      ])
      .select("*, teacher:teachers(*)")
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
