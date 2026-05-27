import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Teachers } from "@/lib/database.types";

export const runtime = "nodejs";

/**
 * POST /api/auth/login
 *
 * Authenticate a user and create a session.
 *
 * Request body (staff):
 *   { email: string, password: string, loginAs: "staff" }
 *
 * Request body (parent):
 *   { phone: string, pin: string, loginAs: "parent" }
 *
 * Response:
 *   { user: object, session: object }
 *   - user includes: id, email, role, school_id, profile metadata
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loginAs = "staff" } = body;

    if (loginAs === "parent") {
      return handleParentLogin(body);
    }

    return handleStaffLogin(body);
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * Handle staff login (proprietor, admin, teacher) via email + password.
 */
async function handleStaffLogin(body: Record<string, unknown>) {
  const { email, password } = body as {
    email?: string;
    password?: string;
  };

  // ─── Input validation ───
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  const emailStr = (email as string).trim().toLowerCase();
  if (!emailStr.includes("@")) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Invalid credentials." },
      { status: 401 }
    );
  }

  // ─── Authenticate via Supabase Auth ───
  const supabase = await createSupabaseServerClient();
  const db = supabase as any;

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: emailStr,
    password: password as string,
  });

  if (authError) {
    const message =
      authError.message === "Invalid login credentials"
        ? "Invalid email or password. Please try again."
        : authError.message;

    return NextResponse.json({ error: message }, { status: 401 });
  }

  const { user, session } = authData;

  if (!user) {
    return NextResponse.json(
      { error: "Authentication failed. Please try again." },
      { status: 401 }
    );
  }

  // ─── Check user role — must be staff ───
  const role = user.user_metadata?.role as string | undefined;

  if (!role || role === "parent") {
    // This user exists but is a parent — redirect to parent flow
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "This account is registered as a parent. Please use the Parent Login option." },
      { status: 403 }
    );
  }

  // ─── Fetch profile based on role ───
  let profile: Record<string, unknown> | null = null;

  if (role === "proprietor") {
    // Proprietors are the school owners — fetch school info
    const { data: school } = await supabase
      .from("schools")
      .select("id, name, logo_url, subscription_plan")
      .eq("id", (user.user_metadata?.school_id as string) ?? "")
      .maybeSingle();

    const schoolData = school as unknown as { id: string; name: string | null; logo_url: string | null; subscription_plan: string | null } | null;
    profile = schoolData ? { id: schoolData.id, name: schoolData.name, logo_url: schoolData.logo_url, subscription_plan: schoolData.subscription_plan } : null;
  } else if (role === "admin" || role === "teacher") {
    const { data: teacher } = await supabase
      .from("teachers")
      .select("id, first_name, last_name, phone, school_id, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (teacher) {
      const t = teacher as unknown as Teachers;

      if (t.status === "suspended" || t.status === "terminated") {
        await supabase.auth.signOut();
        return NextResponse.json(
          { error: "Your account has been deactivated. Please contact your school administrator." },
          { status: 403 }
        );
      }

      // Fetch school info
      const schoolId = t.school_id;
      let schoolName: string | null = null;
      let schoolLogo: string | null = null;
      let subPlan: string | null = null;
      if (schoolId) {
        const { data: school } = await supabase
          .from("schools")
          .select("id, name, logo_url, subscription_plan")
          .eq("id", schoolId)
          .maybeSingle();
        if (school) {
          const s = school as unknown as { name: string; logo_url: string | null; subscription_plan: string | null };
          schoolName = s.name;
          schoolLogo = s.logo_url;
          subPlan = s.subscription_plan;
        }
      }

      profile = {
        id: t.id,
        first_name: t.first_name,
        last_name: t.last_name,
        phone: t.phone,
        school_id: t.school_id,
        status: t.status,
        school_name: schoolName,
        school_logo: schoolLogo,
        subscription_plan: subPlan,
      };
    }
  }

  // ─── Check if super admin ───
  const { data: superAdmin } = await (supabase as any)
    .from("super_admins")
    .select("id, role, is_active")
    .eq("email", user.email)
    .maybeSingle();

  const isSuperAdmin = !!superAdmin && superAdmin.is_active !== false;
  const finalRole = isSuperAdmin ? "super_admin" : role;

  // ─── Return user and session ───
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      role: finalRole,
      is_super_admin: isSuperAdmin,
      super_admin_role: isSuperAdmin ? (superAdmin?.role ?? null) : null,
      profile,
    },
    session: {
      access_token: session?.access_token,
      refresh_token: session?.refresh_token,
      expires_at: session?.expires_at,
    },
  });
}

