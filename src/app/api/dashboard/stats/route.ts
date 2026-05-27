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
    const term_id = searchParams.get("term_id");
    const today = new Date().toISOString().split("T")[0];

    const [
      studentCountResult,
      classCountResult,
      teacherCountResult,
      activeStudentsResult,
      attendanceResult,
      feedingResult,
      recentPaymentsResult,
      currentTermResult,
    ] = await Promise.all([
      supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
      supabase.from("classes").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
      supabase.from("teachers").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("status", "active"),
      supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("status", "active"),
      supabase
        .from("attendance_records")
        .select("status, student:students!inner(school_id)", { count: "exact" })
        .eq("date", today)
        .eq("student.school_id", schoolId),
      supabase
        .from("daily_feeding_attendance")
        .select("id, student:students!inner(school_id)", { count: "exact", head: true })
        .eq("date", today)
        .eq("was_fed", true)
        .eq("student.school_id", schoolId),
      supabase
        .from("fee_payments")
        .select("*, student:students!inner(id, first_name, last_name, school_id, class:classes(name))")
        .eq("student.school_id", schoolId)
        .in("status", ["confirmed", "pending"])
        .order("payment_date", { ascending: false })
        .limit(5),
      supabase
        .from("terms")
        .select("*, academic_year:academic_years!inner(id, name, school_id)")
        .eq("is_current", true)
        .eq("academic_year.school_id", schoolId)
        .maybeSingle(),
    ]);

    // Fee collection stats — scoped via inner join
    let feeQuery = supabase
      .from("fee_payments")
      .select("amount_paid, status, student:students!inner(school_id)")
      .eq("student.school_id", schoolId)
      .in("status", ["confirmed", "pending"]);

    if (term_id) {
      feeQuery = feeQuery.eq("fee_assignment.term_id", term_id);
    }

    const { data: allPayments } = await feeQuery;

    const totalCollected = (allPayments ?? [])
      .filter((p: { status: string }) => p.status === "confirmed")
      .reduce((sum: number, p: { amount_paid: number }) => sum + Number(p.amount_paid), 0);
    const pendingAmount = (allPayments ?? [])
      .filter((p: { status: string }) => p.status === "pending")
      .reduce((sum: number, p: { amount_paid: number }) => sum + Number(p.amount_paid), 0);

    const { data: totalCharged } = await supabase
      .from("fee_assignments")
      .select("amount_after_discount, student:students!inner(school_id)")
      .eq("student.school_id", schoolId);

    const totalFeeCharged =
      (totalCharged ?? []).reduce((sum: number, fa: { amount_after_discount: number }) => sum + Number(fa.amount_after_discount ?? 0), 0);

    const attendanceRecords = attendanceResult.data ?? [];
    const totalAttendance = attendanceRecords.length;
    const presentCount = attendanceRecords.filter((r: { status: string }) => r.status === "present").length;
    const absentCount = attendanceRecords.filter((r: { status: string }) => r.status === "absent").length;
    const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 10000) / 100 : 0;

    return NextResponse.json({
      data: {
        students: { total: studentCountResult.count ?? 0, active: activeStudentsResult.count ?? 0 },
        classes: classCountResult.count ?? 0,
        teachers: teacherCountResult.count ?? 0,
        fees: {
          total_collected: totalCollected,
          pending_amount: pendingAmount,
          total_charged: totalFeeCharged,
          collection_rate: totalFeeCharged > 0 ? Math.round((totalCollected / totalFeeCharged) * 10000) / 100 : 0,
        },
        attendance: { today: { total: totalAttendance, present: presentCount, absent: absentCount, rate: attendanceRate } },
        feeding: { today_fed: feedingResult.count ?? 0 },
        recent_payments: recentPaymentsResult.data ?? [],
        current_term: currentTermResult.data ?? null,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
