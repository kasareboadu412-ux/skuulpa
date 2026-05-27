import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireStaff } from "@/lib/auth-guard";

export const runtime = "nodejs";

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

    const { data, error } = await supabase
      .from("fee_structures")
      .select("*, class:classes(*)")
      .eq("id", id)
      .eq("school_id", schoolId)
      .single();

    if (error || !data) return NextResponse.json({ error: "Fee structure not found" }, { status: 404 });
    return NextResponse.json({ data });
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

    const { data, error } = await supabase
      .from("fee_structures")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("school_id", schoolId)
      .select("*, class:classes(*)")
      .single();

    if (error) return NextResponse.json({ error: "Failed to update fee structure" }, { status: 400 });
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

    const { data, error } = await supabase
      .from("fee_structures")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("school_id", schoolId)
      .select("*, class:classes(*)")
      .single();

    if (error) return NextResponse.json({ error: "Fee structure not found" }, { status: 404 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
