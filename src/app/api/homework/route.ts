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
    const teacher_id = searchParams.get("teacher_id");
    const due_before = searchParams.get("due_before");
    const due_after = searchParams.get("due_after");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "50");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("homework")
      .select("*, class:classes!inner(id, name, school_id), subject:subjects(*), teacher:teachers(*), homework_views(count)", { count: "exact" })
      .eq("class.school_id", schoolId)
      .order("created_at", { ascending: false });

    if (class_id) query = query.eq("class_id", class_id);
    if (subject_id) query = query.eq("subject_id", subject_id);
    if (teacher_id) query = query.eq("teacher_id", teacher_id);
    if (due_before) query = query.lte("due_date", due_before);
    if (due_after) query = query.gte("due_date", due_after);

    const { data, error, count } = await query.range(offset, offset + limit - 1);
    if (error) return NextResponse.json({ error: "Failed to fetch homework" }, { status: 400 });
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
    const { class_id } = body;

    if (!class_id) return NextResponse.json({ error: "class_id is required" }, { status: 400 });

    // Verify class belongs to this school
    const { data: classRow } = await supabase
      .from("classes")
      .select("id")
      .eq("id", class_id)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (!classRow) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    const { data, error } = await supabase
      .from("homework")
      .insert([body])
      .select("*, class:classes(*), subject:subjects(*), teacher:teachers(*)")
      .single();

    if (error) return NextResponse.json({ error: "Failed to create homework" }, { status: 400 });
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
