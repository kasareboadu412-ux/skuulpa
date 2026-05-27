import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const student_id = searchParams.get("student_id");
    const term_id = searchParams.get("term_id");
    const school_id = searchParams.get("school_id");

    let query = supabase
      .from("fee_assignments")
      .select(
        "*, student:students(*), fee_structure:fee_structures(*), term:terms(*), fee_payments(*)"
      )
      .order("created_at", { ascending: false });

    if (student_id) {
      query = query.eq("student_id", student_id);
    }
    if (term_id) {
      query = query.eq("term_id", term_id);
    }
    if (school_id) {
      query = query.eq("fee_structures.school_id", school_id);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
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

    // If bulk flag is set, create assignments for all students in a class
    if (body.bulk) {
      const { class_id, fee_structure_id, term_id, skip_opt_in } = body;

      if (!class_id || !fee_structure_id || !term_id) {
        return NextResponse.json(
          { error: "class_id, fee_structure_id, and term_id are required for bulk assignment" },
          { status: 400 }
        );
      }

      // Get all active students in the class
      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("id, class_id")
        .eq("class_id", class_id)
        .eq("status", "active");

      if (studentsError) {
        return NextResponse.json({ error: studentsError.message }, { status: 400 });
      }

      if (!students || students.length === 0) {
        return NextResponse.json(
          { error: "No active students found in this class" },
          { status: 404 }
        );
      }

      // Get fee structure amount
      const { data: feeStructure } = await supabase
        .from("fee_structures")
        .select("id, amount")
        .eq("id", fee_structure_id)
        .single();

      if (!feeStructure) {
        return NextResponse.json(
          { error: "Fee structure not found" },
          { status: 404 }
        );
      }

      // Calculate sibling discounts using sibling_groups
      const { data: siblingGroups } = await supabase
        .from("sibling_group_members")
        .select("sibling_group_id, student_id, sibling_groups!inner(parent_phone)");

      // Build assignments — one per student
      const assignments = students.map((student) => ({
        student_id: student.id,
        fee_structure_id,
        term_id,
        amount_after_discount: feeStructure.amount,
        is_opted_in: skip_opt_in ? true : true,
      }));

      // Apply sibling discounts
      if (siblingGroups && body.apply_sibling_discount) {
        const siblingsByGroup: Record<string, string[]> = {};
        for (const sg of siblingGroups as any[]) {
          const groupId = sg.sibling_group_id;
          if (!siblingsByGroup[groupId]) siblingsByGroup[groupId] = [];
          siblingsByGroup[groupId].push(sg.student_id);
        }

        for (const assignment of assignments) {
          for (const [, members] of Object.entries(siblingsByGroup)) {
            if ((members as string[]).includes(assignment.student_id)) {
              // Sibling discount: second sibling gets discount
              const siblingCount = (members as string[]).length;
              if (siblingCount >= 2) {
                assignment.amount_after_discount = Math.round(
                  feeStructure.amount * (1 - 0.1 * (siblingCount - 1)) * 100
                ) / 100;
              }
              break;
            }
          }
        }
      }

      const { data, error } = await supabase
        .from("fee_assignments")
        .insert(assignments)
        .select("*, student:students(*), fee_structure:fee_structures(*), term:terms(*)");

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ data, count: data?.length ?? 0 }, { status: 201 });
    }

    // Single fee assignment with discount/pro-ration calculation
    const { student_id, fee_structure_id, term_id, pro_rated_days, sibling_discount_pct } = body;

    if (!student_id || !fee_structure_id) {
      return NextResponse.json(
        { error: "student_id and fee_structure_id are required" },
        { status: 400 }
      );
    }

    // Get the fee structure
    const { data: feeStructure, error: fsError } = await supabase
      .from("fee_structures")
      .select("*")
      .eq("id", fee_structure_id)
      .single();

    if (fsError || !feeStructure) {
      return NextResponse.json({ error: "Fee structure not found" }, { status: 404 });
    }

    let amountAfterDiscount = feeStructure.amount;

    // Apply sibling discount if applicable
    if (sibling_discount_pct && sibling_discount_pct > 0) {
      // Check if student has siblings in the same school
      const { data: student } = await supabase
        .from("students")
        .select("parent_primary_phone, parent_secondary_phone")
        .eq("id", student_id)
        .single();

      if (student) {
        const phoneFilter = [student.parent_primary_phone];
        if (student.parent_secondary_phone) {
          phoneFilter.push(student.parent_secondary_phone);
        }

        const { data: siblings } = await supabase
          .from("students")
          .select("id")
          .or(
            phoneFilter
              .map((p) => `parent_primary_phone.eq.${p},parent_secondary_phone.eq.${p}`)
              .join(",")
          )
          .neq("id", student_id);

        if (siblings && siblings.length > 0) {
          amountAfterDiscount = Math.round(
            feeStructure.amount * (1 - sibling_discount_pct / 100) * 100
          ) / 100;
        }
      }
    }

    // Apply pro-ration for mid-term enrollment
    if (pro_rated_days && term_id) {
      // Get term duration
      const { data: term } = await supabase
        .from("terms")
        .select("start_date, end_date")
        .eq("id", term_id)
        .single();

      if (term) {
        const termStart = new Date(term.start_date);
        const termEnd = new Date(term.end_date);
        const totalDays = Math.round(
          (termEnd.getTime() - termStart.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (totalDays > 0) {
          amountAfterDiscount = Math.round(
            (amountAfterDiscount / totalDays) * pro_rated_days * 100
          ) / 100;
        }
      }
    }

    const { data, error } = await supabase
      .from("fee_assignments")
      .insert([
        {
          student_id,
          fee_structure_id,
          term_id: term_id || null,
          amount_after_discount: amountAfterDiscount,
          is_opted_in: body.is_opted_in ?? true,
          pro_rated_days: pro_rated_days || null,
        },
      ])
      .select("*, student:students(*), fee_structure:fee_structures(*), term:terms(*)")
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
