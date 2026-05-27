import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const school_id = searchParams.get("school_id");
    const term_id = searchParams.get("term_id");
    const class_id = searchParams.get("class_id");

    if (!school_id) {
      return NextResponse.json(
        { error: "school_id query parameter is required" },
        { status: 400 }
      );
    }

    // Determine which term we're reporting on
    let activeTermId = term_id;
    if (!activeTermId) {
      const { data: currentTerm } = await supabase
        .from("terms")
        .select("id")
        .eq("is_current", true)
        .single();
      activeTermId = currentTerm?.id;
    }

    // Get all fee structures for this school
    const { data: feeStructures } = await supabase
      .from("fee_structures")
      .select("*, class:classes(name)")
      .eq("school_id", school_id)
      .eq("is_active", true);

    // Get all assignments for the term
    const assignmentsQuery = supabase
      .from("fee_assignments")
      .select(
        "*, fee_structure:fee_structures(*), student:students(id, first_name, last_name, class_id, class:classes(name))"
      );

    if (activeTermId) {
      assignmentsQuery.eq("term_id", activeTermId);
    }
    if (class_id) {
      assignmentsQuery.eq("fee_structure.class_id", class_id);
    }

    // First get assignments to find related fee_structure school
    const { data: allAssignments } = await assignmentsQuery;

    // Build class-level report
    const classMap = new Map<
      string,
      {
        class_name: string;
        total_students: number;
        total_charged: number;
        total_collected: number;
        pending: number;
        collection_rate: number;
        fee_breakdown: Record<string, { charged: number; collected: number }>;
      }
    >();

    for (const assignment of allAssignments ?? []) {
      const student = assignment.student as any;
      const feeStructure = assignment.fee_structure as any;
      const className = student?.class?.name ?? "Unknown";
      const feeName = feeStructure?.name ?? "Unknown";

      if (!classMap.has(className)) {
        classMap.set(className, {
          class_name: className,
          total_students: 0,
          total_charged: 0,
          total_collected: 0,
          pending: 0,
          collection_rate: 0,
          fee_breakdown: {},
        });
      }

      const entry = classMap.get(className)!;
      const charged = Number(assignment.amount_after_discount ?? 0);
      entry.total_charged += charged;

      // Get payments for this assignment
      const { data: payments } = await supabase
        .from("fee_payments")
        .select("amount_paid, status")
        .eq("fee_assignment_id", assignment.id);

      const confirmedPayment =
        payments
          ?.filter((p: any) => p.status === "confirmed")
          .reduce((sum: number, p: any) => sum + Number(p.amount_paid), 0) ?? 0;

      const pendingPayment =
        payments
          ?.filter((p: any) => p.status === "pending")
          .reduce((sum: number, p: any) => sum + Number(p.amount_paid), 0) ?? 0;

      entry.total_collected += confirmedPayment;
      entry.pending += pendingPayment;

      // Fee breakdown per structure
      if (!entry.fee_breakdown[feeName]) {
        entry.fee_breakdown[feeName] = { charged: 0, collected: 0 };
      }
      entry.fee_breakdown[feeName].charged += charged;
      entry.fee_breakdown[feeName].collected += confirmedPayment;
    }

    // Calculate collection rates
    const classReports = Array.from(classMap.values()).map((entry) => ({
      ...entry,
      collection_rate:
        entry.total_charged > 0
          ? Math.round((entry.total_collected / entry.total_charged) * 10000) / 100
          : 0,
    }));

    // Overall summary
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
          collection_rate:
            totalCharged > 0
              ? Math.round((totalCollected / totalCharged) * 10000) / 100
              : 0,
          total_classes: classReports.length,
        },
        by_class: classReports,
        fee_structures: feeStructures ?? [],
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
