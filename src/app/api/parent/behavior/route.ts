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

    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Get behavior logs for the student
    const { data: rawLogs, error: bError } = await supabase
      .from("behavior_logs")
      .select(`
        id,
        type,
        description,
        date,
        shared_with_parent,
        shared_at,
        created_at,
        teacher:teacher_id (
          id,
          first_name,
          last_name
        )
      `)
      .eq("student_id", studentId)
      .order("date", { ascending: false })
      .limit(50);

    const behaviorLogs = (rawLogs || []) as unknown as {
      id: string;
      type: string | null;
      description: string;
      date: string;
      shared_with_parent: boolean;
      shared_at: string | null;
      teacher: { first_name: string; last_name: string } | null;
    }[];

    if (bError) {
      return NextResponse.json({ error: bError.message }, { status: 500 });
    }

    // Calculate behavior summary
    const summary = {
      stars: 0,
      warnings: 0,
      incidents: 0,
    };

    for (const log of behaviorLogs) {
      switch (log.type) {
        case "star":
          summary.stars++;
          break;
        case "warning":
          summary.warnings++;
          break;
        case "incident":
          summary.incidents++;
          break;
      }
    }

    return NextResponse.json({
      behaviorLogs: behaviorLogs || [],
      summary,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
