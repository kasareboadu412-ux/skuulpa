import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServiceClient } from "@/lib/supabase-server";
import { requireStaff } from "@/lib/auth-guard";
import { ensureParentAccount } from "@/lib/parent-account";
import { applyCurrentTermClassFees } from "@/lib/apply-fees";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { schoolId } = auth;

  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const class_id = searchParams.get("class_id");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let query = supabase
      .from("students")
      .select("*, class:classes(*)")
      .eq("school_id", schoolId);

    if (class_id) query = query.eq("class_id", class_id);
    if (status) query = query.eq("status", status);
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,admission_number.ilike.%${search}%,parent_primary_phone.ilike.%${search}%`
      );
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Failed to fetch students" }, { status: 400 });
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
      .from("students")
      .insert([{ ...body, school_id: schoolId }])
      .select("*, class:classes(*)")
      .single();

    if (error) {
      console.error("Students POST error:", error);
      return NextResponse.json({ error: error.message || "Failed to create student", code: error.code }, { status: 400 });
    }

    // Provision a parent login account so the parent can access the portal.
    let parentLogin: { phone: string; pin: string } | null = null;
    const parentPhone = (data as { parent_primary_phone: string | null }).parent_primary_phone;
    if (parentPhone) {
      const parentName = `${(data as { first_name: string }).first_name} ${(data as { last_name: string }).last_name}`;
      const result = await ensureParentAccount(parentPhone, parentName);
      if (result.userId) {
        const admin = getServiceClient();
        await admin
          .from("students")
          .update({ parent_user_id: result.userId })
          .eq("id", (data as { id: string }).id);
        if (result.created && result.pin) {
          parentLogin = { phone: parentPhone, pin: result.pin };
        }
      }
    }

    // Auto-apply the current term's class fees to the new student.
    const fees = await applyCurrentTermClassFees(
      schoolId,
      (data as { id: string }).id,
      (data as { class_id: string | null }).class_id
    );

    return NextResponse.json(
      { data, parent_login: parentLogin, fees_applied: fees.count },
      { status: 201 }
    );
  } catch (err) {
    console.error("Students POST exception:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal server error" }, { status: 500 });
  }
}
