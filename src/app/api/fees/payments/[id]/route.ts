import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from("fee_payments")
      .select(
        "*, student:students(*, class:classes(*)), fee_assignment:fee_assignments(*, fee_structure:fee_structures(*)), receipts(*)"
      )
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = { ...body };

    // If confirming payment, generate receipt
    if (body.status === "confirmed" && !body.verified_at) {
      updateData.verified_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("fee_payments")
      .update(updateData)
      .eq("id", id)
      .select(
        "*, student:students(*), fee_assignment:fee_assignments(*, fee_structure:fee_structures(*))"
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Auto-generate receipt if payment confirmed
    if (body.status === "confirmed") {
      const { data: existingReceipt } = await supabase
        .from("receipts")
        .select("id")
        .eq("payment_id", id)
        .single();

      if (!existingReceipt) {
        const receiptData = {
          school_name: "",
          student_name: `${data.student?.first_name ?? ""} ${data.student?.last_name ?? ""}`,
          amount: data.amount_paid,
          payment_date: data.payment_date,
          receipt_number: data.receipt_number,
          payment_method: data.payment_method,
        };

        const receiptPayload = {
          payment_id: id,
          receipt_number: data.receipt_number ?? `RCP-${Date.now()}`,
          receipt_data: JSON.stringify(receiptData),
          qr_code_data: JSON.stringify({
            type: "payment_receipt",
            receipt: data.receipt_number,
            amount: data.amount_paid,
            date: data.payment_date,
          }),
        };

        await supabase.from("receipts").insert([receiptPayload]);
      }
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
