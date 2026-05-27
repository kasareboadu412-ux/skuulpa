import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireParent, verifyParentOwnsStudent } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireParent();
  if (auth instanceof NextResponse) return auth;
  const { userId, parentPhone } = auth;

  try {
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get("studentId");
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");

    if (!studentId) return NextResponse.json({ error: "studentId is required" }, { status: 400 });

    if (!await verifyParentOwnsStudent(studentId, userId, parentPhone)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = getServiceClient();

    let attendanceQuery = supabase
      .from("attendance_records")
      .select("id, date, status, recorded_at, synced")
      .eq("student_id", studentId)
      .order("date", { ascending: false });

    if (fromDate) attendanceQuery = attendanceQuery.gte("date", fromDate);
    if (toDate) attendanceQuery = attendanceQuery.lte("date", toDate);

    const { data: attendanceRecords, error: attError } = await attendanceQuery;
    if (attError) return NextResponse.json({ error: attError.message }, { status: 500 });

    const { data: absenceNotifications, error: absError } = await supabase
      .from("absence_notifications")
      .select("id, date, parent1_notified_at, parent2_notified_at, notification_channel, notification_status, error_message, created_at")
      .eq("student_id", studentId)
      .order("date", { ascending: false });

    if (absError) return NextResponse.json({ error: absError.message }, { status: 500 });

    const summary = { total: 0, present: 0, absent: 0, late: 0, permissionWithdrawn: 0, leftWithoutPermission: 0, presentPercentage: 0 };
    for (const r of attendanceRecords ?? []) {
      summary.total++;
      switch ((r as { status: string | null }).status) {
        case "present": summary.present++; break;
        case "absent": summary.absent++; break;
        case "late": summary.late++; break;
        case "permission_withdrawn": summary.permissionWithdrawn++; break;
        case "left_without_permission": summary.leftWithoutPermission++; break;
      }
    }
    summary.presentPercentage = summary.total > 0 ? Math.round(((summary.present + summary.late) / summary.total) * 100) : 0;

    return NextResponse.json({ attendanceRecords: attendanceRecords ?? [], absenceNotifications: absenceNotifications ?? [], summary });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
