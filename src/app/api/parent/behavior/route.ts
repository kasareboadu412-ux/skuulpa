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

    if (!studentId) return NextResponse.json({ error: "studentId is required" }, { status: 400 });

    if (!await verifyParentOwnsStudent(studentId, userId, parentPhone)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = getServiceClient();

    const { data: rawLogs, error: bError } = await supabase
      .from("behavior_logs")
      .select("id, type, description, date, shared_with_parent, shared_at, created_at, teacher:teacher_id(id, first_name, last_name)")
      .eq("student_id", studentId)
      .eq("shared_with_parent", true)
      .order("date", { ascending: false })
      .limit(50);

    if (bError) return NextResponse.json({ error: bError.message }, { status: 500 });

    const summary = { stars: 0, warnings: 0, incidents: 0 };
    for (const log of rawLogs ?? []) {
      switch ((log as { type: string | null }).type) {
        case "star": summary.stars++; break;
        case "warning": summary.warnings++; break;
        case "incident": summary.incidents++; break;
      }
    }

    return NextResponse.json({ behaviorLogs: rawLogs ?? [], summary });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
