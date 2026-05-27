import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireParent, verifyParentOwnsStudent } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireParent();
  if (auth instanceof NextResponse) return auth;
  const { userId, parentPhone } = auth;

  try {
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get("studentId");
    const termId = searchParams.get("termId");

    if (!studentId) return NextResponse.json({ error: "studentId is required" }, { status: 400 });

    if (!await verifyParentOwnsStudent(studentId, userId, parentPhone)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = getServiceClient();

    let reportCardQuery = supabase
      .from("report_cards")
      .select("id, generated_at, pdf_url, overall_position, total_score, average_score, teacher_comments, headteacher_remarks, data, term_id, term:term_id(id, name, start_date, end_date, academic_year:academic_year_id(id, name))")
      .eq("student_id", studentId)
      .order("generated_at", { ascending: false });

    if (termId) reportCardQuery = reportCardQuery.eq("term_id", termId);

    const { data: reportCards, error: rcError } = await reportCardQuery;
    if (rcError) return NextResponse.json({ error: rcError.message }, { status: 500 });

    let assessmentQuery = supabase
      .from("assessment_scores")
      .select("id, score, remarks, assessment_id, assessment:assessment_id(id, name, type, max_score, ca_weight_pct, date, subject:subject_id(id, name, code, is_core), term:term_id(id, name))")
      .eq("student_id", studentId);

    if (termId) assessmentQuery = assessmentQuery.eq("assessment.term_id", termId);

    const { data: assessmentScores, error: asError } = await assessmentQuery;
    if (asError) return NextResponse.json({ error: asError.message }, { status: 500 });

    // Group scores by subject
    const subjectScores: Record<string, { subject: { id: string; name: string; code: string | null; is_core: boolean }; scores: { assessmentName: string; type: string | null; score: number | null; maxScore: number; remarks: string | null; date: string | null }[] }> = {};

    for (const as_ of assessmentScores ?? []) {
      const assessment = (as_ as unknown as { assessment: { id: string; name: string; type: string | null; max_score: number; date: string | null; subject: { id: string; name: string; code: string | null; is_core: boolean } } | null }).assessment;
      if (!assessment?.subject) continue;
      const subject = assessment.subject;
      if (!subjectScores[subject.id]) subjectScores[subject.id] = { subject, scores: [] };
      subjectScores[subject.id].scores.push({ assessmentName: assessment.name, type: assessment.type, score: (as_ as { score: number | null }).score, maxScore: assessment.max_score, remarks: (as_ as { remarks: string | null }).remarks, date: assessment.date });
    }

    return NextResponse.json({ reportCards: reportCards ?? [], subjectScores: Object.values(subjectScores) });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
