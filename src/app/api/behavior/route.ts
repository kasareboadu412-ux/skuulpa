import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const student_id = searchParams.get("student_id");
    const teacher_id = searchParams.get("teacher_id");
    const type = searchParams.get("type");
    const date_from = searchParams.get("date_from");
    const date_to = searchParams.get("date_to");
    const shared_with_parent = searchParams.get("shared_with_parent");

    let query = supabase
      .from("behavior_logs")
      .select("*, student:students(*, class:classes(*)), teacher:teachers(*)")
      .order("date", { ascending: false });

    if (student_id) {
      query = query.eq("student_id", student_id);
    }
    if (teacher_id) {
      query = query.eq("teacher_id", teacher_id);
    }
    if (type) {
      query = query.eq("type", type);
    }
    if (date_from) {
      query = query.gte("date", date_from);
    }
    if (date_to) {
      query = query.lte("date", date_to);
    }
    if (shared_with_parent !== null) {
      query = query.eq("shared_with_parent", shared_with_parent === "true");
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

    const { data, error } = await supabase
      .from("behavior_logs")
      .insert([body])
      .select("*, student:students(*, class:classes(*)), teacher:teachers(*)")
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
