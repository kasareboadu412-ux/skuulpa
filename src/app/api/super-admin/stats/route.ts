import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceSupabase();

    // Total schools
    const { count: totalSchools, error: totalErr } = await supabase
      .from("schools")
      .select("*", { count: "exact", head: true });

    if (totalErr) throw totalErr;

    // Active schools
    const { count: activeSchools, error: activeErr } = await supabase
      .from("schools")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    if (activeErr) throw activeErr;

    // Pending approval schools
    const { count: pendingSchools, error: pendingErr } = await supabase
      .from("schools")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending_approval");

    if (pendingErr) throw pendingErr;

    // Suspended schools
    const { count: suspendedSchools, error: suspendedErr } = await supabase
      .from("schools")
      .select("*", { count: "exact", head: true })
      .eq("status", "suspended");

    if (suspendedErr) throw suspendedErr;

    // Trial subscriptions
    const { count: trialSchools, error: trialErr } = await supabase
      .from("school_subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "trial");

    if (trialErr) throw trialErr;

    // Total students across all schools
    const { count: totalStudents, error: studentsErr } = await supabase
      .from("students")
      .select("*", { count: "exact", head: true });

    if (studentsErr) throw studentsErr;

    // Monthly revenue from confirmed invoices (current month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data: monthlyInvoices, error: invoicesErr } = await supabase
      .from("invoices")
      .select("amount")
      .eq("status", "paid")
      .gte("paid_at", startOfMonth);

    if (invoicesErr) throw invoicesErr;

    const monthlyRevenue =
      monthlyInvoices?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;

    // School growth by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: schoolsByMonth, error: growthErr } = await supabase
      .from("schools")
      .select("created_at")
      .gte("created_at", sixMonthsAgo.toISOString())
      .order("created_at", { ascending: true });

    if (growthErr) throw growthErr;

    // Aggregate schools per month
    const monthMap: Record<string, number> = {};
    schoolsByMonth?.forEach((s: { created_at: string }) => {
      const d = new Date(s.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthMap[key] = (monthMap[key] || 0) + 1;
    });

    // Build cumulative growth
    const growthData = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .reduce<{ month: string; schools: number }[]>((acc, [month, count]) => {
        const prev = acc.length > 0 ? acc[acc.length - 1].schools : 0;
        acc.push({ month, schools: prev + count });
        return acc;
      }, []);

    // Recent registrations (last 10 schools)
    const { data: recentSchools, error: recentErr } = await supabase
      .from("schools")
      .select("id, name, email, phone, status, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    if (recentErr) throw recentErr;

    // Total plan count
    const { count: totalPlans, error: plansErr } = await supabase
      .from("subscription_plans")
      .select("*", { count: "exact", head: true });

    if (plansErr) throw plansErr;

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
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
