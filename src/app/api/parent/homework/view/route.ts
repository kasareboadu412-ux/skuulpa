import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireParent } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireParent();
  if (auth instanceof NextResponse) return auth;
  const { parentPhone } = auth;

  try {
    const body = await request.json();
    const { homeworkId } = body;

    if (!homeworkId) return NextResponse.json({ error: "homeworkId is required" }, { status: 400 });

    const supabase = getServiceClient();

    const { error: viewError } = await supabase
      .from("homework_views")
      .insert({ homework_id: homeworkId, parent_phone: parentPhone, viewed_at: new Date().toISOString() } as never);

    if (viewError) return NextResponse.json({ error: viewError.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