/**
 * Handle parent login via phone number + PIN.
 *
 * Parent accounts use a synthetic email (phone@skooly.parent) as the
 * Supabase Auth identifier, with the PIN as their password.
 */
async function handleParentLogin(body: Record<string, unknown>) {
  const { phone, pin } = body as {
    phone?: string;
    pin?: string;
  };

  // ─── Input validation ───
  if (!phone || !pin) {
    return NextResponse.json(
      { error: "Phone number and PIN are required." },
      { status: 400 }
    );
  }

  const phoneStr = (phone as string).trim().replace(/\s+/g, "");
  if (phoneStr.length < 10) {
    return NextResponse.json(
      { error: "Please enter a valid phone number (e.g., 024XXXXXXX)." },
      { status: 400 }
    );
  }

  if (pin.length < 4) {
    return NextResponse.json(
      { error: "PIN must be at least 4 digits." },
      { status: 400 }
    );
  }

  // ─── Construct parent email for Supabase Auth lookup ───
  const parentEmail = `parent_${phoneStr}@skooly.parent`;

  const supabase = await createSupabaseServerClient();

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: parentEmail,
    password: pin as string,
  });

  if (authError) {
    return NextResponse.json(
      { error: "Invalid phone number or PIN. Please try again." },
      { status: 401 }
    );
  }

  const { user, session } = authData;

  if (!user) {
    return NextResponse.json(
      { error: "Authentication failed. Please try again." },
      { status: 401 }
    );
  }

  // ─── Verify role is parent ───
  const role = user.user_metadata?.role as string | undefined;

  if (role !== "parent") {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "This account is not registered as a parent." },
      { status: 403 }
    );
  }

  // ─── Fetch children for this parent ───
  const { data: children } = await supabase
    .from("students")
    .select("id, first_name, last_name, admission_number, class_id, school_id")
    .or(
      `parent_primary_phone.eq.${phoneStr},parent_secondary_phone.eq.${phoneStr}`
    )
    .eq("status", "active");

  // ─── Fetch school info from first child's school ───
  let schoolName: string | null = null;
  let schoolLogo: string | null = null;

  if (children && children.length > 0) {
    const child = children[0] as unknown as { school_id: string };
    const { data: school } = await supabase
      .from("schools")
      .select("name, logo_url")
      .eq("id", child.school_id)
      .maybeSingle();

    if (school) {
      const s = school as unknown as { name: string | null; logo_url: string | null };
      schoolName = s.name;
      schoolLogo = s.logo_url;
    }
  }

  // Create a kid-friendly profile summary
  const childrenSummary = (children ?? []).map((child) => {
    const c = child as unknown as {
      id: string;
      first_name: string;
      last_name: string;
      admission_number: string | null;
      class_id: string | null;
    };
    return {
      id: c.id,
      name: `${c.first_name} ${c.last_name}`,
      admissionNumber: c.admission_number,
      className: c.class_id, // class name would require a separate query
    };
  });

  return NextResponse.json({
    user: {
      id: user.id,
      phone: phoneStr,
      role: "parent",
      profile: {
        phone: phoneStr,
        children: childrenSummary,
        school_name: schoolName,
        school_logo: schoolLogo,
      },
    },
    session: {
      access_token: session?.access_token,
      refresh_token: session?.refresh_token,
      expires_at: session?.expires_at,
    },
  });
}
