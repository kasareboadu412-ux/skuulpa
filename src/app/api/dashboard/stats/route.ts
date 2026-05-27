import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const school_id = searchParams.get("school_id");
    const term_id = searchParams.get("term_id");

    if (!school_id) {
      return NextResponse.json(
        { error: "school_id query parameter is required" },
        { status: 400 }
      );
    }

    // Run all dashboard queries in parallel
    const [
      studentCountResult,
      classCountResult,
      teacherCountResult,
      activeStudentsResult,
      feeStatsResult,
      attendanceResult,
      feedingResult,
      recentPaymentsResult,
      currentTermResult,
    ] = await Promise.all([
      // Total students
      supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("school_id", school_id),

      // Class count
      supabase
        .from("classes")
        .select("id", { count: "exact", head: true })
        .eq("school_id", school_id),

      // Teacher count
      supabase
        .from("teachers")
        .select("id", { count: "exact", head: true })
        .eq("school_id", school_id)
        .eq("status", "active"),

      // Active student count
      supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("school_id", school_id)
        .eq("status", "active"),

      // Fee collection stats
      supabase
        .from("fee_payments")
        .select("amount_paid, status, student_id")
        .eq("student_id.school_id", school_id)
        .in("status", ["confirmed", "pending"]),

      // Today's attendance
      supabase
        .from("attendance_records")
        .select("status", { count: "exact" })
        .eq("date", new Date().toISOString().split("T")[0])
        .eq("student.school_id", school_id),

      // Today's feeding count
      supabase
        .from("daily_feeding_attendance")
        .select("id", { count: "exact", head: true })
        .eq("date", new Date().toISOString().split("T")[0])
        .eq("was_fed", true),

      // Recent 5 payments
      supabase
        .from("fee_payments")
        .select("*, student:students(id, first_name, last_name, class_id, class:classes(name))")
        .in("status", ["confirmed", "pending"])
        .order("payment_date", { ascending: false })
        .limit(5),

      // Current term
      supabase
        .from("terms")
        .select("*, academic_year:academic_years(*)")
        .eq("is_current", true)
        .single(),
    ]);

    // Calculate fee collection stats
    const allPayments = feeStatsResult.data ?? [];
    const totalCollected = allPayments
      .filter((p: any) => p.status === "confirmed")
      .reduce((sum: number, p: any) => sum + Number(p.amount_paid), 0);
    const pendingAmount = allPayments
      .filter((p: any) => p.status === "pending")
      .reduce((sum: number, p: any) => sum + Number(p.amount_paid), 0);

    // Get total fee charges for collection rate
    const { data: totalCharged } = await supabase
      .from("fee_assignments")
      .select("amount_after_discount")
      .eq("fee_structures.school_id", school_id);

    const totalFeeCharged =
      totalCharged?.reduce((sum: number, fa: any) => sum + Number(fa.amount_after_discount ?? 0), 0) ?? 0;

    // Attendance stats
    const attendanceRecords = attendanceResult.data ?? [];
    const totalAttendance = attendanceRecords.length;
    const presentCount = attendanceRecords.filter((r: any) => r.status === "present").length;
    const absentCount = attendanceRecords.filter((r: any) => r.status === "absent").length;
    const attendanceRate = totalAttendance > 0
      ? Math.round((presentCount / totalAttendance) * 10000) / 100
      : 0;

    return NextResponse.json({
      data: {
        students: {
          total: studentCountResult.count ?? 0,
          active: activeStudentsResult.count ?? 0,
        },
        classes: classCountResult.count ?? 0,
        teachers: teacherCountResult.count ?? 0,
        fees: {
          total_collected: totalCollected,
          pending_amount: pendingAmount,
          total_charged: totalFeeCharged,
          collection_rate:
            totalFeeCharged > 0
              ? Math.round((totalCollected / totalFeeCharged) * 10000) / 100
              : 0,
        },
        attendance: {
          today: {
            total: totalAttendance,
            present: presentCount,
            absent: absentCount,
            rate: attendanceRate,
          },
        },
        feeding: {
          today_fed: feedingResult.count ?? 0,
        },
        recent_payments: recentPaymentsResult.data ?? [],
        current_term: currentTermResult.data ?? null,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
