import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getServiceClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get("studentId");
    const termId = searchParams.get("termId");

    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Get report cards for the student
    let reportCardQuery = supabase
      .from("report_cards")
      .select(`
        id,
        generated_at,
        pdf_url,
        overall_position,
        total_score,
        average_score,
        teacher_comments,
        headteacher_remarks,
        data,
        term_id,
        term:term_id (
          id,
          name,
          start_date,
          end_date,
          academic_year:academic_year_id (
            id,
            name
          )
        )
      `)
      .eq("student_id", studentId)
      .order("generated_at", { ascending: false });

    if (termId) {
      reportCardQuery = reportCardQuery.eq("term_id", termId);
    }

    const { data: rawReportCards, error: rcError } = await reportCardQuery;
    const reportCards = (rawReportCards || []) as unknown as {
      id: string;
      generated_at: string;
      pdf_url: string | null;
      overall_position: number | null;
      total_score: number | null;
      average_score: number | null;
      teacher_comments: string | null;
      headteacher_remarks: string | null;
      data: Record<string, unknown> | null;
      term: {
        id: string;
        name: string;
        start_date: string;
        end_date: string;
        academic_year: { id: string; name: string };
      } | null;
    }[];

    if (rcError) {
      return NextResponse.json({ error: rcError.message }, { status: 500 });
    }

    // Get assessment scores for the student with assessment details
    let assessmentQuery = supabase
      .from("assessment_scores")
      .select(`
        id,
        score,
        remarks,
        assessment_id,
        assessment:assessment_id (
          id,
          name,
          type,
          max_score,
          ca_weight_pct,
          date,
          subject:subject_id (
            id,
            name,
            code,
            is_core
          ),
          term:term_id (
            id,
            name
          )
        )
      `)
      .eq("student_id", studentId);

    if (termId) {
      assessmentQuery = assessmentQuery.eq("assessment.term_id", termId);
    }

    const { data: rawScores, error: asError } = await assessmentQuery;
    const assessmentScores = (rawScores || []) as unknown as {
      id: string;
      score: number | null;
      remarks: string | null;
      assessment: {
        id: string;
        name: string;
        type: string | null;
        max_score: number;
        ca_weight_pct: number;
        date: string | null;
        subject: { id: string; name: string; code: string | null; is_core: boolean };
        term: { id: string; name: string };
      } | null;
    }[];

    if (asError) {
      return NextResponse.json({ error: asError.message }, { status: 500 });
    }

    // Group scores by subject
    const subjectScores: Record<string, {
      subject: { id: string; name: string; code: string | null; is_core: boolean };
      scores: { assessmentName: string; type: string | null; score: number | null; maxScore: number; remarks: string | null; date: string | null }[];
    }> = {};

    for (const as of assessmentScores) {
      const assessment = as.assessment;
      if (!assessment) continue;
      const subject = assessment.subject;
      if (!subject) continue;

      if (!subjectScores[subject.id]) {
        subjectScores[subject.id] = { subject, scores: [] };
      }

      subjectScores[subject.id].scores.push({
        assessmentName: assessment.name,
        type: assessment.type,
        score: as.score,
        maxScore: assessment.max_score,
        remarks: as.remarks,
        date: assessment.date,
      });
    }

    return NextResponse.json({
      reportCards,
      subjectScores: Object.values(subjectScores),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
