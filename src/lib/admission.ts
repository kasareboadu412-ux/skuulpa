/**
 * Generate a unique admission number for a school: <SHORTCODE>-<YEAR>-<NNNN>.
 * admission_number is globally unique, so we probe for the next free sequence.
 */
export async function generateAdmissionNumber(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  schoolId: string
): Promise<string> {
  const { data: school } = await db
    .from("schools")
    .select("short_code")
    .eq("id", schoolId)
    .maybeSingle();

  const prefix = ((school?.short_code as string) || "STU").toUpperCase();
  const year = new Date().getFullYear();

  const { count } = await db
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId);

  let seq = (count ?? 0) + 1;
  for (let i = 0; i < 50; i++) {
    const candidate = `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
    const { data: clash } = await db
      .from("students")
      .select("id")
      .eq("admission_number", candidate)
      .maybeSingle();
    if (!clash) return candidate;
    seq++;
  }
  return `${prefix}-${year}-${Date.now().toString().slice(-6)}`;
}
