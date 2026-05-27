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

    const { data, error } = await supabase
      .from("fee_payments")
      .select(
        "*, student:students!inner(id, first_name, last_name, school_id, class:classes(*)), fee_assignment:fee_assignments(*, fee_structure:fee_structures(*)), receipts(*)"
      )
      .eq("id", id)
      .eq("student.school_id", schoolId)
      .single();

    if (error || !data) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { schoolId } = auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = await createSupabaseServerClient();

    // Verify payment belongs to this school via student
    const { data: existing } = await supabase
      .from("fee_payments")
      .select("id, receipt_number, student:students!inner(school_id)")
      .eq("id", id)
      .eq("student.school_id", schoolId)
      .single();

    if (!existing) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

    const updateData: Record<string, unknown> = { ...body };
    if (body.status === "confirmed" && !body.verified_at) {
      updateData.verified_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("fee_payments")
      .update(updateData)
      .eq("id", id)
      .select("*, student:students(*), fee_assignment:fee_assignments(*, fee_structure:fee_structures(*))")
      .single();

    if (error) return NextResponse.json({ error: "Failed to update payment" }, { status: 400 });

    if (body.status === "confirmed") {
      const { data: existingReceipt } = await supabase
        .from("receipts")
        .select("id")
        .eq("payment_id", id)
        .single();

      if (!existingReceipt) {
        await supabase.from("receipts").insert([{
          payment_id: id,
          receipt_number: data.receipt_number ?? `RCP-${Date.now()}`,
          receipt_data: JSON.stringify({
            student_name: `${data.student?.first_name ?? ""} ${data.student?.last_name ?? ""}`,
            amount: data.amount_paid,
            payment_date: data.payment_date,
            receipt_number: data.receipt_number,
            payment_method: data.payment_method,
          }),
          qr_code_data: JSON.stringify({
            type: "payment_receipt",
            receipt: data.receipt_number,
            amount: data.amount_paid,
            date: data.payment_date,
          }),
        }]);
      }
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
