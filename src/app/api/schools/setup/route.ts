import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireStaff } from "@/lib/auth-guard";

export const runtime = "nodejs";

// POST: called by the registration flow immediately after account creation
// to seed default academic year, terms, and classes.
export async function POST(request: NextRequest) {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { schoolId } = auth;

  try {
    const body = await request.json();
    const { name, short_code, address, phone, email, settings } = body;

    if (!name) return NextResponse.json({ error: "School name is required" }, { status: 400 });

    const db = getServiceClient();

    // Update the school record (already created during registration)
    const { data: school, error: schoolError } = await db
      .from("schools")
      .update({ name, short_code: short_code ?? null, address: address ?? null, phone: phone ?? null, email: email ?? null, settings: settings ?? {} })
      .eq("id", schoolId)
      .select("*")
      .single();

    if (schoolError) return NextResponse.json({ error: "Failed to update school" }, { status: 400 });

    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;

    const { data: academicYear, error: ayError } = await db
      .from("academic_years")
      .insert([{ school_id: schoolId, name: `${currentYear}/${nextYear}`, start_date: `${currentYear}-09-01`, end_date: `${nextYear}-08-31`, is_current: true }])
      .select("*")
      .single();

    if (ayError) return NextResponse.json({ error: "Failed to create academic year" }, { status: 400 });

    const { data: terms } = await db
      .from("terms")
      .insert([
        { academic_year_id: academicYear.id, name: "1st Term", start_date: `${currentYear}-09-01`, end_date: `${currentYear}-12-20`, is_current: true },
        { academic_year_id: academicYear.id, name: "2nd Term", start_date: `${nextYear}-01-08`, end_date: `${nextYear}-04-11`, is_current: false },
        { academic_year_id: academicYear.id, name: "3rd Term", start_date: `${nextYear}-04-28`, end_date: `${nextYear}-08-15`, is_current: false },
      ])
      .select("*");

    const defaultClasses = [
      { name: "Nursery 1", sort_order: 1 }, { name: "Nursery 2", sort_order: 2 },
      { name: "Kindergarten 1", sort_order: 3 }, { name: "Kindergarten 2", sort_order: 4 },
      { name: "Class 1", sort_order: 5 }, { name: "Class 2", sort_order: 6 },
      { name: "Class 3", sort_order: 7 }, { name: "Class 4", sort_order: 8 },
      { name: "Class 5", sort_order: 9 }, { name: "Class 6", sort_order: 10 },
      { name: "JHS 1", sort_order: 11 }, { name: "JHS 2", sort_order: 12 }, { name: "JHS 3", sort_order: 13 },
    ];

    const { data: classes } = await db
      .from("classes")
      .insert(defaultClasses.map((cls) => ({ school_id: schoolId, name: cls.name, academic_year_id: academicYear.id, sort_order: cls.sort_order })))
      .select("*");

    return NextResponse.json(
      { data: { school, academic_year: academicYear, terms: terms ?? [], classes: classes ?? [] }, message: "School setup complete" },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
