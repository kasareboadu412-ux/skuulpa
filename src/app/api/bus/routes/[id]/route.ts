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
    const { school_id: _ignored, bus_stops: _ignoredStops, ...patch } = body;
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("bus_routes")
      .update(patch)
      .eq("id", id)
      .eq("school_id", schoolId)
      .select("*, bus_stops(*), bus_subscriptions(count)")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Bus route not found" }, { status: 400 });
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

    const { count: subCount } = await supabase
      .from("bus_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("bus_route_id", id)
      .eq("is_active", true);

    if ((subCount ?? 0) > 0) {
      const { data, error } = await supabase
        .from("bus_routes")
        .update({ is_active: false })
        .eq("id", id)
        .eq("school_id", schoolId)
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ data, soft_deleted: true });
    }

    const { error } = await supabase
      .from("bus_routes")
      .delete()
      .eq("id", id)
      .eq("school_id", schoolId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data: { id } });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
