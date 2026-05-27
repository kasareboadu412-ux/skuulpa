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
    const date_from = searchParams.get("date_from");
    const date_to = searchParams.get("date_to");

    let sourcesQuery = supabase
      .from("enrollment_sources")
      .select("*, student:students(*, class:classes(name))")
      .eq("school_id", schoolId);

    if (date_from) sourcesQuery = sourcesQuery.gte("created_at", date_from);
    if (date_to) sourcesQuery = sourcesQuery.lte("created_at", date_to);

    let studentsQuery = supabase
      .from("students")
      .select("enrollment_date, class:classes(name)")
      .eq("school_id", schoolId);

    if (date_from) studentsQuery = studentsQuery.gte("enrollment_date", date_from);
    if (date_to) studentsQuery = studentsQuery.lte("enrollment_date", date_to);

    const [{ data: sources }, { data: allStudents }] = await Promise.all([
      sourcesQuery.order("created_at", { ascending: false }),
      studentsQuery.order("enrollment_date", { ascending: false }),
    ]);

    const sourceMap = new Map<string, { source: string; count: number; cost: number; students: unknown[] }>();
    for (const entry of sources ?? []) {
      const source = entry.source ?? "other";
      if (!sourceMap.has(source)) sourceMap.set(source, { source, count: 0, cost: 0, students: [] });
      const s = sourceMap.get(source)!;
      s.count++;
      s.cost += Number(entry.cost_per_lead ?? 0);
      s.students.push(entry.student ?? entry);
    }

    const sourceBreakdown = Array.from(sourceMap.values()).map((entry) => ({
      ...entry,
      avg_cost_per_lead: entry.count > 0 ? entry.cost / entry.count : 0,
    }));

    const classEnrollmentMap = new Map<string, number>();
    for (const student of allStudents ?? []) {
      const className = (student.class as { name?: string } | null)?.name ?? "Unassigned";
      classEnrollmentMap.set(className, (classEnrollmentMap.get(className) ?? 0) + 1);
    }

    const monthlyMap = new Map<string, number>();
    for (const student of allStudents ?? []) {
      if (student.enrollment_date) {
        const monthKey = (student.enrollment_date as string).substring(0, 7);
        monthlyMap.set(monthKey, (monthlyMap.get(monthKey) ?? 0) + 1);
      }
    }

    const monthlyEnrollment = Array.from(monthlyMap.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const totalCost = sourceBreakdown.reduce((s, e) => s + e.cost, 0);
    const totalFromSources = sources?.length ?? 0;

    return NextResponse.json({
      data: {
        summary: {
          total_students: allStudents?.length ?? 0,
          total_sources_tracked: totalFromSources,
          total_marketing_cost: totalCost,
          cost_per_enrollment: totalFromSources > 0 ? Math.round((totalCost / totalFromSources) * 100) / 100 : 0,
        },
        by_source: sourceBreakdown,
        by_class: Array.from(classEnrollmentMap.entries()).map(([class_name, count]) => ({ class_name, count })),
        by_month: monthlyEnrollment,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
