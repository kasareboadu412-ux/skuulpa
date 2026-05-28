import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

/**
 * GET /api/schools/lookup?short_code=ABC
 *
 * Public endpoint: returns minimal school info (id, name, short_code) plus active classes,
 * used by the public admission form so a parent can apply without an account.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const short_code = searchParams.get("short_code");

  if (!short_code) {
    return NextResponse.json({ error: "short_code is required" }, { status: 400 });
  }

  try {
    const db = getServiceClient();
    const { data, error } = await db
      .from("schools")
      .select("id, name, short_code, classes(id, name)")
      .eq("short_code", short_code)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
