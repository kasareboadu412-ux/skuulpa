import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireSuperAdmin } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = getServiceClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const plan = searchParams.get("plan") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = 20;
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from("schools")
      .select("*, school_subscriptions!inner(*, subscription_plans(name, code))", { count: "exact" });

    if (status) query = query.eq("status", status);
    if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    if (plan) query = query.eq("school_subscriptions.subscription_plans.code", plan);

    const { data, error, count } = await query.order("created_at", { ascending: false }).range(offset, offset + pageSize - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const schoolIds = (data || []).map((s: { id: string }) => s.id);
    const studentCounts: Record<string, number> = {};

    if (schoolIds.length > 0) {
      const { data: counts } = await supabase.from("students").select("school_id").in("school_id", schoolIds);
      counts?.forEach((s: { school_id: string }) => {
        studentCounts[s.school_id] = (studentCounts[s.school_id] || 0) + 1;
      });
    }

    const enriched = (data || []).map((school: Record<string, unknown>) => ({
      ...school,
      student_count: studentCounts[school.id as string] || 0,
    }));

    return NextResponse.json({ data: enriched, total: count || 0, page, pageSize, totalPages: Math.ceil((count || 0) / pageSize) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const supabase = getServiceClient();
    const body = await request.json();
    const { id, status, plan_id, extend_trial_days } = body;

    if (!id) return NextResponse.json({ error: "School ID is required" }, { status: 400 });

    // ── Status change ──
    if (status) {
      if (!["active", "suspended", "pending_approval", "disabled"].includes(status)) {
        return NextResponse.json({ error: "Invalid status." }, { status: 400 });
      }
      const updateData: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (status === "active") {
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = userId;
      }
      const { error } = await supabase.from("schools").update(updateData).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // ── Plan change / trial extension on the school's latest subscription ──
    if (plan_id || extend_trial_days) {
      const { data: subRow } = await supabase
        .from("school_subscriptions")
        .select("id, trial_ends_at, plan_id")
        .eq("school_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const subUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };

      if (plan_id) {
        const { data: plan } = await supabase.from("subscription_plans").select("id").eq("id", plan_id).maybeSingle();
        if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        subUpdate.plan_id = plan_id;
        // Also mirror the plan code onto the school for quick reads.
        const { data: planCode } = await supabase.from("subscription_plans").select("code").eq("id", plan_id).maybeSingle();
        if (planCode) await supabase.from("schools").update({ subscription_plan: planCode.code }).eq("id", id);
      }

      if (extend_trial_days) {
        const base = subRow?.trial_ends_at ? new Date(subRow.trial_ends_at) : new Date();
        const from = base.getTime() > Date.now() ? base : new Date();
        from.setDate(from.getDate() + Number(extend_trial_days));
        subUpdate.trial_ends_at = from.toISOString();
        subUpdate.status = "trial";
      }

      if (subRow?.id) {
        const { error: subErr } = await supabase.from("school_subscriptions").update(subUpdate).eq("id", subRow.id);
        if (subErr) return NextResponse.json({ error: subErr.message }, { status: 400 });
      } else if (plan_id) {
        // No subscription yet — create one.
        await supabase.from("school_subscriptions").insert({
          school_id: id,
          plan_id,
          status: "active",
          current_period_start: new Date().toISOString(),
        });
      }
    }

    const { data, error } = await supabase
      .from("schools")
      .select("*, school_subscriptions(*, subscription_plans(name, code))")
      .eq("id", id)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal server error" }, { status: 500 });
  }
}
