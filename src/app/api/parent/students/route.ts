import { NextResponse } from "next/server";
import { getCurrentUser, getServiceClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getServiceClient();

    // Retrieve parent's phone from user metadata or look up via parent_user_id
    const parentPhone = user.phone || user.user_metadata?.phone;

    // If we have a direct parent_user_id mapping, use that
    const { data: studentsByAuth, error: authError } = await supabase
      .from("students")
      .select(`
        id,
        first_name,
        last_name,
        admission_number,
        dob,
        status,
        profile_photo_url,
        medical_info,
        class_id,
        class:class_id (
          id,
          name,
          school:school_id (
            id,
            name,
            logo_url,
            phone,
            email,
            address
          )
        )
      `)
      .eq("parent_user_id", user.id)
      .eq("status", "active");

    if (!authError && studentsByAuth && studentsByAuth.length > 0) {
      return NextResponse.json({ students: studentsByAuth });
    }

    // Fallback: look up by phone number
    if (!parentPhone) {
      return NextResponse.json({ error: "No phone number associated with account" }, { status: 400 });
    }

    const { data: studentsByPhone, error: phoneError } = await supabase
      .from("students")
      .select(`
        id,
        first_name,
        last_name,
        admission_number,
        dob,
        status,
        profile_photo_url,
        medical_info,
        class_id,
        class:class_id (
          id,
          name,
          school:school_id (
            id,
            name,
            logo_url,
            phone,
            email,
            address
          )
        )
      `)
      .or(`parent_primary_phone.eq.${parentPhone},parent_secondary_phone.eq.${parentPhone}`)
      .eq("status", "active");

    if (phoneError) {
      return NextResponse.json({ error: phoneError.message }, { status: 500 });
    }

    return NextResponse.json({ students: studentsByPhone || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
