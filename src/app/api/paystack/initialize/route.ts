import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServiceClient } from "@/lib/supabase-server";
import { requireStaff } from "@/lib/auth-guard";

export const runtime = "nodejs";

/**
 * POST /api/paystack/initialize
 *
 * Creates a Paystack payment session for a school to subscribe to a plan.
 * Returns a Paystack authorization URL which the client redirects to.
 *
 * Body: { plan_id: string, billing: "monthly" | "yearly" }
 */
export async function POST(request: NextRequest) {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { schoolId, role } = auth;

  if (role !== "proprietor") {
    return NextResponse.json({ error: "Only the school owner can manage subscriptions" }, { status: 403 });
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: "Payment is not configured yet. Please contact support." }, { status: 501 });
  }

  try {
    const { plan_id, billing = "monthly" } = await request.json();
    if (!plan_id) return NextResponse.json({ error: "plan_id is required" }, { status: 400 });

    const db = getServiceClient();
    const supabase = await createSupabaseServerClient();

    // Fetch the plan details.
    const { data: plan } = await db
      .from("subscription_plans")
      .select("id, name, code, price_monthly, price_yearly")
      .eq("id", plan_id)
      .maybeSingle();

    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    // Fetch the school's email for Paystack.
    const { data: school } = await db
      .from("schools")
      .select("name, email")
      .eq("id", schoolId)
      .maybeSingle();

    const { data: { user } } = await supabase.auth.getUser();
    const email = user?.email ?? (school as { email?: string } | null)?.email ?? "";
    if (!email) return NextResponse.json({ error: "Could not determine billing email" }, { status: 400 });

    const planObj = plan as { id: string; name: string; code: string; price_monthly: number; price_yearly: number };
    const amountGHS = billing === "yearly" ? planObj.price_yearly : planObj.price_monthly;
    const amountKobo = Math.round(amountGHS * 100); // Paystack uses pesewas (GHS×100)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://skuulr.com";
    const callbackUrl = `${baseUrl}/dashboard/billing?status=success&plan=${planObj.code}`;

    const body = {
      email,
      amount: amountKobo,
      currency: "GHS",
      callback_url: callbackUrl,
      metadata: {
        school_id: schoolId,
        plan_id: plan_id,
        billing,
        school_name: (school as { name?: string } | null)?.name ?? "",
        cancel_action: `${baseUrl}/dashboard/billing`,
      },
    };

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!data.status) {
      return NextResponse.json({ error: data.message || "Failed to initialize payment" }, { status: 400 });
    }

    return NextResponse.json({
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
      plan: planObj.name,
      amount: amountGHS,
      billing,
    });
  } catch (err) {
    console.error("Paystack init error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
