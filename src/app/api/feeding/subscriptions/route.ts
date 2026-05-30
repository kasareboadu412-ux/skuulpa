import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireStaff } from "@/lib/auth-guard";
import {
  assignServiceFee,
  perPeriodAmount,
  BILLING_FREQUENCIES,
  TERM_WEEKS,
  type BillingFrequency,
} from "@/lib/service-fees";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { schoolId } = auth;

  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const student_id = searchParams.get("student_id");

    let query = supabase
      .from("feeding_subscriptions")
      .select("*, student:students!inner(id, first_name, last_name, school_id), feeding_plan:feeding_plans(*)")
      .eq("student.school_id", schoolId)
      .order("created_at", { ascending: false });

    if (student_id) query = query.eq("student_id", student_id);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: "Failed to fetch feeding subscriptions" }, { status: 400 });
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
    const { student_id, feeding_plan_id, days_per_week, start_date, end_date } = body;
    const daysPerWeek = Number(days_per_week) > 0 ? Number(days_per_week) : 5;
    const billing_frequency: BillingFrequency = BILLING_FREQUENCIES.includes(body.billing_frequency)
      ? body.billing_frequency
      : "termly";

    if (!student_id || !feeding_plan_id || !start_date) {
      return NextResponse.json({ error: "student_id, feeding_plan_id, and start_date are required" }, { status: 400 });
    }

    // Verify student belongs to this school
    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("id", student_id)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    // Verify feeding plan belongs to this school
    const { data: plan } = await supabase
      .from("feeding_plans")
      .select("id, name, daily_rate")
      .eq("id", feeding_plan_id)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (!plan) return NextResponse.json({ error: "Feeding plan not found" }, { status: 404 });

    const { data, error } = await supabase
      .from("feeding_subscriptions")
      .insert([{ student_id, feeding_plan_id, days_per_week: daysPerWeek, start_date, end_date: end_date ?? null, is_active: true }])
      .select("*, student:students(*), feeding_plan:feeding_plans(*)")
      .single();

    if (error) return NextResponse.json({ error: "Failed to create feeding subscription" }, { status: 400 });

    // Term total = daily rate × days per week × weeks in term.
    const termTotal = Math.round(Number(plan.daily_rate) * daysPerWeek * TERM_WEEKS * 100) / 100;
    const label = `Feeding: ${plan.name} (${daysPerWeek}d/wk, ${billing_frequency})`;
    const feeResult = await assignServiceFee({
      schoolId,
      studentId: student_id,
      category: "feeding",
      label,
      termTotal,
      frequency: billing_frequency,
    });

    return NextResponse.json(
      {
        data,
        fee: feeResult
          ? {
              assigned: true,
              term_total: termTotal,
              billing_frequency,
              per_period: perPeriodAmount(termTotal, billing_frequency),
            }
          : { assigned: false, reason: "No current term set — set a current term to bill this subscription." },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
