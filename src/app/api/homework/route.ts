import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const class_id = searchParams.get("class_id");
    const subject_id = searchParams.get("subject_id");
    const teacher_id = searchParams.get("teacher_id");
    const due_before = searchParams.get("due_before");
    const due_after = searchParams.get("due_after");

    let query = supabase
      .from("homework")
      .select("*, class:classes(*), subject:subjects(*), teacher:teachers(*), homework_views(count)")
      .order("created_at", { ascending: false });

    if (class_id) {
      query = query.eq("class_id", class_id);
    }
    if (subject_id) {
      query = query.eq("subject_id", subject_id);
    }
    if (teacher_id) {
      query = query.eq("teacher_id", teacher_id);
    }
    if (due_before) {
      query = query.lte("due_date", due_before);
    }
    if (due_after) {
      query = query.gte("due_date", due_after);
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
      .from("homework")
      .insert([body])
      .select("*, class:classes(*), subject:subjects(*), teacher:teachers(*)")
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
