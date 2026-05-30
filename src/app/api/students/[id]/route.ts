import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireStaff } from "@/lib/auth-guard";

export const runtime = "nodejs";

const ALLOWED_UPDATE_FIELDS = new Set([
  "first_name", "last_name", "dob", "class_id", "admission_number",
  "parent_primary_phone", "parent_secondary_phone", "parent_email",
  "enrollment_date", "status", "medical_info", "profile_photo_url",
]);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { schoolId } = auth;

  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    const { data: student, error } = await supabase
      .from("students")
      .select("*, class:classes(*)")
      .eq("id", id)
      .eq("school_id", schoolId)
      .single();

    if (error || !student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const [feeAssignments, attendance, grades] = await Promise.all([
      supabase
        .from("fee_assignments")
        .select("*, fee_structure:fee_structures(*), term:terms(*), fee_payments(*)")
        .eq("student_id", id),
      supabase
        .from("attendance_records")
        .select("*")
        .eq("student_id", id)
        .order("date", { ascending: false })
        .limit(60),
      supabase
        .from("assessment_scores")
        .select("*, assessment:assessments(*)")
        .eq("student_id", id),
    ]);

    return NextResponse.json({
      data: {
        ...student,
        fee_assignments: feeAssignments.data ?? [],
        attendance: attendance.data ?? [],
        grades: grades.data ?? [],
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { schoolId } = auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = await createSupabaseServerClient();

    // Verify the student belongs to this school
    const { data: existing } = await supabase
      .from("students")
      .select("id")
      .eq("id", id)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Whitelist updatable fields — never allow school_id, parent_user_id, etc.
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const [key, value] of Object.entries(body)) {
      if (ALLOWED_UPDATE_FIELDS.has(key)) update[key] = value;
    }

    const { data, error } = await supabase
      .from("students")
      .update(update)
      .eq("id", id)
      .eq("school_id", schoolId)
      .select("*, class:classes(*)")
      .single();

    if (error) return NextResponse.json({ error: "Failed to update student" }, { status: 400 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { schoolId, role } = auth;

  // Only proprietors and admins may remove students.
  if (role !== "proprietor" && role !== "admin") {
    return NextResponse.json({ error: "Only an admin can remove students" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("students")
      .update({ status: "withdrawn", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("school_id", schoolId)
      .select("*, class:classes(*)")
      .single();

    if (error) return NextResponse.json({ error: "Student not found" }, { status: 404 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
