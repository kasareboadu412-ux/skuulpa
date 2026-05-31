import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireStaff } from "@/lib/auth-guard";

export const runtime = "nodejs";

/**
 * GET /api/academics/lesson-notes?scheme_id=&class_id=&term_id=
 * Staff (admin/proprietor) view of lesson notes across all classes.
 * Teachers can also fetch their own.
 */
export async function GET(request: NextRequest) {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { schoolId } = auth;

  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const scheme_id = searchParams.get("scheme_id");
    const class_id = searchParams.get("class_id");
    const term_id = searchParams.get("term_id");

    let query = supabase
      .from("lesson_notes")
      .select(`
        *,
        scheme:schemes_of_work!inner(
          id, title, week_number, topics_covered, objectives, status,
          class:classes!inner(id, name, school_id),
          subject:subjects(id, name),
          term:terms(id, name),
          teacher:teachers(id, first_name, last_name)
        )
      `)
      .eq("scheme.class.school_id", schoolId)
      .order("date", { ascending: false });

    if (scheme_id) query = query.eq("scheme_of_work_id", scheme_id);
    if (class_id) query = query.eq("scheme.class_id", class_id);
    if (term_id) query = query.eq("scheme.term_id", term_id);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: "Failed to fetch lesson notes" }, { status: 400 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/academics/lesson-notes
 * Teachers create a lesson note under a scheme.
 */
export async function POST(request: NextRequest) {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { schoolId, userId } = auth;

  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { scheme_of_work_id, date, topic, content } = body;

    if (!scheme_of_work_id || !date || !topic) {
      return NextResponse.json({ error: "scheme_of_work_id, date and topic are required" }, { status: 400 });
    }

    // Verify the scheme belongs to this school.
    const { data: scheme } = await supabase
      .from("schemes_of_work")
      .select("id, class:classes!inner(school_id)")
      .eq("id", scheme_of_work_id)
      .eq("class.school_id", schoolId)
      .maybeSingle();

    if (!scheme) return NextResponse.json({ error: "Scheme not found" }, { status: 404 });

    const { data, error } = await supabase
      .from("lesson_notes")
      .insert([{ scheme_of_work_id, teacher_id: userId, date, topic, content: content ?? null }])
      .select("*, scheme:schemes_of_work(*, class:classes(*), subject:subjects(*), term:terms(*))")
      .single();

    if (error) return NextResponse.json({ error: "Failed to create lesson note" }, { status: 400 });
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
