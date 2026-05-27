import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getServiceClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get("studentId");
    const termId = searchParams.get("termId");

    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Get fee assignments for the student with fee structure details
    let feeQuery = supabase
      .from("fee_assignments")
      .select(`
        id,
        amount_after_discount,
        is_opted_in,
        pro_rated_days,
        term_id,
        term:term_id (
          id,
          name,
          start_date,
          end_date,
          is_current
        ),
        fee_structure:fee_structure_id (
          id,
          name,
          category,
          amount,
          frequency,
          due_date,
          late_fee_amount
        )
      `)
      .eq("student_id", studentId);

    if (termId) {
      feeQuery = feeQuery.eq("term_id", termId);
    }

    const { data: rawFeeAssignments, error: feeError } = await feeQuery;
    const feeAssignments = (rawFeeAssignments || []) as unknown as {
      id: string;
      amount_after_discount: number | null;
      is_opted_in: boolean;
      fee_structure: { name: string; category: string; amount: number; due_date: string | null } | null;
      term: { name: string } | null;
    }[];

    if (feeError) {
      return NextResponse.json({ error: feeError.message }, { status: 500 });
    }

    // Get payment history for the student
    let paymentQuery = supabase
      .from("fee_payments")
      .select(`
        id,
        amount_paid,
        balance_before,
        payment_method,
        transaction_id,
        momo_reference,
        receipt_number,
        payment_date,
        status,
        verified_at,
        notes,
        receipts (
          id,
          receipt_number,
          qr_code_data,
          pdf_url
        ),
        fee_assignment:fee_assignment_id (
          id,
          fee_structure:fee_structure_id (
            name,
            category
          )
        )
      `)
      .eq("student_id", studentId)
      .order("payment_date", { ascending: false });

    const { data: rawPayments, error: payError } = await paymentQuery;
    const payments = (rawPayments || []) as unknown as {
      id: string;
      amount_paid: number;
      payment_method: string | null;
      transaction_id: string | null;
      receipt_number: string | null;
      payment_date: string;
      status: string;
      receipts: { id: string; receipt_number: string; qr_code_data: string | null; pdf_url: string | null }[];
      fee_assignment: { fee_structure: { name: string; category: string } | null } | null;
    }[];

    if (payError) {
      return NextResponse.json({ error: payError.message }, { status: 500 });
    }

    // Calculate total due, total paid, and current balance per category
    const categoryTotals: Record<string, { total: number; paid: number }> = {
      tuition: { total: 0, paid: 0 },
      bus: { total: 0, paid: 0 },
      feeding: { total: 0, paid: 0 },
      other: { total: 0, paid: 0 },
    };

    let totalDue = 0;
    let totalPaid = 0;

    for (const fa of feeAssignments) {
      if (!fa.is_opted_in) continue;
      const category = fa.fee_structure?.category || "other";
      const amount = fa.amount_after_discount ?? fa.fee_structure?.amount ?? 0;
      categoryTotals[category] = {
        ...categoryTotals[category],
        total: categoryTotals[category].total + Number(amount),
      };
      totalDue += Number(amount);
    }

    for (const p of payments) {
      if (p.status === "confirmed") {
        const category = p.fee_assignment?.fee_structure?.category || "other";
        categoryTotals[category] = {
          ...categoryTotals[category],
          paid: categoryTotals[category].paid + Number(p.amount_paid),
        };
        totalPaid += Number(p.amount_paid);
      }
    }

    const balance = totalDue - totalPaid;

    return NextResponse.json({
      feeAssignments,
      payments,
      summary: {
        totalDue,
        totalPaid,
        balance,
        categoryTotals,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
