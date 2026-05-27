import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireStaff } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { schoolId } = auth;

  try {
    const { studentId } = await params;
    const supabase = await createSupabaseServerClient();

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("*, class:classes(*)")
      .eq("id", studentId)
      .eq("school_id", schoolId)
      .single();

    if (studentError || !student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const { data: assignments, error: assignmentsError } = await supabase
      .from("fee_assignments")
      .select("*, fee_structure:fee_structures(*), term:terms(*), fee_payments(*)")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (assignmentsError) return NextResponse.json({ error: "Failed to fetch fee assignments" }, { status: 400 });

    const { data: orphanPayments } = await supabase
      .from("fee_payments")
      .select("*")
      .eq("student_id", studentId)
      .is("fee_assignment_id", null)
      .order("payment_date", { ascending: false });

    let totalCharged = 0;
    let totalPaid = 0;
    let pendingPayments = 0;

    const enrichedAssignments = (assignments ?? []).map((assignment) => {
      const charged = Number(assignment.amount_after_discount ?? 0);
      const paid = (assignment.fee_payments ?? [])
        .filter((p: { status: string }) => p.status === "confirmed")
        .reduce((sum: number, p: { amount_paid: number }) => sum + Number(p.amount_paid), 0);
      const pending = (assignment.fee_payments ?? [])
        .filter((p: { status: string }) => p.status === "pending")
        .reduce((sum: number, p: { amount_paid: number }) => sum + Number(p.amount_paid), 0);

      totalCharged += charged;
      totalPaid += paid;
      pendingPayments += pending;

      return { ...assignment, total_charged: charged, total_paid: paid, pending_amount: pending, balance: charged - paid };
    });

    const orphanTotalPaid = (orphanPayments ?? [])
      .filter((p: { status: string }) => p.status === "confirmed")
      .reduce((sum: number, p: { amount_paid: number }) => sum + Number(p.amount_paid), 0);

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
          collection_rate: totalCharged > 0 ? Math.round((totalPaid / totalCharged) * 10000) / 100 : 0,
        },
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
