import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireStaff } from "@/lib/auth-guard";

export const runtime = "nodejs";

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

    const { school_id: _ignored, ...patch } = body;

    const { data, error } = await supabase
      .from("classes")
      .update(patch)
      .eq("id", id)
      .eq("school_id", schoolId)
      .select("*, academic_year:academic_years(*), teacher:teachers(*), students(count)")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Class not found" }, { status: 400 });
    }
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
  const { schoolId } = auth;

  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    const { count: studentCount } = await supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("class_id", id)
      .eq("school_id", schoolId);

    if ((studentCount ?? 0) > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${studentCount} student(s) still assigned to this class. Move them first.` },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from("classes")
      .delete()
      .eq("id", id)
      .eq("school_id", schoolId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data: { id } });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
