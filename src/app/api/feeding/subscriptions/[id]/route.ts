import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireStaffModule } from "@/lib/auth-guard";
import { removeUnpaidServiceFees } from "@/lib/service-fees";

export const runtime = "nodejs";

/**
 * DELETE /api/feeding/subscriptions/[id]
 * Cancel a student's feeding subscription and drop the unpaid term charge.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaffModule("feeding");
  if (auth instanceof NextResponse) return auth;
  const { schoolId, role } = auth;

  if (role !== "proprietor" && role !== "admin") {
    return NextResponse.json({ error: "Only an admin can remove subscriptions" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    // Verify the subscription belongs to a student in this school.
    const { data: sub } = await supabase
      .from("feeding_subscriptions")
      .select("id, student_id, student:students!inner(school_id)")
      .eq("id", id)
      .eq("student.school_id", schoolId)
      .maybeSingle();

    if (!sub) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });

    const { error } = await supabase.from("feeding_subscriptions").delete().eq("id", id);
    if (error) return NextResponse.json({ error: "Failed to remove subscription" }, { status: 400 });

    const removedFees = await removeUnpaidServiceFees(
      schoolId,
      (sub as { student_id: string }).student_id,
      "feeding"
    );

    return NextResponse.json({ data: { id }, fees_removed: removedFees });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
