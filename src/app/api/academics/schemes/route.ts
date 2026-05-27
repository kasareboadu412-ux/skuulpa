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
    const class_id = searchParams.get("class_id");
    const subject_id = searchParams.get("subject_id");
    const term_id = searchParams.get("term_id");
    const status = searchParams.get("status");

    let query = supabase
      .from("schemes_of_work")
      .select("*, class:classes!inner(id, name, school_id), subject:subjects(*), term:terms(*), lesson_notes(count)")
      .eq("class.school_id", schoolId)
      .order("week_number", { ascending: true });

    if (class_id) query = query.eq("class_id", class_id);
    if (subject_id) query = query.eq("subject_id", subject_id);
    if (term_id) query = query.eq("term_id", term_id);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: "Failed to fetch schemes of work" }, { status: 400 });
    return NextResponse.json({ data });
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
    const { class_id } = body;

    if (!class_id) return NextResponse.json({ error: "class_id is required" }, { status: 400 });

    const { data: classRow } = await supabase
      .from("classes")
      .select("id")
      .eq("id", class_id)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (!classRow) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    const { data, error } = await supabase
      .from("schemes_of_work")
      .insert([body])
      .select("*, class:classes(*), subject:subjects(*), term:terms(*)")
      .single();

    if (error) return NextResponse.json({ error: "Failed to create scheme of work" }, { status: 400 });
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
