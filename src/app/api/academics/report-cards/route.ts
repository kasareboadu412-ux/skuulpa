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
    const term_id = searchParams.get("term_id");
    const class_id = searchParams.get("class_id");

    let query = supabase
      .from("report_cards")
      .select("*, student:students!inner(id, first_name, last_name, school_id, class:classes(*)), term:terms(*, academic_year:academic_years(*))")
      .eq("student.school_id", schoolId)
      .order("generated_at", { ascending: false });

    if (student_id) query = query.eq("student_id", student_id);
    if (term_id) query = query.eq("term_id", term_id);
    if (class_id) query = query.eq("student.class_id", class_id);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: "Failed to fetch report cards" }, { status: 400 });
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
    const { student_id, term_id, teacher_comments, headteacher_remarks } = body;

    if (!student_id || !term_id) {
      return NextResponse.json({ error: "student_id and term_id are required" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("report_cards")
      .select("id")
      .eq("student_id", student_id)
      .eq("term_id", term_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Report card already exists for this student and term", existing_id: existing.id },
        { status: 409 }
      );
    }

    const { data: student } = await supabase
      .from("students")
      .select("*, class:classes(*)")
      .eq("id", student_id)
      .eq("school_id", schoolId)
      .single();

    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const { data: assessments } = await supabase
      .from("assessments")
      .select("*, subject:subjects(*)")
      .eq("class_id", student.class_id)
      .eq("term_id", term_id);

    if (!assessments || assessments.length === 0) {
      return NextResponse.json({ error: "No assessments found for this student's class and term" }, { status: 404 });
    }

    const assessmentIds = assessments.map((a) => a.id);

    // Fetch this student's scores
    const { data: scores } = await supabase
      .from("assessment_scores")
      .select("*, assessment:assessments(*, subject:subjects(*))")
      .in("assessment_id", assessmentIds)
      .eq("student_id", student_id);

    // Group scores by subject
    const scoresBySubject = new Map<string, { subject: { id: string; name: string }; scores: { score: number | null; max_score: number }[]; totalMax: number; totalScore: number }>();
    for (const score of scores ?? []) {
      const subjectId = score.assessment.subject?.id ?? "unknown";
      if (!scoresBySubject.has(subjectId)) {
        scoresBySubject.set(subjectId, { subject: score.assessment.subject, scores: [], totalMax: 0, totalScore: 0 });
      }
      const entry = scoresBySubject.get(subjectId)!;
      entry.scores.push(score);
      entry.totalMax += Number(score.assessment.max_score);
      entry.totalScore += Number(score.score ?? 0);
    }

    const subjectGrades: Array<{ subject: { id: string; name: string }; total_score: number; max_score: number; percentage: number; grade: string; grade_point: number; assessments: unknown[] }> = [];
    let totalScore = 0;
    let totalMaxPossible = 0;

    for (const [, entry] of scoresBySubject) {
      const percentage = entry.totalMax > 0 ? Math.round((entry.totalScore / entry.totalMax) * 10000) / 100 : 0;

      let grade: string;
      let gradePoint: number;
      if (percentage >= 80) { grade = "A"; gradePoint = 1; }
      else if (percentage >= 70) { grade = "B"; gradePoint = 2; }
      else if (percentage >= 60) { grade = "C"; gradePoint = 3; }
      else if (percentage >= 50) { grade = "D"; gradePoint = 4; }
      else { grade = "F"; gradePoint = 5; }

      subjectGrades.push({ subject: entry.subject, total_score: entry.totalScore, max_score: entry.totalMax, percentage, grade, grade_point: gradePoint, assessments: entry.scores });
      totalScore += entry.totalScore;
      totalMaxPossible += entry.totalMax;
    }

    // Correct average: percentage of total max, not score-per-subject
    const averageScore = totalMaxPossible > 0 ? Math.round((totalScore / totalMaxPossible) * 10000) / 100 : 0;

    // Class ranking — bulk fetch all students' scores to avoid N+1
    const { data: classStudents } = await supabase
      .from("students")
      .select("id")
      .eq("class_id", student.class_id)
      .eq("school_id", schoolId)
      .eq("status", "active");

    let overallPosition = 1;
    if (classStudents && classStudents.length > 1) {
      // One query for all students' scores, not one per student
      const { data: allClassScores } = await supabase
        .from("assessment_scores")
        .select("student_id, score")
        .in("assessment_id", assessmentIds);

      // Aggregate totals per student using a Map
      const totalsMap = new Map<string, number>();
      for (const s of classStudents) totalsMap.set(s.id, 0);
      for (const sc of allClassScores ?? []) {
        totalsMap.set(sc.student_id, (totalsMap.get(sc.student_id) ?? 0) + Number(sc.score ?? 0));
      }

      const sorted = Array.from(totalsMap.entries()).sort((a, b) => b[1] - a[1]);
      const rank = sorted.findIndex(([sid]) => sid === student_id);
      if (rank >= 0) overallPosition = rank + 1;
    }

    const reportData = {
      student: { id: student.id, name: `${student.first_name} ${student.last_name}`, admission_number: student.admission_number, class: student.class?.name ?? "" },
      subjects: subjectGrades,
      summary: { total_score: totalScore, total_max_possible: totalMaxPossible, average_score: averageScore, subjects_count: subjectGrades.length, overall_position: overallPosition, total_students: classStudents?.length ?? 1 },
    };

    const { data, error } = await supabase
      .from("report_cards")
      .insert([{ student_id, term_id, overall_position: overallPosition, total_score: totalScore, average_score: averageScore, teacher_comments: teacher_comments ?? null, headteacher_remarks: headteacher_remarks ?? null, data: reportData }])
      .select("*, student:students(*, class:classes(*)), term:terms(*, academic_year:academic_years(*))")
      .single();

    if (error) return NextResponse.json({ error: "Failed to generate report card" }, { status: 400 });
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
