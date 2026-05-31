import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireStaff } from "@/lib/auth-guard";

export const runtime = "nodejs";

/**
 * GET /api/billing/me
 * Returns the current school's subscription + the available plans.
 */
export async function GET() {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { schoolId } = auth;

  try {
    const db = getServiceClient();

    const [{ data: sub }, { data: plans }] = await Promise.all([
      db.from("school_subscriptions")
        .select("*, plan:subscription_plans(*)")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db.from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

    const now = Date.now();
    const s = sub as {
      status?: string;
      trial_ends_at?: string | null;
      current_period_end?: string | null;
      plan?: { id?: string; name?: string; code?: string } | null;
    } | null;

    let daysLeft: number | null = null;
    let expired = false;
    const endRef = s?.status === "trial" ? s?.trial_ends_at : s?.current_period_end;
    if (endRef) {
      const ms = new Date(endRef).getTime() - now;
      daysLeft = Math.ceil(ms / (1000 * 60 * 60 * 24));
      expired = ms < 0;
    }

    return NextResponse.json({
      data: {
        subscription: sub,
        plans: plans ?? [],
        days_left: daysLeft,
        expired,
        is_trial: s?.status === "trial",
        current_plan_id: s?.plan?.id ?? null,
        current_plan_code: s?.plan?.code ?? null,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
