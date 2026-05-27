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
    const student_id = searchParams.get("student_id");
    const teacher_id = searchParams.get("teacher_id");
    const type = searchParams.get("type");
    const date_from = searchParams.get("date_from");
    const date_to = searchParams.get("date_to");
    const shared_with_parent = searchParams.get("shared_with_parent");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "50");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("behavior_logs")
      .select("*, student:students!inner(id, first_name, last_name, school_id, class:classes(*)), teacher:teachers(*)", { count: "exact" })
      .eq("student.school_id", schoolId)
      .order("date", { ascending: false });

    if (student_id) query = query.eq("student_id", student_id);
    if (teacher_id) query = query.eq("teacher_id", teacher_id);
    if (type) query = query.eq("type", type);
    if (date_from) query = query.gte("date", date_from);
    if (date_to) query = query.lte("date", date_to);
    if (shared_with_parent !== null) query = query.eq("shared_with_parent", shared_with_parent === "true");

    const { data, error, count } = await query.range(offset, offset + limit - 1);
    if (error) return NextResponse.json({ error: "Failed to fetch behavior logs" }, { status: 400 });
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
    const { student_id } = body;

    if (!student_id) return NextResponse.json({ error: "student_id is required" }, { status: 400 });

    // Verify student belongs to this school
    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("id", student_id)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const { data, error } = await supabase
      .from("behavior_logs")
      .insert([body])
      .select("*, student:students(*, class:classes(*)), teacher:teachers(*)")
      .single();

    if (error) return NextResponse.json({ error: "Failed to create behavior log" }, { status: 400 });
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
