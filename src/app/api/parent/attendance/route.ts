import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getServiceClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get("studentId");
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");

    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Get attendance records
    let attendanceQuery = supabase
      .from("attendance_records")
      .select(`
        id,
        date,
        status,
        recorded_at,
        synced
      `)
      .eq("student_id", studentId)
      .order("date", { ascending: false });

    if (fromDate) {
      attendanceQuery = attendanceQuery.gte("date", fromDate);
    }

    if (toDate) {
      attendanceQuery = attendanceQuery.lte("date", toDate);
    }

    const { data: rawRecords, error: attError } = await attendanceQuery;
    const attendanceRecords = (rawRecords || []) as unknown as {
      id: string;
      date: string;
      status: string | null;
      recorded_at: string;
      synced: boolean;
    }[];

    if (attError) {
      return NextResponse.json({ error: attError.message }, { status: 500 });
    }

    // Get absence notifications
    const { data: rawAbsences, error: absError } = await supabase
      .from("absence_notifications")
      .select(`
        id,
        date,
        parent1_notified_at,
        parent2_notified_at,
        notification_channel,
        notification_status,
        error_message,
        created_at
      `)
      .eq("student_id", studentId)
      .order("date", { ascending: false });

    const absenceNotifications = (rawAbsences || []) as unknown as {
      id: string;
      date: string | null;
      parent1_notified_at: string | null;
      notification_channel: string | null;
      notification_status: string;
      created_at: string;
    }[];

    if (absError) {
      return NextResponse.json({ error: absError.message }, { status: 500 });
    }

    // Calculate summary
    const summary: {
      total: number;
      present: number;
      absent: number;
      late: number;
      permissionWithdrawn: number;
      leftWithoutPermission: number;
      presentPercentage: number;
    } = {
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      permissionWithdrawn: 0,
      leftWithoutPermission: 0,
      presentPercentage: 0,
    };

    for (const r of attendanceRecords) {
      summary.total++;
      switch (r.status) {
        case "present":
          summary.present++;
          break;
        case "absent":
          summary.absent++;
          break;
        case "late":
          summary.late++;
          break;
        case "permission_withdrawn":
          summary.permissionWithdrawn++;
          break;
        case "left_without_permission":
          summary.leftWithoutPermission++;
          break;
      }
    }

    summary.presentPercentage =
      summary.total > 0
        ? Math.round(((summary.present + summary.late) / summary.total) * 100)
        : 0;

    return NextResponse.json({
      attendanceRecords,
      absenceNotifications,
      summary,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
