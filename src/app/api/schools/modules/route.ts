import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth-guard";
import { getSchoolModules } from "@/lib/modules";

export const runtime = "nodejs";

/**
 * GET /api/schools/modules
 * Returns the gated modules the current staff member's school may access,
 * based on its subscription plan.
 */
export async function GET() {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;

  try {
    const modules = await getSchoolModules(auth.schoolId);
    return NextResponse.json({ modules });
  } catch {
    return NextResponse.json({ modules: [] }, { status: 200 });
  }
}
