import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServiceClient } from "@/lib/supabase-server";
import { requireStaff } from "@/lib/auth-guard";
import { computePayslip, type PayrollConfig } from "@/lib/ghana-payroll";

export const runtime = "nodejs";

const SETTINGS_KEY = "payroll_staff";

/**
 * GET /api/payroll
 * Return all staff payroll configs for this school (stored in school.settings).
 */
export async function GET() {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { schoolId, role } = auth;
  if (role !== "proprietor" && role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const db = getServiceClient();
  const { data } = await db.from("schools").select("settings").eq("id", schoolId).maybeSingle();
  const settings = (data?.settings ?? {}) as Record<string, unknown>;
  const configs = (settings[SETTINGS_KEY] ?? []) as PayrollConfig[];
  return NextResponse.json({ data: configs });
}

/**
 * PUT /api/payroll
 * Save all staff payroll configs for this school.
 * Body: { configs: PayrollConfig[] }
 */
export async function PUT(request: NextRequest) {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { schoolId, role } = auth;
  if (role !== "proprietor" && role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { configs } = await request.json();
  const db = getServiceClient();

  const { data: school } = await db.from("schools").select("settings").eq("id", schoolId).maybeSingle();
  const settings = (school?.settings ?? {}) as Record<string, unknown>;
  settings[SETTINGS_KEY] = configs;

  const { error } = await db.from("schools").update({ settings }).eq("id", schoolId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data: configs });
}

/**
 * POST /api/payroll
 * Run payroll for a period. Computes payslips + posts expense entries.
 * Body: { period: "January 2025", month: "2025-01" }
 */
export async function POST(request: NextRequest) {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { schoolId, role } = auth;
  if (role !== "proprietor" && role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { period, month } = await request.json();
  if (!period || !month) return NextResponse.json({ error: "period and month are required" }, { status: 400 });

  const db = getServiceClient();
  const supabase = await createSupabaseServerClient();

  const { data: school } = await db.from("schools").select("settings").eq("id", schoolId).maybeSingle();
  const settings = (school?.settings ?? {}) as Record<string, unknown>;
  const configs = (settings[SETTINGS_KEY] ?? []) as PayrollConfig[];

  if (configs.length === 0) return NextResponse.json({ error: "No staff payroll profiles configured" }, { status: 400 });

  const payslips = configs.map((c) => computePayslip(c, period));
  const payrollDate = `${month}-25`; // conventional payroll date: 25th of the month

  // Post one expense record per staff member (category: "salary").
  const expenseRows = payslips.map((ps) => ({
    school_id: schoolId,
    category: "salary",
    amount: ps.net_pay,
    description: JSON.stringify({
      _payroll: true,
      period,
      teacher_id: ps.teacher_id,
      teacher_name: ps.teacher_name,
      gross_pay: ps.gross_pay,
      ssnit_employee: ps.ssnit_employee,
      paye: ps.paye,
      custom_deductions_total: ps.custom_deductions_total,
      net_pay: ps.net_pay,
      ssnit_employer: ps.ssnit_employer,
      total_employer_cost: ps.total_employer_cost,
    }),
    date: payrollDate,
  }));

  const { error } = await supabase.from("expenses").insert(expenseRows);
  if (error) return NextResponse.json({ error: "Failed to post payroll: " + error.message }, { status: 400 });

  const totalNet = payslips.reduce((s, p) => s + p.net_pay, 0);
  const totalEmployer = payslips.reduce((s, p) => s + p.total_employer_cost, 0);

  return NextResponse.json({
    data: { payslips, period, total_net: totalNet, total_employer_cost: totalEmployer },
  }, { status: 201 });
}
