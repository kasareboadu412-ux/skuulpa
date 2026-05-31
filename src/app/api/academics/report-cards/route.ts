import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireStaffModule } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireStaffModule("academics");
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

// ── Grade bands (Ghana basic school) ──
function gradeFor(pct: number): { grade: string; gradePoint: number; remark: string } {
  if (pct >= 80) return { grade: "A", gradePoint: 1, remark: "Excellent" };
  if (pct >= 70) return { grade: "B", gradePoint: 2, remark: "Very Good" };
  if (pct >= 60) return { grade: "C", gradePoint: 3, remark: "Good" };
  if (pct >= 50) return { grade: "D", gradePoint: 4, remark: "Credit" };
  if (pct >= 40) return { grade: "E", gradePoint: 5, remark: "Pass" };
  return { grade: "F", gradePoint: 6, remark: "Fail" };
}

interface AssessmentRow {
  id: string;
  type: string | null;
  max_score: number;
  subject_id: string | null;
  subject?: { id: string; name: string } | { id: string; name: string }[] | null;
}

interface SubjectGrade {
  subject_id: string;
  subject_name: string;
  ca_score: number;
  ca_max: number;
  ca_pct: number | null;
  exam_score: number;
  exam_max: number;
  exam_pct: number | null;
  final_pct: number;
  grade: string;
  grade_point: number;
  remark: string;
}

