import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireStaffModule } from "@/lib/auth-guard";

export const runtime = "nodejs";

/**
 * DELETE /api/expenses/[id] — remove an expense entry (admin/proprietor only).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaffModule("accounting");
  if (auth instanceof NextResponse) return auth;
  const { schoolId, role } = auth;

  if (role !== "proprietor" && role !== "admin") {
    return NextResponse.json({ error: "Only an admin can delete expenses" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id)
      .eq("school_id", schoolId);

    if (error) return NextResponse.json({ error: "Failed to delete expense" }, { status: 400 });
    return NextResponse.json({ data: { id } });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
