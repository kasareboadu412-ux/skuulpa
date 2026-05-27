import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireStaff, requireSuperAdmin } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const short_code = searchParams.get("short_code");

  // Listing all schools is super-admin only
  if (!id && !short_code) {
    const superAuth = await requireSuperAdmin();
    if (superAuth instanceof NextResponse) return superAuth;

    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.from("schools").select("*").order("name", { ascending: true });
      if (error) return NextResponse.json({ error: "Failed to fetch schools" }, { status: 400 });
      return NextResponse.json({ data });
    } catch {
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  // Fetching a specific school requires staff auth; scoped to own school
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { schoolId } = auth;

  try {
    const supabase = await createSupabaseServerClient();

    if (id) {
      if (id !== schoolId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const { data, error } = await supabase
        .from("schools")
        .select("*, academic_years(*, terms(*)), classes(*), subjects(*)")
        .eq("id", id)
        .single();
      if (error || !data) return NextResponse.json({ error: "School not found" }, { status: 404 });
      return NextResponse.json({ data });
    }

    if (short_code) {
      const { data, error } = await supabase
        .from("schools")
        .select("*, academic_years(*, terms(*)), classes(*), subjects(*)")
        .eq("short_code", short_code)
        .eq("id", schoolId)
        .single();
      if (error || !data) return NextResponse.json({ error: "School not found" }, { status: 404 });
      return NextResponse.json({ data });
    }
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { schoolId } = auth;

  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    if (id !== schoolId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data, error } = await supabase
      .from("schools")
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq("id", schoolId)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: "Failed to update school" }, { status: 400 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
