import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const student_id = searchParams.get("student_id");
    const school_id = searchParams.get("school_id");

    let query = supabase
      .from("feeding_subscriptions")
      .select("*, student:students(*), feeding_plan:feeding_plans(*)")
      .order("created_at", { ascending: false });

    if (student_id) {
      query = query.eq("student_id", student_id);
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

    const { student_id, feeding_plan_id, days_per_week, start_date, end_date } = body;

    if (!student_id || !feeding_plan_id || !start_date) {
      return NextResponse.json(
        { error: "student_id, feeding_plan_id, and start_date are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("feeding_subscriptions")
      .insert([
        {
          student_id,
          feeding_plan_id,
          days_per_week: days_per_week ?? 5,
          start_date,
          end_date: end_date ?? null,
          is_active: true,
        },
      ])
      .select("*, student:students(*), feeding_plan:feeding_plans(*)")
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
