import { getServiceClient } from "./supabase-server";

export type BillingFrequency = "daily" | "weekly" | "monthly" | "termly";

export const BILLING_FREQUENCIES: BillingFrequency[] = ["daily", "weekly", "monthly", "termly"];

/**
 * Approximate number of billing periods in one school term, used to derive the
 * per-installment rate shown to staff/parents. A Ghana basic-school term runs
 * ~13 teaching weeks (~65 school days, ~3 months).
 */
export const PERIODS_PER_TERM: Record<BillingFrequency, number> = {
  daily: 65,
  weekly: 13,
  monthly: 3,
  termly: 1,
};

/** Weeks in a term — used to convert a daily/weekly service rate into a term total. */
export const TERM_WEEKS = 13;

/** The fee_structures.frequency column only allows these values. */
function mapFrequency(freq: BillingFrequency): "termly" | "monthly" | "custom" {
  if (freq === "termly") return "termly";
  if (freq === "monthly") return "monthly";
  return "custom"; // daily / weekly
}

/** Per-installment amount for a given term total and billing frequency. */
export function perPeriodAmount(termTotal: number, freq: BillingFrequency): number {
  const periods = PERIODS_PER_TERM[freq] || 1;
  return Math.round((termTotal / periods) * 100) / 100;
}

/** Resolve the school's current term id (null if none is marked current). */
export async function getCurrentTermId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  schoolId: string
): Promise<string | null> {
  const { data } = await db
    .from("terms")
    .select("id, academic_year:academic_years!inner(school_id)")
    .eq("is_current", true)
    .eq("academic_year.school_id", schoolId)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

/**
 * Record a recurring service (bus/feeding) charge through the normal fee ledger
 * so it shows on the student's account and is payable via the existing payment
 * flow.
 *
 * - Finds or creates a fee_structure for this service+label (the label carries
 *   the billing frequency, e.g. "Bus: Madina Route (weekly)").
 * - Upserts a fee_assignment for the student in the current term with the full
 *   term total. The billing frequency governs how the parent pays it down in
 *   installments (handled by ordinary partial payments).
 *
 * Returns the assignment id and term id, or null if no current term exists.
 */
export async function assignServiceFee(opts: {
  schoolId: string;
  studentId: string;
  category: "bus" | "feeding";
  label: string;
  termTotal: number;
  frequency: BillingFrequency;
}): Promise<{ feeStructureId: string; feeAssignmentId: string; termId: string } | null> {
  const { schoolId, studentId, category, label, termTotal, frequency } = opts;
  const db = getServiceClient();

  const termId = await getCurrentTermId(db, schoolId);
  if (!termId) return null;

  // Find or create the fee structure for this service+frequency.
  const { data: existingStructure } = await db
    .from("fee_structures")
    .select("id")
    .eq("school_id", schoolId)
    .eq("category", category)
    .eq("name", label)
    .maybeSingle();

  let feeStructureId = (existingStructure as { id: string } | null)?.id ?? null;
  if (feeStructureId) {
    await db.from("fee_structures").update({ amount: termTotal, is_active: true }).eq("id", feeStructureId);
  } else {
    const { data: created, error: createErr } = await db
      .from("fee_structures")
      .insert({
        school_id: schoolId,
        name: label,
        category,
        amount: termTotal,
        frequency: mapFrequency(frequency),
        is_active: true,
      })
      .select("id")
      .single();
    if (createErr || !created) return null;
    feeStructureId = (created as { id: string }).id;
  }

  // Upsert the per-student assignment for the current term.
  const { data: assignment, error: assignErr } = await db
    .from("fee_assignments")
    .upsert(
      {
        student_id: studentId,
        fee_structure_id: feeStructureId,
        term_id: termId,
        amount_after_discount: termTotal,
        is_opted_in: true,
      },
      { onConflict: "student_id,fee_structure_id,term_id" }
    )
    .select("id")
    .single();

  if (assignErr || !assignment) return null;
  return { feeStructureId, feeAssignmentId: (assignment as { id: string }).id, termId };
}
