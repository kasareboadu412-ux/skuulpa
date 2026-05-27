import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const class_id = searchParams.get("class_id");
    const subject_id = searchParams.get("subject_id");
    const term_id = searchParams.get("term_id");
    const type = searchParams.get("type");

    let query = supabase
      .from("assessments")
      .select("*, class:classes(*), subject:subjects(*), term:terms(*), assessment_scores(count)")
      .order("date", { ascending: false });

    if (class_id) {
      query = query.eq("class_id", class_id);
    }
    if (subject_id) {
      query = query.eq("subject_id", subject_id);
    }
    if (term_id) {
      query = query.eq("term_id", term_id);
    }
    if (type) {
      query = query.eq("type", type);
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

    const { data, error } = await supabase
      .from("assessments")
      .insert([body])
      .select("*, class:classes(*), subject:subjects(*), term:terms(*)")
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
