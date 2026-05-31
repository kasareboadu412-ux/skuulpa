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
    const student_id = searchParams.get("student_id");
    const term_id = searchParams.get("term_id");

    // Scope via inner join on student → school
    let query = supabase
      .from("fee_assignments")
      .select(
        "*, student:students!inner(id, first_name, last_name, school_id, class:classes(*)), fee_structure:fee_structures(*), term:terms(*), fee_payments(*)"
      )
      .eq("student.school_id", schoolId)
      .order("created_at", { ascending: false });

    if (student_id) query = query.eq("student_id", student_id);
    if (term_id) query = query.eq("term_id", term_id);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: "Failed to fetch fee assignments" }, { status: 400 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { schoolId } = auth;

  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();

    if (body.bulk) {
      const { class_id, fee_structure_id, term_id, skip_opt_in, apply_sibling_discount } = body;

      if (!class_id || !fee_structure_id || !term_id) {
        return NextResponse.json(
          { error: "class_id, fee_structure_id, and term_id are required for bulk assignment" },
          { status: 400 }
        );
      }

      // Verify class belongs to this school
      const { data: classRow } = await supabase
        .from("classes")
        .select("id")
        .eq("id", class_id)
        .eq("school_id", schoolId)
        .maybeSingle();

      if (!classRow) return NextResponse.json({ error: "Class not found" }, { status: 404 });

      // Verify fee structure belongs to this school
      const { data: feeStructure } = await supabase
        .from("fee_structures")
        .select("id, amount")
        .eq("id", fee_structure_id)
        .eq("school_id", schoolId)
        .maybeSingle();

      if (!feeStructure) return NextResponse.json({ error: "Fee structure not found" }, { status: 404 });

      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("id")
        .eq("class_id", class_id)
        .eq("school_id", schoolId)
        .eq("status", "active");

      if (studentsError) return NextResponse.json({ error: "Failed to fetch students" }, { status: 400 });
      if (!students || students.length === 0) {
        return NextResponse.json({ error: "No active students found in this class" }, { status: 404 });
      }

      const assignments: Array<{
        student_id: string;
        fee_structure_id: string;
        term_id: string;
        amount_after_discount: number;
        is_opted_in: boolean;
      }> = students.map((student) => ({
        student_id: student.id,
        fee_structure_id,
        term_id,
        amount_after_discount: feeStructure.amount,
        is_opted_in: skip_opt_in ? true : true,
      }));

      if (apply_sibling_discount) {
        const { data: siblingGroups } = await supabase
          .from("sibling_group_members")
          .select("sibling_group_id, student_id");

        if (siblingGroups) {
          const siblingsByGroup: Record<string, string[]> = {};
          for (const sg of siblingGroups) {
            if (!siblingsByGroup[sg.sibling_group_id]) siblingsByGroup[sg.sibling_group_id] = [];
            siblingsByGroup[sg.sibling_group_id].push(sg.student_id);
          }

          for (const assignment of assignments) {
            for (const members of Object.values(siblingsByGroup)) {
              if (members.includes(assignment.student_id)) {
                const siblingCount = members.length;
                if (siblingCount >= 2) {
                  // Cap discount floor at 50% (multiplier >= 0.5)
                  const multiplier = Math.max(0.5, 1 - 0.1 * (siblingCount - 1));
                  assignment.amount_after_discount = Math.round(feeStructure.amount * multiplier * 100) / 100;
                }
                break;
              }
            }
          }
        }
      }

      // Idempotent: students who already have this fee for this term are skipped
      // (the unique(student_id, fee_structure_id, term_id) constraint) instead of
      // failing the whole batch — so re-running after adding a student just fills
      // in the newcomers.
      const { data, error } = await supabase
        .from("fee_assignments")
        .upsert(assignments, {
          onConflict: "student_id,fee_structure_id,term_id",
          ignoreDuplicates: true,
        })
        .select("*, student:students(*), fee_structure:fee_structures(*), term:terms(*)");

      if (error) return NextResponse.json({ error: "Failed to create fee assignments" }, { status: 400 });
      return NextResponse.json({ data, count: data?.length ?? 0 }, { status: 201 });
    }

    // Single fee assignment
    const { student_id, fee_structure_id, term_id, pro_rated_days, sibling_discount_pct } = body;

    if (!student_id || !fee_structure_id) {
      return NextResponse.json({ error: "student_id and fee_structure_id are required" }, { status: 400 });
    }

    // Verify student belongs to this school
    const { data: student } = await supabase
      .from("students")
      .select("id, parent_primary_phone, parent_secondary_phone")
      .eq("id", student_id)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const { data: feeStructure, error: fsError } = await supabase
      .from("fee_structures")
      .select("*")
      .eq("id", fee_structure_id)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (fsError || !feeStructure) return NextResponse.json({ error: "Fee structure not found" }, { status: 404 });

    let amountAfterDiscount = feeStructure.amount;

    if (sibling_discount_pct && sibling_discount_pct > 0) {
      const phoneFilter = [student.parent_primary_phone];
      if (student.parent_secondary_phone) phoneFilter.push(student.parent_secondary_phone);

      const { data: siblings } = await supabase
        .from("students")
        .select("id")
        .or(phoneFilter.map((p) => `parent_primary_phone.eq.${p},parent_secondary_phone.eq.${p}`).join(","))
        .eq("school_id", schoolId)
        .neq("id", student_id);

      if (siblings && siblings.length > 0) {
        amountAfterDiscount = Math.round(feeStructure.amount * (1 - sibling_discount_pct / 100) * 100) / 100;
      }
    }

    if (pro_rated_days && term_id) {
      const { data: term } = await supabase
        .from("terms")
        .select("start_date, end_date")
        .eq("id", term_id)
        .single();

      if (term) {
        const totalDays = Math.round(
          (new Date(term.end_date).getTime() - new Date(term.start_date).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (totalDays > 0) {
          amountAfterDiscount = Math.round((amountAfterDiscount / totalDays) * pro_rated_days * 100) / 100;
        }
      }
    }

    const { data, error } = await supabase
      .from("fee_assignments")
      .insert([{
        student_id,
        fee_structure_id,
        term_id: term_id || null,
        amount_after_discount: amountAfterDiscount,
        is_opted_in: body.is_opted_in ?? true,
        pro_rated_days: pro_rated_days || null,
      }])
      .select("*, student:students(*), fee_structure:fee_structures(*), term:terms(*)")
      .single();

    if (error) return NextResponse.json({ error: "Failed to create fee assignment" }, { status: 400 });
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
