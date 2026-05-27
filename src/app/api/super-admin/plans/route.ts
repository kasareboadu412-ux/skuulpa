import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireSuperAdmin } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireSuperAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.from("subscription_plans").select("*").order("sort_order", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = getServiceClient();
    const body = await request.json();
    const { name, code, description, price_monthly, price_yearly, max_students, max_teachers, features, is_active, sort_order } = body;

    if (!name || !code) return NextResponse.json({ error: "Name and code are required" }, { status: 400 });

    const { data: existing } = await supabase.from("subscription_plans").select("id").eq("code", code).maybeSingle();
    if (existing) return NextResponse.json({ error: "A plan with this code already exists" }, { status: 409 });

    const { data, error } = await supabase
      .from("subscription_plans")
      .insert({ name, code, description: description || "", price_monthly: price_monthly || 0, price_yearly: price_yearly || 0, max_students: max_students || 0, max_teachers: max_teachers || 0, features: features || [], is_active: is_active !== undefined ? is_active : true, sort_order: sort_order || 0 })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = getServiceClient();
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) return NextResponse.json({ error: "Plan ID is required" }, { status: 400 });

    if (updateData.code) {
      const { data: existing } = await supabase.from("subscription_plans").select("id").eq("code", updateData.code).neq("id", id).maybeSingle();
      if (existing) return NextResponse.json({ error: "Another plan with this code already exists" }, { status: 409 });
    }

    const allowedFields = ["name", "description", "price_monthly", "price_yearly", "max_students", "max_teachers", "features", "is_active", "sort_order"];
    const sanitized: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) sanitized[field] = updateData[field];
    }

    const { data, error } = await supabase.from("subscription_plans").update(sanitized).eq("id", id).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal server error" }, { status: 500 });
  }
}
