import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

/**
 * POST /api/super-admin/bootstrap
 *
 * One-time / break-glass way to grant super-admin access without touching the
 * database directly. Gated by the SUPER_ADMIN_BOOTSTRAP_SECRET env var.
 *
 * Body: { email: string, name?: string, secret: string }
 *
 * The email should already have a staff login account (so they can sign in).
 * After this succeeds, that user signs in via Staff Login and is routed to
 * /super-admin.
 */
export async function POST(request: NextRequest) {
  const secretEnv = process.env.SUPER_ADMIN_BOOTSTRAP_SECRET;
  if (!secretEnv) {
    return NextResponse.json(
      { error: "Bootstrap is disabled. Set SUPER_ADMIN_BOOTSTRAP_SECRET to enable it." },
      { status: 501 }
    );
  }

  try {
    const { email, name, secret } = await request.json();

    if (secret !== secretEnv) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 403 });
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }

    const emailStr = email.trim().toLowerCase();
    const db = getServiceClient();

    // Already a super admin?
    const { data: existing } = await db
      .from("super_admins")
      .select("id")
      .eq("email", emailStr)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ data: { email: emailStr, already: true }, message: "Already a super admin." });
    }

    const { error } = await db
      .from("super_admins")
      .insert({ email: emailStr, name: (name as string)?.trim() || emailStr, role: "super_admin" });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({
      data: { email: emailStr },
      message: "Super-admin granted. Sign in via Staff Login with this email.",
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