interface StudentReport {
  subjects: SubjectGrade[];
  total_score: number;
  total_max: number;
  average: number; // weighted overall %
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Compute a single student's weighted subject grades + overall average. */
function computeReport(
  assessments: AssessmentRow[],
  scores: Map<string, number>, // assessment_id -> score
  caW: number
): StudentReport {
  const examW = 1 - caW;

  // Group assessments by subject.
  const bySubject = new Map<string, { name: string; items: AssessmentRow[] }>();
  for (const a of assessments) {
    const subj = Array.isArray(a.subject) ? a.subject[0] : a.subject;
    const sid = a.subject_id ?? subj?.id ?? "unknown";
    if (!bySubject.has(sid)) bySubject.set(sid, { name: subj?.name ?? "Subject", items: [] });
    bySubject.get(sid)!.items.push(a);
  }

  const subjects: SubjectGrade[] = [];
  let totalScore = 0;
  let totalMax = 0;
  const finals: number[] = [];

  for (const [subjectId, { name, items }] of bySubject) {
    let caScore = 0, caMax = 0, examScore = 0, examMax = 0;
    let hasAnyScore = false;

    for (const a of items) {
      const raw = scores.get(a.id);
      const max = Number(a.max_score) || 0;
      if (raw === undefined || raw === null) continue; // unscored assessment skipped
      hasAnyScore = true;
      const s = Number(raw);
      if (a.type === "exam") { examScore += s; examMax += max; }
      else { caScore += s; caMax += max; }
    }

    if (!hasAnyScore) continue; // no scores for this subject yet

    const caPct = caMax > 0 ? round2((caScore / caMax) * 100) : null;
    const examPct = examMax > 0 ? round2((examScore / examMax) * 100) : null;

    let finalPct: number;
    if (caPct !== null && examPct !== null) finalPct = round2(caPct * caW + examPct * examW);
    else if (caPct !== null) finalPct = caPct;
    else finalPct = examPct ?? 0;

    const { grade, gradePoint, remark } = gradeFor(finalPct);
    subjects.push({
      subject_id: subjectId,
      subject_name: name,
      ca_score: round2(caScore), ca_max: caMax, ca_pct: caPct,
      exam_score: round2(examScore), exam_max: examMax, exam_pct: examPct,
      final_pct: finalPct, grade, grade_point: gradePoint, remark,
    });

    totalScore += caScore + examScore;
    totalMax += caMax + examMax;
    finals.push(finalPct);
  }

  const average = finals.length > 0 ? round2(finals.reduce((a, b) => a + b, 0) / finals.length) : 0;
  return { subjects, total_score: round2(totalScore), total_max: totalMax, average };
}

export async function POST(request: NextRequest) {
  const auth = await requireStaffModule("academics");
  if (auth instanceof NextResponse) return auth;
  const { schoolId } = auth;

  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { student_id, class_id, term_id, teacher_comments, headteacher_remarks } = body;

    if (!term_id || (!student_id && !class_id)) {
      return NextResponse.json({ error: "term_id and either student_id or class_id are required" }, { status: 400 });
    }

    // Resolve the class to report on.
    let classId = class_id as string | undefined;
    if (!classId && student_id) {
      const { data: st } = await supabase
        .from("students").select("class_id").eq("id", student_id).eq("school_id", schoolId).maybeSingle();
      classId = (st as { class_id: string | null } | null)?.class_id ?? undefined;
    } else if (classId) {
      const { data: cls } = await supabase
        .from("classes").select("id").eq("id", classId).eq("school_id", schoolId).maybeSingle();
      if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }
    if (!classId) return NextResponse.json({ error: "Student is not assigned to a class" }, { status: 400 });

    // CA/exam split — from request, else school settings, else 50/50.
    const { data: school } = await supabase
      .from("schools").select("name, settings").eq("id", schoolId).maybeSingle();
    const settings = (school as { settings?: Record<string, unknown> } | null)?.settings ?? {};
    // CA share of the final grade; exam takes the rest. Default 30% CA / 70% exam.
    const caWeightPct = Number(body.ca_weight ?? settings.ca_weight_pct ?? 30);
    const caW = Math.min(100, Math.max(0, caWeightPct)) / 100;

    // Assessments for this class + term.
    const { data: assessments } = await supabase
      .from("assessments")
      .select("id, type, max_score, subject_id, subject:subjects(id, name)")
      .eq("class_id", classId)
      .eq("term_id", term_id);

    if (!assessments || assessments.length === 0) {
      return NextResponse.json({ error: "No assessments found for this class and term" }, { status: 404 });
    }
    const assessmentIds = assessments.map((a) => a.id);

    // All scores for the class (one query) + all active students.
    const [{ data: allScores }, { data: classStudents }] = await Promise.all([
      supabase.from("assessment_scores").select("student_id, assessment_id, score").in("assessment_id", assessmentIds),
      supabase.from("students").select("id, first_name, last_name, admission_number").eq("class_id", classId).eq("school_id", schoolId).eq("status", "active"),
    ]);

    const students = classStudents ?? [];
    if (students.length === 0) return NextResponse.json({ error: "No active students in this class" }, { status: 404 });

    // Build per-student score maps.
    const scoresByStudent = new Map<string, Map<string, number>>();
    for (const s of students) scoresByStudent.set(s.id, new Map());
    for (const sc of allScores ?? []) {
      const m = scoresByStudent.get(sc.student_id);
      if (m && sc.score !== null) m.set(sc.assessment_id, Number(sc.score));
    }

    // Compute everyone's report (needed for ranking).
    const reports = new Map<string, StudentReport>();
    for (const s of students) {
      reports.set(s.id, computeReport(assessments as AssessmentRow[], scoresByStudent.get(s.id)!, caW));
    }

    // Competition ranking by overall average (desc).
    const ranked = [...students].sort((a, b) => (reports.get(b.id)!.average) - (reports.get(a.id)!.average));
    const positionOf = new Map<string, number>();
    let lastAvg = -1, lastPos = 0;
    ranked.forEach((s, i) => {
      const avg = reports.get(s.id)!.average;
      const pos = avg === lastAvg ? lastPos : i + 1;
      positionOf.set(s.id, pos);
      lastAvg = avg; lastPos = pos;
    });

    // Term info for the snapshot.
    const { data: term } = await supabase
      .from("terms").select("id, name, academic_year:academic_years(name)").eq("id", term_id).maybeSingle();
    const termObj = term as { name?: string; academic_year?: { name?: string } | { name?: string }[] } | null;
    const ay = Array.isArray(termObj?.academic_year) ? termObj?.academic_year[0] : termObj?.academic_year;

    const targets = student_id ? students.filter((s) => s.id === student_id) : students;
    if (targets.length === 0) return NextResponse.json({ error: "Student not found in class" }, { status: 404 });

    const rows = targets.map((s) => {
      const rep = reports.get(s.id)!;
      const position = positionOf.get(s.id) ?? null;
      const snapshot = {
        student: { id: s.id, name: `${s.first_name} ${s.last_name}`, admission_number: s.admission_number },
        school: { name: (school as { name?: string } | null)?.name ?? "" },
        term: { name: termObj?.name ?? "", academic_year: ay?.name ?? "" },
        subjects: rep.subjects,
        summary: {
          total_score: rep.total_score,
          total_max_possible: rep.total_max,
          average_score: rep.average,
          subjects_count: rep.subjects.length,
          overall_position: position,
          total_students: students.length,
          ca_weight: Math.round(caW * 100),
          exam_weight: Math.round((1 - caW) * 100),
        },
      };
      return {
        student_id: s.id,
        term_id,
        overall_position: position,
        total_score: rep.total_score,
        average_score: rep.average,
        teacher_comments: student_id ? (teacher_comments ?? null) : null,
        headteacher_remarks: student_id ? (headteacher_remarks ?? null) : null,
        data: snapshot,
        generated_at: new Date().toISOString(),
      };
    });

    // Upsert (regenerate) — one row per student+term.
    const { data, error } = await supabase
      .from("report_cards")
      .upsert(rows, { onConflict: "student_id,term_id" })
      .select("*, student:students(*, class:classes(*)), term:terms(*, academic_year:academic_years(*))");

    if (error) return NextResponse.json({ error: error.message || "Failed to generate report cards" }, { status: 400 });

    return NextResponse.json(
      student_id ? { data: data?.[0] ?? null } : { data, count: data?.length ?? 0 },
      { status: 201 }
    );
  } catch (err) {
    console.error("Report card generation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
