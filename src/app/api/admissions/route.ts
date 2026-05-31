import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireStaff } from "@/lib/auth-guard";
import { getServiceClient } from "@/lib/supabase-server";
import { ensureParentAccount } from "@/lib/parent-account";
import { applyCurrentTermClassFees } from "@/lib/apply-fees";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { schoolId } = auth;

  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const applied_class_id = searchParams.get("applied_class_id");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "50");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("admission_applications")
      .select("*, applied_class:classes(*)", { count: "exact" })
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (applied_class_id) query = query.eq("applied_class_id", applied_class_id);

    const { data, error, count } = await query.range(offset, offset + limit - 1);
    if (error) return NextResponse.json({ error: "Failed to fetch applications" }, { status: 400 });
    return NextResponse.json({ data, pagination: { page, limit, total: count ?? 0 } });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST is intentionally public — parents submit applications without logging in.
// school_id comes from the request body; we verify the school exists before inserting.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      school_id,
      child_first_name,
      child_last_name,
      dob,
      birth_cert_url,
      passport_url,
      parent_first_name,
      parent_last_name,
      parent_phone,
      parent_secondary_phone,
      parent_email,
      applied_class_id,
      notes,
    } = body;

    if (!school_id || !child_first_name || !child_last_name || !parent_first_name || !parent_last_name || !parent_phone) {
      return NextResponse.json(
        { error: "Required fields: school_id, child_first_name, child_last_name, parent_first_name, parent_last_name, parent_phone" },
        { status: 400 }
      );
    }

    const db = getServiceClient();

    // Verify the school exists
    const { data: school } = await db.from("schools").select("id").eq("id", school_id).maybeSingle();
    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

    const { data, error } = await db
      .from("admission_applications")
      .insert([{
        school_id,
        child_first_name,
        child_last_name,
        dob: dob ?? null,
        birth_cert_url: birth_cert_url ?? null,
        passport_url: passport_url ?? null,
        parent_first_name,
        parent_last_name,
        parent_phone,
        parent_secondary_phone: parent_secondary_phone ?? null,
        parent_email: parent_email ?? null,
        applied_class_id: applied_class_id ?? null,
        status: "pending",
        application_fee_paid: false,
        notes: notes ?? null,
      }])
      .select("*, applied_class:classes(*)")
      .single();

    if (error) return NextResponse.json({ error: "Failed to submit application" }, { status: 400 });
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { schoolId } = auth;

  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { id, status, notes } = body;

    if (!id || !status) return NextResponse.json({ error: "id and status are required" }, { status: 400 });

    const validStatuses = ["pending", "accepted", "rejected", "waitlisted"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `status must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
    }

    const { data: application } = await supabase
      .from("admission_applications")
      .select("*")
      .eq("id", id)
      .eq("school_id", schoolId)
      .single();

    if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    const { data, error } = await supabase
      .from("admission_applications")
      .update({ status, notes: notes ?? application.notes, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("school_id", schoolId)
      .select("*, applied_class:classes(*)")
      .single();

    if (error) return NextResponse.json({ error: "Failed to update application" }, { status: 400 });

    if (status === "accepted" && !application.application_fee_paid) {
      const { data: existingStudent } = await supabase
        .from("students")
        .select("id")
        .eq("parent_primary_phone", application.parent_phone)
        .eq("first_name", application.child_first_name)
        .eq("last_name", application.child_last_name)
        .single();

      if (!existingStudent) {
        const year = new Date().getFullYear();
        const { count } = await supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId);

        const admissionNumber = `SKL-${year}-${((count ?? 0) + 1).toString().padStart(4, "0")}`;

        // Provision a parent login account so the new family can access the portal.
        const parentName = `${application.parent_first_name} ${application.parent_last_name}`;
        const parentResult = await ensureParentAccount(application.parent_phone, parentName);

        const { data: newStudent } = await supabase.from("students").insert([{
          school_id: schoolId,
          first_name: application.child_first_name,
          last_name: application.child_last_name,
          dob: application.dob,
          admission_number: admissionNumber,
          class_id: application.applied_class_id,
          parent_primary_phone: application.parent_phone,
          parent_secondary_phone: application.parent_secondary_phone,
          parent_email: application.parent_email,
          parent_user_id: parentResult.userId,
          enrollment_date: new Date().toISOString().split("T")[0],
          status: "active",
        }]).select("id").single();

        // Auto-apply the current term's class fees to the new student.
        if (newStudent?.id) {
          await applyCurrentTermClassFees(schoolId, newStudent.id, application.applied_class_id);
        }

        if (parentResult.created && parentResult.pin) {
          return NextResponse.json({
            data,
            parent_login: { phone: application.parent_phone, pin: parentResult.pin },
            student_id: newStudent?.id ?? null,
          });
        }
      }
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
