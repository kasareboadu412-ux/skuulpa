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
      .from("classes")
      .select("*, school:schools(*), academic_year:academic_years(*), teacher:teachers(*), students(count)")
      .eq("school_id", schoolId)
      .order("sort_order", { ascending: true });

    if (academic_year_id) query = query.eq("academic_year_id", academic_year_id);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: "Failed to fetch classes" }, { status: 400 });
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

    const { data, error } = await supabase
      .from("classes")
      .insert([{ ...body, school_id: schoolId }])
      .select("*, school:schools(*), academic_year:academic_years(*)")
      .single();

    if (error) return NextResponse.json({ error: "Failed to create class" }, { status: 400 });
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
