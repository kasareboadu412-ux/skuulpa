import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;

    // Get student details
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("*, class:classes(*)")
      .eq("id", studentId)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Get all fee assignments for this student (with structure and term)
    const { data: assignments, error: assignmentsError } = await supabase
      .from("fee_assignments")
      .select(
        "*, fee_structure:fee_structures(*), term:terms(*), fee_payments(*)",
      )
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (assignmentsError) {
      return NextResponse.json({ error: assignmentsError.message }, { status: 400 });
    }

    // Get all payments not tied to a specific assignment (bulk/other payments)
    const { data: orphanPayments } = await supabase
      .from("fee_payments")
      .select("*")
      .eq("student_id", studentId)
      .is("fee_assignment_id", null)
      .order("payment_date", { ascending: false });

    // Calculate full ledger summary
    let totalCharged = 0;
    let totalPaid = 0;
    let pendingPayments = 0;

    const enrichedAssignments = (assignments ?? []).map((assignment) => {
      const charged = Number(assignment.amount_after_discount ?? 0);
      const paid = (assignment.fee_payments ?? [])
        .filter((p: any) => p.status === "confirmed")
        .reduce((sum: number, p: any) => sum + Number(p.amount_paid), 0);
      const pending = (assignment.fee_payments ?? [])
        .filter((p: any) => p.status === "pending")
        .reduce((sum: number, p: any) => sum + Number(p.amount_paid), 0);

      totalCharged += charged;
      totalPaid += paid;
      pendingPayments += pending;

      return {
        ...assignment,
        total_charged: charged,
        total_paid: paid,
        pending_amount: pending,
        balance: charged - paid,
      };
    });

    const orphanTotalPaid =
      (orphanPayments ?? [])
        .filter((p: any) => p.status === "confirmed")
        .reduce((sum: number, p: any) => sum + Number(p.amount_paid), 0);

    totalPaid += orphanTotalPaid;

    return NextResponse.json({
      data: {
        student,
        assignments: enrichedAssignments,
        orphan_payments: orphanPayments ?? [],
        summary: {
          total_charged: totalCharged,
          total_paid: totalPaid,
          outstanding_balance: Math.max(0, totalCharged - totalPaid),
          pending_payments: pendingPayments,
          collection_rate:
            totalCharged > 0
              ? Math.round((totalPaid / totalCharged) * 10000) / 100
              : 0,
        },
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
