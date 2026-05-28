import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServiceClient } from "@/lib/supabase-server";
import { requireStaff } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { schoolId } = auth;

  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let query = supabase
      .from("teachers")
      .select("*, school:schools(*), classes(*), teacher_subject_assignments(*, subject:subjects(*))")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: "Failed to fetch teachers" }, { status: 400 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function generateTempPassword(): string {
  // 10-char password: letters + digits + 1 symbol — easy to read aloud
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 9; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out + "!";
}

export async function POST(request: NextRequest) {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { schoolId, role: requesterRole } = auth;

  // Only proprietors and admins can add staff
  if (requesterRole !== "proprietor" && requesterRole !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const sbAdmin = getServiceClient();

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = body.role === "admin" ? "admin" : "teacher";

    // Strip fields we want to control here
    const {
      email: _e,
      role: _r,
      user_id: _u,
      school_id: _s,
      password: providedPassword,
      ...rest
    } = body;

    let userId: string | null = null;
    let tempPassword: string | null = null;

    if (email) {
      // Check whether an auth user already exists in the teachers table for this email
      const { data: existing } = await sbAdmin
        .from("teachers")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (existing) {
        return NextResponse.json(
          { error: "A teacher with this email already exists." },
          { status: 409 }
        );
      }

      tempPassword =
        typeof providedPassword === "string" && providedPassword.length >= 6
          ? providedPassword
          : generateTempPassword();

      const { data: authData, error: signUpError } = await sbAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { role, school_id: schoolId, name: `${rest.first_name ?? ""} ${rest.last_name ?? ""}`.trim() },
      });

      if (signUpError || !authData?.user) {
        return NextResponse.json(
          { error: signUpError?.message || "Failed to create login account" },
          { status: 400 }
        );
      }

      userId = authData.user.id;
    }

    const { data, error } = await sbAdmin
      .from("teachers")
      .insert([{
        ...rest,
        email: email || null,
        school_id: schoolId,
        user_id: userId,
        status: rest.status ?? "active",
      }])
      .select("*, school:schools(*)")
      .single();

    if (error) {
      // Roll back the auth user if we created one
      if (userId) {
        try { await sbAdmin.auth.admin.deleteUser(userId); } catch {}
      }
      return NextResponse.json({ error: error.message ?? "Failed to create teacher" }, { status: 400 });
    }

    return NextResponse.json(
      { data, temp_password: tempPassword },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
