import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireSuperAdmin } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireSuperAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = getServiceClient();

    const [
      { count: totalSchools, error: totalErr },
      { count: activeSchools, error: activeErr },
      { count: pendingSchools, error: pendingErr },
      { count: suspendedSchools, error: suspendedErr },
      { count: trialSchools, error: trialErr },
      { count: totalStudents, error: studentsErr },
    ] = await Promise.all([
      supabase.from("schools").select("*", { count: "exact", head: true }),
      supabase.from("schools").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("schools").select("*", { count: "exact", head: true }).eq("status", "pending_approval"),
      supabase.from("schools").select("*", { count: "exact", head: true }).eq("status", "suspended"),
      supabase.from("school_subscriptions").select("*", { count: "exact", head: true }).eq("status", "trial"),
      supabase.from("students").select("*", { count: "exact", head: true }),
    ]);

    for (const err of [totalErr, activeErr, pendingErr, suspendedErr, trialErr, studentsErr]) {
      if (err) throw err;
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data: monthlyInvoices, error: invoicesErr } = await supabase
      .from("invoices")
      .select("amount")
      .eq("status", "paid")
      .gte("paid_at", startOfMonth);

    if (invoicesErr) throw invoicesErr;

    const monthlyRevenue = monthlyInvoices?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [{ data: schoolsByMonth, error: growthErr }, { count: totalPlans, error: plansErr }, { data: recentSchools, error: recentErr }] = await Promise.all([
      supabase.from("schools").select("created_at").gte("created_at", sixMonthsAgo.toISOString()).order("created_at", { ascending: true }),
      supabase.from("subscription_plans").select("*", { count: "exact", head: true }),
      supabase.from("schools").select("id, name, email, phone, status, created_at").order("created_at", { ascending: false }).limit(10),
    ]);

    if (growthErr) throw growthErr;
    if (plansErr) throw plansErr;
    if (recentErr) throw recentErr;

    const monthMap: Record<string, number> = {};
    schoolsByMonth?.forEach((s: { created_at: string }) => {
      const d = new Date(s.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthMap[key] = (monthMap[key] || 0) + 1;
    });

    const growthData = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .reduce<{ month: string; schools: number }[]>((acc, [month, count]) => {
        const prev = acc.length > 0 ? acc[acc.length - 1].schools : 0;
        acc.push({ month, schools: prev + count });
        return acc;
      }, []);

    return NextResponse.json({
      data: {
        totalSchools: totalSchools || 0,
        activeSchools: activeSchools || 0,
        pendingSchools: pendingSchools || 0,
        suspendedSchools: suspendedSchools || 0,
        trialSchools: trialSchools || 0,
        totalStudents: totalStudents || 0,
        monthlyRevenue,
        totalPlans: totalPlans || 0,
        schoolGrowth: growthData,
        recentRegistrations: recentSchools || [],
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal server error" }, { status: 500 });
  }
}
