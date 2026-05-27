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
    const academic_year_id = searchParams.get("academic_year_id");

    let query = supabase
      .from("terms")
      .select("*, academic_year:academic_years!inner(id, name, school_id, is_current)")
      .eq("academic_year.school_id", schoolId)
      .order("start_date", { ascending: true });

    if (academic_year_id) query = query.eq("academic_year_id", academic_year_id);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: "Failed to fetch terms" }, { status: 400 });
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
    const { academic_year_id, name, start_date, end_date, is_current } = body;

    if (!academic_year_id || !name || !start_date || !end_date) {
      return NextResponse.json(
        { error: "academic_year_id, name, start_date, and end_date are required" },
        { status: 400 }
      );
    }

    // Verify academic year belongs to this school
    const { data: academicYear } = await supabase
      .from("academic_years")
      .select("school_id")
      .eq("id", academic_year_id)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (!academicYear) {
      return NextResponse.json({ error: "Academic year not found" }, { status: 404 });
    }

    if (is_current) {
      await supabase
        .from("terms")
        .update({ is_current: false })
        .eq("academic_year_id", academic_year_id);
    }

    const { data, error } = await supabase
      .from("terms")
      .insert([{ academic_year_id, name, start_date, end_date, is_current: is_current ?? false }])
      .select("*, academic_year:academic_years(*)")
      .single();

    if (error) return NextResponse.json({ error: "Failed to create term" }, { status: 400 });
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
