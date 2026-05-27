import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServiceClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

/**
 * POST /api/auth/register
 *
 * Register a new school with a proprietor account.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, schoolName, password } = body as {
      name?: string;
      email?: string;
      phone?: string;
      schoolName?: string;
      password?: string;
    };

    if (!name || !email || !schoolName || !password) {
      return NextResponse.json(
        { error: "Name, email, school name, and password are required." },
        { status: 400 }
      );
    }

    const trimmedName = (name as string).trim();
    const emailStr = (email as string).trim().toLowerCase();
    const phoneStr = (phone as string)?.trim()?.replace(/\s+/g, "") ?? null;
    const schoolNameStr = (schoolName as string).trim();

    if (!emailStr.includes("@")) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }
    if ((password as string).length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const sbAdmin = getServiceClient();
    const supabase = await createSupabaseServerClient();

    // Check if email already registered
    const { data: existingTeacher } = await sbAdmin
      .from("teachers")
      .select("id, email")
      .eq("email", emailStr)
      .maybeSingle();

    if (existingTeacher) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please log in." },
        { status: 409 }
      );
    }

    // Create Supabase Auth user with proprietor role
    const { data: authData, error: signUpError } = await sbAdmin.auth.admin.createUser({
      email: emailStr,
      password: password as string,
      email_confirm: true,
      user_metadata: { role: "proprietor", name: trimmedName },
    });

    if (signUpError || !authData.user) {
      console.error("Admin createUser error:", signUpError);
      const msg = signUpError?.message?.toLowerCase().includes("fetch")
        ? "Unable to reach authentication service. Please try again."
        : signUpError?.message || "Failed to create account.";
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const authUserId = authData.user.id;
    let schoolRow: { id: string; name: string; short_code: string } | null = null;

    try {
      const shortCode = schoolNameStr
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 5) || "SCH";

      const { data: schoolResult, error: schoolError } = await sbAdmin
        .from("schools")
        .insert({
          name: schoolNameStr,
          short_code: shortCode,
          email: emailStr,
          phone: phoneStr,
          subscription_plan: "free",
          settings: {
            timezone: "Africa/Accra",
            currency: "GHS",
            date_format: "DD/MM/YYYY",
            academic_year_start_month: 9,
          },
        })
        .select("id, name, short_code");

      if (schoolError || !schoolResult || schoolResult.length === 0) {
        await sbAdmin.auth.admin.deleteUser(authUserId);
        return NextResponse.json(
          { error: schoolError?.message ?? "Failed to create school." },
          { status: 500 }
        );
      }

      schoolRow = schoolResult[0];

      // Update user metadata to include school_id so API routes can resolve it
      await sbAdmin.auth.admin.updateUserById(authUserId, {
        user_metadata: { role: "proprietor", name: trimmedName, school_id: schoolRow.id },
      });

      // Create teacher/profile record for the proprietor
      const { error: teacherError } = await sbAdmin
        .from("teachers")
        .insert({
          school_id: schoolRow.id,
          user_id: authUserId,
          first_name: trimmedName.split(" ")[0] || "Admin",
          last_name: trimmedName.split(" ").slice(1).join(" ") || "Administrator",
          email: emailStr,
          phone: phoneStr ?? "",
          status: "active",
        });

      if (teacherError) {
        await sbAdmin.auth.admin.deleteUser(authUserId);
        await sbAdmin.from("schools").delete().eq("id", schoolRow.id);
        return NextResponse.json(
          { error: "Failed to create profile. Please try again." },
          { status: 500 }
        );
      }

      // Create academic year and default terms
      const year = new Date().getFullYear();
      const { data: yearData } = await sbAdmin
        .from("academic_years")
        .insert({
          school_id: schoolRow.id,
          name: `${year}/${year + 1}`,
          start_date: `${year}-09-01`,
          end_date: `${year + 1}-08-31`,
          is_current: true,
        })
        .select("id")
        .single();

      if (yearData) {
        const terms = [
          { name: "1st Term", start: `${year}-09-01`, end: `${year}-12-20`, current: true },
          { name: "2nd Term", start: `${year + 1}-01-08`, end: `${year + 1}-04-11`, current: false },
          { name: "3rd Term", start: `${year + 1}-04-22`, end: `${year + 1}-08-01`, current: false },
        ];
        for (const term of terms) {
          await sbAdmin.from("terms").insert({
            academic_year_id: yearData.id,
            name: term.name,
            start_date: term.start,
            end_date: term.end,
            is_current: term.current,
          });
        }
      }

      // Assign free subscription plan
      const { data: planRow } = await sbAdmin
        .from("subscription_plans")
        .select("id")
        .eq("code", "free")
        .maybeSingle();

      if (planRow) {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 14);
        await sbAdmin.from("school_subscriptions").insert({
          school_id: schoolRow.id,
          plan_id: planRow.id,
          status: "trial",
          trial_ends_at: trialEnd.toISOString(),
          current_period_start: new Date().toISOString(),
          current_period_end: trialEnd.toISOString(),
          auto_renew: false,
        });
      }

      // Sign in as the new user to establish session
      const { data: { session } } = await supabase.auth.signInWithPassword({
        email: emailStr,
        password: password as string,
      });

      return NextResponse.json({
        user: {
          id: authUserId,
          email: emailStr,
          role: "proprietor",
          school_id: schoolRow.id,
          school_name: schoolRow.name,
          profile: {
            first_name: trimmedName.split(" ")[0] || "Admin",
            last_name: trimmedName.split(" ").slice(1).join(" ") || "Administrator",
          },
        },
        session,
      });
    } catch (err) {
      try { await sbAdmin.auth.admin.deleteUser(authUserId); } catch {}
      try { if (schoolRow?.id) await sbAdmin.from("schools").delete().eq("id", schoolRow.id); } catch {}
      return NextResponse.json(
        { error: "Registration failed. Please try again." },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
