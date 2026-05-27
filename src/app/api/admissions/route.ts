import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const school_id = searchParams.get("school_id");
    const status = searchParams.get("status");
    const applied_class_id = searchParams.get("applied_class_id");

    let query = supabase
      .from("admission_applications")
      .select("*, applied_class:classes(*)")
      .order("created_at", { ascending: false });

    if (school_id) {
      query = query.eq("school_id", school_id);
    }
    if (status) {
      query = query.eq("status", status);
    }
    if (applied_class_id) {
      query = query.eq("applied_class_id", applied_class_id);
    }

    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "50");
    const offset = (page - 1) * limit;

    const { data, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      data,
      pagination: { page, limit, total: count ?? 0 },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
        { error: "Required fields missing: school_id, child_first_name, child_last_name, parent_first_name, parent_last_name, parent_phone" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("admission_applications")
      .insert([
        {
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
        },
      ])
      .select("*, applied_class:classes(*)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, notes } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: "id and status are required" },
        { status: 400 }
      );
    }

    const validStatuses = ["pending", "accepted", "rejected", "waitlisted"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    // Get the application before updating
    const { data: application } = await supabase
      .from("admission_applications")
      .select("*")
      .eq("id", id)
      .single();

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Update application status
    const { data, error } = await supabase
      .from("admission_applications")
      .update({
        status,
        notes: notes ?? application.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*, applied_class:classes(*)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // If accepted, create a student record
    if (status === "accepted" && !application.application_fee_paid) {
      const { data: existingStudent } = await supabase
        .from("students")
        .select("id")
        .eq("parent_primary_phone", application.parent_phone)
        .eq("first_name", application.child_first_name)
        .eq("last_name", application.child_last_name)
        .single();

      if (!existingStudent) {
        // Generate admission number
        const year = new Date().getFullYear();
        const { count } = await supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("school_id", application.school_id);

        const admissionNumber = `SKL-${year}-${((count ?? 0) + 1).toString().padStart(4, "0")}`;

        await supabase.from("students").insert([
          {
            school_id: application.school_id,
            first_name: application.child_first_name,
            last_name: application.child_last_name,
            dob: application.dob,
            admission_number: admissionNumber,
            class_id: application.applied_class_id,
            parent_primary_phone: application.parent_phone,
            parent_secondary_phone: application.parent_secondary_phone,
            parent_email: application.parent_email,
            enrollment_date: new Date().toISOString().split("T")[0],
            status: "active",
          },
        ]);
      }
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
