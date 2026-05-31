import { getServiceClient } from "./supabase-server";

/**
 * Auto-apply the current term's class fees to a newly enrolled student.
 *
 * When a student joins a class, they owe the same recurring fees as everyone
 * else in that class for the current term. Rather than forcing staff to re-run
 * a bulk class assignment (which previously collided with existing students on
 * the `unique(student_id, fee_structure_id, term_id)` constraint), we create the
 * matching fee assignments for just this student.
 *
 * Only non-optional categories ("tuition", "other") are auto-applied. Opt-in
 * services ("bus", "feeding") are deliberately skipped — those are assigned
 * explicitly when a family subscribes to them.
 *
 * Idempotent: uses an upsert that ignores rows the student already has.
 */
export async function applyCurrentTermClassFees(
  schoolId: string,
  studentId: string,
  classId: string | null
): Promise<{ count: number; termId: string | null }> {
  if (!classId) return { count: 0, termId: null };

  const db = getServiceClient();

  // Resolve the school's current term.
  const { data: term } = await db
    .from("terms")
    .select("id, academic_year:academic_years!inner(school_id)")
    .eq("is_current", true)
    .eq("academic_year.school_id", schoolId)
    .maybeSingle();

  const termId = (term as { id: string } | null)?.id ?? null;
  if (!termId) return { count: 0, termId: null };

  // Collect the non-optional fee structures this class is charged this term.
  // Base amounts are used (not classmates' discounted amounts) because discounts
  // such as sibling/pro-rating are student-specific.
  const owed = new Map<string, number>();

  // Source 1: structures explicitly tied to this class.
  const { data: classStructures } = await db
    .from("fee_structures")
    .select("id, amount")
    .eq("school_id", schoolId)
    .eq("class_id", classId)
    .eq("is_active", true)
    .in("category", ["tuition", "other"]);

  for (const s of (classStructures ?? []) as { id: string; amount: number }[]) {
    owed.set(s.id, s.amount);
  }

  // Source 2: structures that classmates already carry this term (covers fees
  // assigned in bulk from a class-less structure). Skip opt-in services.
  const { data: classmates } = await db
    .from("students")
    .select("id")
    .eq("school_id", schoolId)
    .eq("class_id", classId)
    .eq("status", "active")
    .neq("id", studentId);

  const classmateIds = (classmates ?? []).map((c: { id: string }) => c.id);
  if (classmateIds.length > 0) {
    const { data: existing } = await db
      .from("fee_assignments")
      .select("fee_structure_id, fee_structure:fee_structures!inner(amount, category, is_active)")
      .in("student_id", classmateIds)
      .eq("term_id", termId);

    type FsRel = { amount: number; category: string; is_active: boolean };
    for (const e of (existing ?? []) as unknown as {
      fee_structure_id: string;
      fee_structure: FsRel | FsRel[] | null;
    }[]) {
      const fs = Array.isArray(e.fee_structure) ? e.fee_structure[0] : e.fee_structure;
      if (!fs || !fs.is_active) continue;
      if (fs.category !== "tuition" && fs.category !== "other") continue;
      if (!owed.has(e.fee_structure_id)) owed.set(e.fee_structure_id, fs.amount);
    }
  }

  if (owed.size === 0) return { count: 0, termId };

  const assignments = Array.from(owed.entries()).map(([fee_structure_id, amount]) => ({
    student_id: studentId,
    fee_structure_id,
    term_id: termId,
    amount_after_discount: amount,
    is_opted_in: true,
  }));

  const { data, error } = await db
    .from("fee_assignments")
    .upsert(assignments, {
      onConflict: "student_id,fee_structure_id,term_id",
      ignoreDuplicates: true,
    })
    .select("id");

  if (error) return { count: 0, termId };
  return { count: data?.length ?? 0, termId };
}
