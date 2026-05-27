import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = getServiceSupabase();

    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    const body = await request.json();

    const { name, code, description, price_monthly, price_yearly, max_students, max_teachers, features, is_active, sort_order } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    // Check if code already exists
    const { data: existing } = await supabase
      .from("subscription_plans")
      .select("id")
      .eq("code", code)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "A plan with this code already exists" },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("subscription_plans")
      .insert({
        name,
        code,
        description: description || "",
        price_monthly: price_monthly || 0,
        price_yearly: price_yearly || 0,
        max_students: max_students || 0,
        max_teachers: max_teachers || 0,
        features: features || [],
        is_active: is_active !== undefined ? is_active : true,
        sort_order: sort_order || 0,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "Plan ID is required" }, { status: 400 });
    }

    // If code is being changed, check for uniqueness
    if (updateData.code) {
      const { data: existing } = await supabase
        .from("subscription_plans")
        .select("id")
        .eq("code", updateData.code)
        .neq("id", id)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: "Another plan with this code already exists" },
          { status: 409 }
        );
      }
    }

    // Only allow specific fields to be updated
    const allowedFields = [
      "name", "description", "price_monthly", "price_yearly",
      "max_students", "max_teachers", "features", "is_active", "sort_order",
    ];

    const sanitized: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        sanitized[field] = updateData[field];
      }
    }

    const { data, error } = await supabase
      .from("subscription_plans")
      .update(sanitized)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
