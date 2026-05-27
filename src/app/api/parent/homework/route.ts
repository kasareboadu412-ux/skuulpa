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
    const subjectId = searchParams.get("subjectId");

    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Get the student's class
    const { data: student } = await supabase
      .from("students")
      .select("class_id")
      .eq("id", studentId)
      .single();

    const studentClassId = (student as { class_id: string } | null)?.class_id as string | undefined;

    if (!studentClassId) {
      return NextResponse.json({ error: "Student not found or no class assigned" }, { status: 404 });
    }

    // Get homework assigned to the student's class
    let homeworkQuery = supabase
      .from("homework")
      .select(`
        id,
        title,
        description,
        attachments,
        due_date,
        created_at,
        subject_id,
        subject:subject_id (
          id,
          name,
          code
        ),
        teacher:teacher_id (
          id,
          first_name,
          last_name
        ),
        homework_views (
          id,
          parent_phone,
          viewed_at
        )
      `)
      .eq("class_id", studentClassId)
      .order("due_date", { ascending: true });

    if (subjectId) {
      homeworkQuery = homeworkQuery.eq("subject_id", subjectId);
    }

    const { data: rawHomework, error: hError } = await homeworkQuery;
    const homework = (rawHomework || []) as unknown as {
      id: string;
      title: string;
      description: string | null;
      attachments: unknown;
      due_date: string | null;
      created_at: string;
      subject_id: string | null;
      subject: { id: string; name: string; code: string | null } | null;
      teacher: { id: string; first_name: string; last_name: string } | null;
      homework_views: { parent_phone: string }[];
    }[];

    if (hError) {
      return NextResponse.json({ error: hError.message }, { status: 500 });
    }

    // Get parent phone for view tracking
    const parentPhone = user.phone || user.user_metadata?.phone;

    // Mark which homework has been viewed
    const homeworkWithViewStatus = homework.map((h) => ({
      ...h,
      viewed: (h.homework_views || []).some(
        (v: { parent_phone: string }) => v.parent_phone === parentPhone
      ),
    }));

    // Get unique subjects from homework
    const subjectIds = [
      ...new Set(homework.map((h) => h.subject_id).filter((id): id is string => id !== null)),
    ];

    const { data: subjects } = await supabase
      .from("subjects")
      .select("id, name, code")
      .in("id", subjectIds);

    return NextResponse.json({
      homework: homeworkWithViewStatus,
      subjects: subjects || [],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
