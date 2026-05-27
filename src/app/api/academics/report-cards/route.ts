import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const student_id = searchParams.get("student_id");
    const term_id = searchParams.get("term_id");
    const class_id = searchParams.get("class_id");

    let query = supabase
      .from("report_cards")
      .select("*, student:students(*, class:classes(*)), term:terms(*, academic_year:academic_years(*))")
      .order("generated_at", { ascending: false });

    if (student_id) {
      query = query.eq("student_id", student_id);
    }
    if (term_id) {
      query = query.eq("term_id", term_id);
    }
    if (class_id) {
      query = query.eq("student.class_id", class_id);
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
    const { student_id, term_id, teacher_comments, headteacher_remarks } = body;

    if (!student_id || !term_id) {
      return NextResponse.json(
        { error: "student_id and term_id are required" },
        { status: 400 }
      );
    }

    // Check if report already exists
    const { data: existingReport } = await supabase
      .from("report_cards")
      .select("id")
      .eq("student_id", student_id)
      .eq("term_id", term_id)
      .single();

    if (existingReport) {
      return NextResponse.json(
        { error: "Report card already exists for this student and term", existing_id: existingReport.id },
        { status: 409 }
      );
    }

    // Get student and class info
    const { data: student } = await supabase
      .from("students")
      .select("*, class:classes(*)")
      .eq("id", student_id)
      .single();

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Get all assessments for this class and term
    const { data: assessments } = await supabase
      .from("assessments")
      .select("*, subject:subjects(*)")
      .eq("class_id", student.class_id)
      .eq("term_id", term_id);

    if (!assessments || assessments.length === 0) {
      return NextResponse.json(
        { error: "No assessments found for this student's class and term" },
        { status: 404 }
      );
    }

    // Get all scores for this student across these assessments
    const assessmentIds = assessments.map((a) => a.id);
    const { data: scores } = await supabase
      .from("assessment_scores")
      .select("*, assessment:assessments(*, subject:subjects(*))")
      .in("assessment_id", assessmentIds)
      .eq("student_id", student_id);

    // Group scores by subject
    const scoresBySubject = new Map<string, { subject: any; scores: any[]; totalMax: number; totalScore: number }>();
    for (const score of scores ?? []) {
      const subjectId = score.assessment.subject?.id ?? "unknown";
      if (!scoresBySubject.has(subjectId)) {
        scoresBySubject.set(subjectId, {
          subject: score.assessment.subject,
          scores: [],
          totalMax: 0,
          totalScore: 0,
        });
      }
      const entry = scoresBySubject.get(subjectId)!;
      entry.scores.push(score);
      entry.totalMax += Number(score.assessment.max_score);
      entry.totalScore += Number(score.score ?? 0);
    }

    // Build subject grades
    const subjectGrades: any[] = [];
    let totalScore = 0;
    let totalMaxPossible = 0;

    for (const [, entry] of scoresBySubject) {
      const percentage =
        entry.totalMax > 0
          ? Math.round((entry.totalScore / entry.totalMax) * 10000) / 100
          : 0;

      let grade: string;
      let gradePoint: number;
      if (percentage >= 80) { grade = "A"; gradePoint = 1; }
      else if (percentage >= 70) { grade = "B"; gradePoint = 2; }
      else if (percentage >= 60) { grade = "C"; gradePoint = 3; }
      else if (percentage >= 50) { grade = "D"; gradePoint = 4; }
      else { grade = "F"; gradePoint = 5; }

      subjectGrades.push({
        subject: entry.subject,
        total_score: entry.totalScore,
        max_score: entry.totalMax,
        percentage,
        grade,
        grade_point: gradePoint,
        assessments: entry.scores,
      });

      totalScore += entry.totalScore;
      totalMaxPossible += entry.totalMax;
    }

    const averageScore =
      subjectGrades.length > 0
        ? Math.round((totalScore / subjectGrades.length) * 100) / 100
        : 0;

    // Calculate positions — get all students in same class for ranking
    const { data: allStudents } = await supabase
      .from("students")
      .select("id")
      .eq("class_id", student.class_id)
      .eq("status", "active");

    // Get total scores for all students to determine position
    let overallPosition = 1;
    if (allStudents && allStudents.length > 1) {
      const studentScores: { student_id: string; total: number }[] = [];
      for (const s of allStudents) {
        const { data: otherScores } = await supabase
          .from("assessment_scores")
          .select("score")
          .in("assessment_id", assessmentIds)
          .eq("student_id", s.id);

        const otherTotal =
          otherScores?.reduce((sum, sc) => sum + Number(sc.score ?? 0), 0) ?? 0;
        studentScores.push({ student_id: s.id, total: otherTotal });
      }

      studentScores.sort((a, b) => b.total - a.total);
      const rank = studentScores.findIndex((s) => s.student_id === student_id);
      if (rank >= 0) overallPosition = rank + 1;
    }

    // Build report card data snapshot
    const reportData = {
      student: {
        id: student.id,
        name: `${student.first_name} ${student.last_name}`,
        admission_number: student.admission_number,
        class: student.class?.name ?? "",
      },
      subjects: subjectGrades,
      summary: {
        total_score: totalScore,
        total_max_possible: totalMaxPossible,
        average_score: averageScore,
        subjects_count: subjectGrades.length,
        overall_position: overallPosition,
        total_students: allStudents?.length ?? 1,
      },
    };

    const { data, error } = await supabase
      .from("report_cards")
      .insert([
        {
          student_id,
          term_id,
          overall_position: overallPosition,
          total_score: totalScore,
          average_score: averageScore,
          teacher_comments: teacher_comments ?? null,
          headteacher_remarks: headteacher_remarks ?? null,
          data: reportData,
        },
      ])
      .select("*, student:students(*, class:classes(*)), term:terms(*, academic_year:academic_years(*))")
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
