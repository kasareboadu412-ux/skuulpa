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
    const assessment_id = searchParams.get("assessment_id");
    const student_id = searchParams.get("student_id");
    const class_id = searchParams.get("class_id");

    let query = supabase
      .from("assessment_scores")
      .select("*, assessment:assessments!inner(id, name, class:classes!inner(id, name, school_id), subject:subjects(*)), student:students(*)")
      .eq("assessment.class.school_id", schoolId)
      .order("created_at", { ascending: false });

    if (assessment_id) query = query.eq("assessment_id", assessment_id);
    if (student_id) query = query.eq("student_id", student_id);
    if (class_id) query = query.eq("assessment.class_id", class_id);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: "Failed to fetch scores" }, { status: 400 });
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

    if (Array.isArray(body.scores)) {
      const { scores, assessment_id } = body;

      if (!assessment_id || !scores || scores.length === 0) {
        return NextResponse.json({ error: "assessment_id and scores array are required" }, { status: 400 });
      }

      // Verify assessment belongs to this school via class
      const { data: assessment } = await supabase
        .from("assessments")
        .select("max_score, class:classes!inner(school_id)")
        .eq("id", assessment_id)
        .eq("class.school_id", schoolId)
        .maybeSingle();

      if (!assessment) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });

      const validatedScores = scores.map((s: { student_id: string; score?: number; remarks?: string }) => ({
        assessment_id,
        student_id: s.student_id,
        score: s.score !== undefined ? s.score : null,
        remarks: s.remarks ?? null,
      }));

      const { data, error } = await supabase
        .from("assessment_scores")
        .upsert(validatedScores, { onConflict: "assessment_id, student_id", ignoreDuplicates: false })
        .select("*, assessment:assessments(*), student:students(*)");

      if (error) return NextResponse.json({ error: "Failed to save scores" }, { status: 400 });
      return NextResponse.json({ data, count: data?.length ?? 0 }, { status: 201 });
    }

    const { assessment_id, student_id, score, remarks } = body;

    if (!assessment_id || !student_id) {
      return NextResponse.json({ error: "assessment_id and student_id are required" }, { status: 400 });
    }

    // Verify assessment belongs to this school
    const { data: assessment } = await supabase
      .from("assessments")
      .select("id, class:classes!inner(school_id)")
      .eq("id", assessment_id)
      .eq("class.school_id", schoolId)
      .maybeSingle();

    if (!assessment) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });

    const { data, error } = await supabase
      .from("assessment_scores")
      .upsert(
        [{ assessment_id, student_id, score: score ?? null, remarks: remarks ?? null }],
        { onConflict: "assessment_id, student_id", ignoreDuplicates: false }
      )
      .select("*, assessment:assessments(*), student:students(*)")
      .single();

    if (error) return NextResponse.json({ error: "Failed to save score" }, { status: 400 });
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
