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

    const { data, error } = await supabase
      .from("feeding_plans")
      .select("*")
      .eq("school_id", schoolId)
      .order("name", { ascending: true });

    if (error) return NextResponse.json({ error: "Failed to fetch feeding plans" }, { status: 400 });
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
      .from("feeding_plans")
      .insert([{ ...body, school_id: schoolId }])
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: "Failed to create feeding plan" }, { status: 400 });
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
