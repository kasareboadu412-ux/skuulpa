import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireStaff } from "@/lib/auth-guard";
import { ensureParentAccount } from "@/lib/parent-account";
import { applyCurrentTermClassFees } from "@/lib/apply-fees";
import { generateAdmissionNumber } from "@/lib/admission";
import { getCurrentTermId } from "@/lib/service-fees";

export const runtime = "nodejs";

interface ImportRow {
  first_name?: string;
  last_name?: string;
  admission_number?: string;
  class_name?: string;
  date_of_birth?: string;
  parent_primary_phone?: string;
  parent_secondary_phone?: string;
  parent_email?: string;
  previous_balance?: string | number;
}

interface RowResult {
  row: number;
  name: string;
  status: "created" | "skipped" | "failed";
  admission_number?: string | null;
  parent_pin?: string | null;
  balance_added?: number;
  message?: string;
}

/**
 * Find or create the carry-forward "Previous Term Balance" fee structure and
 * assign the owed amount to the student for the current term.
 */
async function assignPreviousBalance(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  schoolId: string,
  studentId: string,
  termId: string | null,
  amount: number
): Promise<boolean> {
  if (!termId || amount <= 0) return false;
  const label = "Previous Term Balance";

  const { data: existing } = await db
    .from("fee_structures")
    .select("id")
    .eq("school_id", schoolId)
    .eq("category", "other")
    .eq("name", label)
    .maybeSingle();

  let structureId = existing?.id as string | undefined;
  if (!structureId) {
    const { data: created } = await db
      .from("fee_structures")
      .insert({ school_id: schoolId, name: label, category: "other", amount, frequency: "termly", is_active: true })
      .select("id")
      .single();
    structureId = created?.id;
  }
  if (!structureId) return false;

  const { error } = await db
    .from("fee_assignments")
    .upsert(
      { student_id: studentId, fee_structure_id: structureId, term_id: termId, amount_after_discount: amount, is_opted_in: true },
      { onConflict: "student_id,fee_structure_id,term_id" }
    );
  return !error;
}

export async function POST(request: NextRequest) {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { schoolId, role } = auth;

  if (role !== "proprietor" && role !== "admin") {
    return NextResponse.json({ error: "Only an admin can import students" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const rows = (body.rows ?? []) as ImportRow[];
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows to import" }, { status: 400 });
    }
    if (rows.length > 500) {
      return NextResponse.json({ error: "Please import at most 500 students at a time" }, { status: 400 });
    }

    const db = getServiceClient();

    // Class lookup by lowercased name.
    const { data: classRows } = await db
      .from("classes").select("id, name").eq("school_id", schoolId);
    const classByName = new Map<string, string>();
    for (const c of classRows ?? []) classByName.set(String(c.name).trim().toLowerCase(), c.id);

    const termId = await getCurrentTermId(db, schoolId);

    const results: RowResult[] = [];
    let created = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const first = (r.first_name ?? "").trim();
      const last = (r.last_name ?? "").trim();
      const phone = (r.parent_primary_phone ?? "").toString().trim().replace(/\s+/g, "");
      const name = `${first} ${last}`.trim();

      if (!first || !last || !phone) {
        results.push({ row: i + 1, name: name || "(blank)", status: "failed", message: "Missing first name, last name, or parent phone" });
        continue;
      }

      // Resolve class (optional).
      let classId: string | null = null;
      const className = (r.class_name ?? "").trim();
      if (className) {
        classId = classByName.get(className.toLowerCase()) ?? null;
        if (!classId) {
          results.push({ row: i + 1, name, status: "failed", message: `Unknown class "${className}"` });
          continue;
        }
      }

      // Admission number.
      let admissionNumber = (r.admission_number ?? "").toString().trim();
      if (!admissionNumber) admissionNumber = await generateAdmissionNumber(db, schoolId);

      const dob = (r.date_of_birth ?? "").toString().trim() || null;

      // Insert student.
      const { data: student, error: insErr } = await db
        .from("students")
        .insert({
          school_id: schoolId,
          first_name: first,
          last_name: last,
          admission_number: admissionNumber,
          class_id: classId,
          dob,
          parent_primary_phone: phone,
          parent_secondary_phone: (r.parent_secondary_phone ?? "").toString().trim().replace(/\s+/g, "") || null,
          parent_email: (r.parent_email ?? "").toString().trim() || null,
          enrollment_date: new Date().toISOString().split("T")[0],
          status: "active",
        })
        .select("id")
        .single();

      if (insErr || !student) {
        results.push({ row: i + 1, name, status: "failed", message: insErr?.message ?? "Insert failed" });
        continue;
      }

      // Parent login + current-term class fees (best effort).
      let parentPin: string | null = null;
      try {
        const parent = await ensureParentAccount(phone, name);
        if (parent.userId) {
          await db.from("students").update({ parent_user_id: parent.userId }).eq("id", student.id);
          if (parent.created && parent.pin) parentPin = parent.pin;
        }
      } catch { /* ignore parent provisioning errors */ }

      try { await applyCurrentTermClassFees(schoolId, student.id, classId); } catch { /* ignore */ }

      // Previous-term balance carried forward.
      const balance = Number(r.previous_balance ?? 0);
      let balanceAdded = 0;
      if (balance > 0) {
        const ok = await assignPreviousBalance(db, schoolId, student.id, termId, balance);
        if (ok) balanceAdded = balance;
      }

      created++;
      results.push({
        row: i + 1,
        name,
        status: "created",
        admission_number: admissionNumber,
        parent_pin: parentPin,
        balance_added: balanceAdded,
      });
    }

    const failed = results.filter((r) => r.status === "failed").length;
    return NextResponse.json({ created, failed, total: rows.length, results });
  } catch (err) {
    console.error("Student import error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
