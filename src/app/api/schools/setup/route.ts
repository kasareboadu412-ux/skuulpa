import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, short_code, address, phone, email, settings } = body;

    if (!name) {
      return NextResponse.json(
        { error: "School name is required" },
        { status: 400 }
      );
    }

    // 1. Create the school
    const { data: school, error: schoolError } = await supabase
      .from("schools")
      .insert([
        {
          name,
          short_code: short_code ?? null,
          address: address ?? null,
          phone: phone ?? null,
          email: email ?? null,
          settings: settings ?? {},
        },
      ])
      .select("*")
      .single();

    if (schoolError) {
      return NextResponse.json({ error: schoolError.message }, { status: 400 });
    }

    // 2. Create academic year
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    const academicYearName = `${currentYear}/${nextYear}`;

    const { data: academicYear, error: ayError } = await supabase
      .from("academic_years")
      .insert([
        {
          school_id: school.id,
          name: academicYearName,
          start_date: `${currentYear}-09-01`,
          end_date: `${nextYear}-08-31`,
          is_current: true,
        },
      ])
      .select("*")
      .single();

    if (ayError) {
      return NextResponse.json({ error: ayError.message }, { status: 400 });
    }

    // 3. Create three terms
    const termDefinitions = [
      {
        name: "1st Term",
        start_date: `${currentYear}-09-01`,
        end_date: `${currentYear}-12-20`,
      },
      {
        name: "2nd Term",
        start_date: `${nextYear}-01-08`,
        end_date: `${nextYear}-04-11`,
      },
      {
        name: "3rd Term",
        start_date: `${nextYear}-04-28`,
        end_date: `${nextYear}-08-15`,
      },
    ];

    const { data: terms } = await supabase
      .from("terms")
      .insert(
        termDefinitions.map((term, index) => ({
          academic_year_id: academicYear.id,
          name: term.name,
          start_date: term.start_date,
          end_date: term.end_date,
          is_current: index === 0,
        }))
      )
      .select("*");

    // 4. Create default classes for a Ghanaian basic school
    const defaultClasses = [
      { name: "Nursery 1", sort_order: 1 },
      { name: "Nursery 2", sort_order: 2 },
      { name: "Kindergarten 1", sort_order: 3 },
      { name: "Kindergarten 2", sort_order: 4 },
      { name: "Class 1", sort_order: 5 },
      { name: "Class 2", sort_order: 6 },
      { name: "Class 3", sort_order: 7 },
      { name: "Class 4", sort_order: 8 },
      { name: "Class 5", sort_order: 9 },
      { name: "Class 6", sort_order: 10 },
      { name: "JHS 1", sort_order: 11 },
      { name: "JHS 2", sort_order: 12 },
      { name: "JHS 3", sort_order: 13 },
    ];

    const { data: classes } = await supabase
      .from("classes")
      .insert(
        defaultClasses.map((cls) => ({
          school_id: school.id,
          name: cls.name,
          academic_year_id: academicYear.id,
          sort_order: cls.sort_order,
        }))
      )
      .select("*");

    return NextResponse.json(
      {
        data: {
          school,
          academic_year: academicYear,
          terms: terms ?? [],
          classes: classes ?? [],
        },
        message: "School setup complete",
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
