import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireParent, verifyParentOwnsStudent } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireParent();
  if (auth instanceof NextResponse) return auth;
  const { userId, parentPhone } = auth;

  try {
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get("studentId");
    const termId = searchParams.get("termId");

    if (!studentId) return NextResponse.json({ error: "studentId is required" }, { status: 400 });

    if (!await verifyParentOwnsStudent(studentId, userId, parentPhone)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = getServiceClient();

    let feeQuery = supabase
      .from("fee_assignments")
      .select("id, amount_after_discount, is_opted_in, pro_rated_days, term_id, term:term_id(id, name, start_date, end_date, is_current), fee_structure:fee_structure_id(id, name, category, amount, frequency, due_date, late_fee_amount)")
      .eq("student_id", studentId);

    if (termId) feeQuery = feeQuery.eq("term_id", termId);

    const { data: feeAssignments, error: feeError } = await feeQuery;
    if (feeError) return NextResponse.json({ error: feeError.message }, { status: 500 });

    const { data: payments, error: payError } = await supabase
      .from("fee_payments")
      .select("id, amount_paid, balance_before, payment_method, transaction_id, momo_reference, receipt_number, payment_date, status, verified_at, notes, receipts(id, receipt_number, qr_code_data, pdf_url), fee_assignment:fee_assignment_id(id, fee_structure:fee_structure_id(name, category))")
      .eq("student_id", studentId)
      .order("payment_date", { ascending: false });

    if (payError) return NextResponse.json({ error: payError.message }, { status: 500 });

    const categoryTotals: Record<string, { total: number; paid: number }> = {
      tuition: { total: 0, paid: 0 },
      bus: { total: 0, paid: 0 },
      feeding: { total: 0, paid: 0 },
      other: { total: 0, paid: 0 },
    };

    let totalDue = 0;
    let totalPaid = 0;

    for (const fa of feeAssignments ?? []) {
      if (!(fa as { is_opted_in: boolean }).is_opted_in) continue;
      const fee = fa as { fee_structure: { category: string; amount: number } | null; amount_after_discount: number | null };
      const category = fee.fee_structure?.category || "other";
      const amount = fee.amount_after_discount ?? fee.fee_structure?.amount ?? 0;
      categoryTotals[category] = { ...categoryTotals[category], total: categoryTotals[category].total + Number(amount) };
      totalDue += Number(amount);
    }

    for (const p of payments ?? []) {
      const pay = p as { status: string; amount_paid: number; fee_assignment: { fee_structure: { category: string } | null } | null };
      if (pay.status === "confirmed") {
        const category = pay.fee_assignment?.fee_structure?.category || "other";
        categoryTotals[category] = { ...categoryTotals[category], paid: categoryTotals[category].paid + Number(pay.amount_paid) };
        totalPaid += Number(pay.amount_paid);
      }
    }

    return NextResponse.json({ feeAssignments: feeAssignments ?? [], payments: payments ?? [], summary: { totalDue, totalPaid, balance: totalDue - totalPaid, categoryTotals } });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
