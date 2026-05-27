import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const school_id = searchParams.get("school_id");
    const date_from = searchParams.get("date_from");
    const date_to = searchParams.get("date_to");

    if (!school_id) {
      return NextResponse.json(
        { error: "school_id query parameter is required" },
        { status: 400 }
      );
    }

    // Get enrollment sources with student data
    let query = supabase
      .from("enrollment_sources")
      .select("*, student:students(*, class:classes(name))")
      .eq("school_id", school_id);

    if (date_from) {
      query = query.gte("created_at", date_from);
    }
    if (date_to) {
      query = query.lte("created_at", date_to);
    }

    const { data: sources } = await query.order("created_at", { ascending: false });

    // Get all students for enrollment stats over time
    let studentsQuery = supabase
      .from("students")
      .select("*, class:classes(name)")
      .eq("school_id", school_id);

    if (date_from) {
      studentsQuery = studentsQuery.gte("enrollment_date", date_from);
    }
    if (date_to) {
      studentsQuery = studentsQuery.lte("enrollment_date", date_to);
    }

    const { data: allStudents } = await studentsQuery.order("enrollment_date", { ascending: false });

    // Group by source
    const sourceMap = new Map<
      string,
      { source: string; count: number; cost: number; students: any[] }
    >();

    for (const entry of sources ?? []) {
      const source = entry.source ?? "other";
      if (!sourceMap.has(source)) {
        sourceMap.set(source, { source, count: 0, cost: 0, students: [] });
      }
      const s = sourceMap.get(source)!;
      s.count++;
      s.cost += Number(entry.cost_per_lead ?? 0);
      s.students.push(entry.student ?? entry);
    }

    const sourceBreakdown = Array.from(sourceMap.values()).map((entry) => ({
      ...entry,
      avg_cost_per_lead: entry.count > 0 ? entry.cost / entry.count : 0,
    }));

    // Enrollment by class
    const classEnrollmentMap = new Map<string, number>();
    for (const student of allStudents ?? []) {
      const className = (student as any).class?.name ?? "Unassigned";
      classEnrollmentMap.set(
        className,
        (classEnrollmentMap.get(className) ?? 0) + 1
      );
    }

    // Enrollment over time (monthly)
    const monthlyMap = new Map<string, number>();
    for (const student of allStudents ?? []) {
      const date = student.enrollment_date;
      if (date) {
        const monthKey = date.substring(0, 7); // YYYY-MM
        monthlyMap.set(monthKey, (monthlyMap.get(monthKey) ?? 0) + 1);
      }
    }

    const monthlyEnrollment = Array.from(monthlyMap.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const totalStudents = allStudents?.length ?? 0;
    const totalCost = sourceBreakdown.reduce((s, e) => s + e.cost, 0);
    const totalFromSources = sources?.length ?? 0;

    return NextResponse.json({
      data: {
        summary: {
          total_students: totalStudents,
          total_sources_tracked: totalFromSources,
          total_marketing_cost: totalCost,
          cost_per_enrollment:
            totalFromSources > 0
              ? Math.round((totalCost / totalFromSources) * 100) / 100
              : 0,
        },
        by_source: sourceBreakdown,
        by_class: Array.from(classEnrollmentMap.entries()).map(
          ([class_name, count]) => ({ class_name, count })
        ),
        by_month: monthlyEnrollment,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
