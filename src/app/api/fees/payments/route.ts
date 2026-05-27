import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const student_id = searchParams.get("student_id");
    const status = searchParams.get("status");
    const payment_method = searchParams.get("payment_method");
    const date_from = searchParams.get("date_from");
    const date_to = searchParams.get("date_to");
    const class_id = searchParams.get("class_id");
    const school_id = searchParams.get("school_id");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "50");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("fee_payments")
      .select(
        "*, student:students(*, class:classes(*)), fee_assignment:fee_assignments(*, fee_structure:fee_structures(*))",
        { count: "exact" }
      );

    if (student_id) {
      query = query.eq("student_id", student_id);
    }
    if (status) {
      query = query.eq("status", status);
    }
    if (payment_method) {
      query = query.eq("payment_method", payment_method);
    }
    if (date_from) {
      query = query.gte("payment_date", date_from);
    }
    if (date_to) {
      query = query.lte("payment_date", date_to);
    }
    if (class_id) {
      query = query.eq("student.class_id", class_id);
    }

    const { data, error, count } = await query
      .order("payment_date", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      data,
      pagination: { page, limit, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / limit) },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      student_id,
      fee_assignment_id,
      amount_paid,
      payment_method,
      transaction_id,
      momo_reference,
      notes,
    } = body;

    if (!student_id || !amount_paid) {
      return NextResponse.json(
        { error: "student_id and amount_paid are required" },
        { status: 400 }
      );
    }

    // Generate receipt number
    const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Get balance before this payment
    let balanceBefore = 0;
    if (fee_assignment_id) {
      const { data: assignment } = await supabase
        .from("fee_assignments")
        .select("amount_after_discount")
        .eq("id", fee_assignment_id)
        .single();

      if (assignment?.amount_after_discount) {
        const { data: previousPayments } = await supabase
          .from("fee_payments")
          .select("amount_paid")
          .eq("fee_assignment_id", fee_assignment_id)
          .in("status", ["confirmed", "pending"]);

        const totalPaid =
          previousPayments?.reduce((sum, p) => sum + Number(p.amount_paid), 0) ?? 0;
        balanceBefore = Math.max(
          0,
          Number(assignment.amount_after_discount) - totalPaid
        );
      }
    }

    const { data, error } = await supabase
      .from("fee_payments")
      .insert([
        {
          student_id,
          fee_assignment_id: fee_assignment_id || null,
          amount_paid,
          balance_before: balanceBefore,
          payment_method: payment_method || null,
          transaction_id: transaction_id || null,
          momo_reference: momo_reference || null,
          receipt_number: receiptNumber,
          status: "pending",
          notes: notes || null,
        },
      ])
      .select(
        "*, student:students(*), fee_assignment:fee_assignments(*, fee_structure:fee_structures(*))"
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
