import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getServiceClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { homeworkId } = body;

    if (!homeworkId) {
      return NextResponse.json({ error: "homeworkId is required" }, { status: 400 });
    }

    const parentPhone = user.phone || user.user_metadata?.phone;
    if (!parentPhone) {
      return NextResponse.json({ error: "Phone number not found" }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Record the view
    const { error: viewError } = await supabase
      .from("homework_views")
      .insert({
        homework_id: homeworkId,
        parent_phone: parentPhone,
        viewed_at: new Date().toISOString(),
      } as never);

    if (viewError) {
      return NextResponse.json({ error: viewError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
