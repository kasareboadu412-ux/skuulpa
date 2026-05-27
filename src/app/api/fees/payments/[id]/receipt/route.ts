import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireStaff } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { schoolId } = auth;

  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    const { data: payment, error: paymentError } = await supabase
      .from("fee_payments")
      .select(
        "*, student:students!inner(id, first_name, last_name, school_id, class:classes(*)), fee_assignment:fee_assignments(*, fee_structure:fee_structures(*))"
      )
      .eq("id", id)
      .eq("student.school_id", schoolId)
      .single();

    if (paymentError || !payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

    const { data: existingReceipt } = await supabase
      .from("receipts")
      .select("*")
      .eq("payment_id", id)
      .single();

    if (existingReceipt) return NextResponse.json({ data: existingReceipt, payment });

    const studentName = `${payment.student?.first_name ?? ""} ${payment.student?.last_name ?? ""}`;
    const className = payment.student?.class?.name ?? "";
    const feeStructureName = payment.fee_assignment?.fee_structure?.name ?? "";
    const receiptNumber =
      payment.receipt_number ?? `RCP-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const receiptData = {
      receipt_number: receiptNumber,
      student_name: studentName,
      class: className,
      fee_type: feeStructureName,
      amount_paid: payment.amount_paid,
      balance_before: payment.balance_before,
      payment_method: payment.payment_method,
      transaction_id: payment.transaction_id,
      momo_reference: payment.momo_reference,
      payment_date: payment.payment_date,
      status: payment.status,
      school_receipt: true,
      generated_at: new Date().toISOString(),
    };

    const qrPayload = {
      type: "fee_receipt",
      receipt: receiptNumber,
      student: studentName,
      amount: payment.amount_paid,
      date: payment.payment_date,
      verified: payment.status === "confirmed",
    };

    const { data: receipt, error: receiptError } = await supabase
      .from("receipts")
      .insert([{
        payment_id: id,
        receipt_number: receiptNumber,
        receipt_data: JSON.stringify(receiptData),
        qr_code_data: JSON.stringify(qrPayload),
      }])
      .select("*")
      .single();

    if (receiptError) return NextResponse.json({ error: "Failed to generate receipt" }, { status: 400 });
    return NextResponse.json({ data: receipt, payment, qr_data: qrPayload });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
