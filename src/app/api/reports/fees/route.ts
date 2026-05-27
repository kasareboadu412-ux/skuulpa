import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireStaff } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { schoolId } = auth;

  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const term_id = searchParams.get("term_id");
    const class_id = searchParams.get("class_id");

    // Determine active term
    let activeTermId = term_id;
    if (!activeTermId) {
      const { data: currentTerm } = await supabase
        .from("terms")
        .select("id, academic_year:academic_years!inner(school_id)")
        .eq("is_current", true)
        .eq("academic_year.school_id", schoolId)
        .maybeSingle();
      activeTermId = currentTerm?.id;
    }

    const { data: feeStructures } = await supabase
      .from("fee_structures")
      .select("*, class:classes(name)")
      .eq("school_id", schoolId)
      .eq("is_active", true);

    // Get all assignments scoped to this school in one query
    let assignmentsQuery = supabase
      .from("fee_assignments")
      .select("id, amount_after_discount, fee_structure:fee_structures!inner(id, name, school_id, class_id), student:students!inner(id, first_name, last_name, school_id, class:classes(name))")
      .eq("fee_structure.school_id", schoolId);

    if (activeTermId) assignmentsQuery = assignmentsQuery.eq("term_id", activeTermId);
    if (class_id) assignmentsQuery = assignmentsQuery.eq("fee_structure.class_id", class_id);

    const { data: allAssignments } = await assignmentsQuery;

    if (!allAssignments || allAssignments.length === 0) {
      return NextResponse.json({
        data: {
          summary: { total_charged: 0, total_collected: 0, total_pending: 0, outstanding: 0, collection_rate: 0, total_classes: 0 },
          by_class: [],
          fee_structures: feeStructures ?? [],
        },
      });
    }

    // Fetch all payments for these assignments in a single query (no N+1)
    const assignmentIds = allAssignments.map((a) => a.id);
    const { data: allPayments } = await supabase
      .from("fee_payments")
      .select("fee_assignment_id, amount_paid, status")
      .in("fee_assignment_id", assignmentIds);

    // Index payments by assignment_id
    const paymentsByAssignment = new Map<string, { confirmed: number; pending: number }>();
    for (const p of allPayments ?? []) {
      if (!paymentsByAssignment.has(p.fee_assignment_id)) {
        paymentsByAssignment.set(p.fee_assignment_id, { confirmed: 0, pending: 0 });
      }
      const entry = paymentsByAssignment.get(p.fee_assignment_id)!;
      if (p.status === "confirmed") entry.confirmed += Number(p.amount_paid);
      else if (p.status === "pending") entry.pending += Number(p.amount_paid);
    }

    // Build class-level report
    const classMap = new Map<string, { class_name: string; total_charged: number; total_collected: number; pending: number; fee_breakdown: Record<string, { charged: number; collected: number }> }>();

    for (const assignment of allAssignments) {
      const student = assignment.student as unknown as { class: { name?: string } | null };
      const feeStructure = assignment.fee_structure as unknown as { name: string };
      const className = student?.class?.name ?? "Unknown";
      const feeName = feeStructure?.name ?? "Unknown";

      if (!classMap.has(className)) {
        classMap.set(className, { class_name: className, total_charged: 0, total_collected: 0, pending: 0, fee_breakdown: {} });
      }

      const entry = classMap.get(className)!;
      const charged = Number(assignment.amount_after_discount ?? 0);
      entry.total_charged += charged;

      const pmts = paymentsByAssignment.get(assignment.id) ?? { confirmed: 0, pending: 0 };
      entry.total_collected += pmts.confirmed;
      entry.pending += pmts.pending;

      if (!entry.fee_breakdown[feeName]) entry.fee_breakdown[feeName] = { charged: 0, collected: 0 };
      entry.fee_breakdown[feeName].charged += charged;
      entry.fee_breakdown[feeName].collected += pmts.confirmed;
    }

    const classReports = Array.from(classMap.values()).map((entry) => ({
      ...entry,
      collection_rate: entry.total_charged > 0 ? Math.round((entry.total_collected / entry.total_charged) * 10000) / 100 : 0,
    }));

    const totalCharged = classReports.reduce((s, r) => s + r.total_charged, 0);
    const totalCollected = classReports.reduce((s, r) => s + r.total_collected, 0);
    const totalPending = classReports.reduce((s, r) => s + r.pending, 0);

    return NextResponse.json({
      data: {
        summary: {
          total_charged: totalCharged,
          total_collected: totalCollected,
          total_pending: totalPending,
          outstanding: totalCharged - totalCollected,
          collection_rate: totalCharged > 0 ? Math.round((totalCollected / totalCharged) * 10000) / 100 : 0,
          total_classes: classReports.length,
        },
        by_class: classReports,
        fee_structures: feeStructures ?? [],
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
