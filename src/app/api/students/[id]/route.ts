import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: student, error } = await supabase
      .from("students")
      .select("*, class:classes(*)")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    const [feeAssignments, attendance, grades] = await Promise.all([
      supabase
        .from("fee_assignments")
        .select("*, fee_structure:fee_structures(*), term:terms(*), fee_payments(*)")
        .eq("student_id", id),
      supabase
        .from("attendance_records")
        .select("*")
        .eq("student_id", id)
        .order("date", { ascending: false })
        .limit(60),
      supabase
        .from("assessment_scores")
        .select("*, assessment:assessments(*)")
        .eq("student_id", id),
    ]);

    return NextResponse.json({
      data: {
        ...student,
        fee_assignments: feeAssignments.data ?? [],
        attendance: attendance.data ?? [],
        grades: grades.data ?? [],
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { data, error } = await supabase
      .from("students")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*, class:classes(*)")
      .single();

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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from("students")
      .update({ status: "withdrawn", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*, class:classes(*)")
      .single();

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
