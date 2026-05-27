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
    const subjectId = searchParams.get("subjectId");

    if (!studentId) return NextResponse.json({ error: "studentId is required" }, { status: 400 });

    if (!await verifyParentOwnsStudent(studentId, userId, parentPhone)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = getServiceClient();

    const { data: student } = await supabase.from("students").select("class_id").eq("id", studentId).single();
    const studentClassId = (student as { class_id: string } | null)?.class_id;

    if (!studentClassId) return NextResponse.json({ error: "Student not found or no class assigned" }, { status: 404 });

    let homeworkQuery = supabase
      .from("homework")
      .select("id, title, description, attachments, due_date, created_at, subject_id, subject:subject_id(id, name, code), teacher:teacher_id(id, first_name, last_name), homework_views(id, parent_phone, viewed_at)")
      .eq("class_id", studentClassId)
      .order("due_date", { ascending: true });

    if (subjectId) homeworkQuery = homeworkQuery.eq("subject_id", subjectId);

    const { data: rawHomework, error: hError } = await homeworkQuery;
    if (hError) return NextResponse.json({ error: hError.message }, { status: 500 });

    const homeworkWithViewStatus = (rawHomework ?? []).map((h) => ({
      ...h,
      viewed: ((h as { homework_views: { parent_phone: string }[] }).homework_views || []).some((v) => v.parent_phone === parentPhone),
    }));

    const subjectIds = [...new Set((rawHomework ?? []).map((h) => (h as { subject_id: string | null }).subject_id).filter((id): id is string => id !== null))];
    const { data: subjects } = await supabase.from("subjects").select("id, name, code").in("id", subjectIds);

    return NextResponse.json({ homework: homeworkWithViewStatus, subjects: subjects || [] });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
