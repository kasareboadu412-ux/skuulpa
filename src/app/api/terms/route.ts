import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const academic_year_id = searchParams.get("academic_year_id");
    const school_id = searchParams.get("school_id");

    let query = supabase
      .from("terms")
      .select("*, academic_year:academic_years(*, school:schools(*))")
      .order("start_date", { ascending: true });

    if (academic_year_id) {
      query = query.eq("academic_year_id", academic_year_id);
    }
    if (school_id) {
      query = query.eq("academic_year.school_id", school_id);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
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

    const { academic_year_id, name, start_date, end_date, is_current } = body;

    if (!academic_year_id || !name || !start_date || !end_date) {
      return NextResponse.json(
        { error: "academic_year_id, name, start_date, and end_date are required" },
        { status: 400 }
      );
    }

    // If setting this term as current, unset any existing current terms
    if (is_current) {
      const { data: academicYear } = await supabase
        .from("academic_years")
        .select("school_id")
        .eq("id", academic_year_id)
        .single();

      if (academicYear) {
        // Unset current for all terms in the same school's academic years
        await supabase
          .from("terms")
          .update({ is_current: false })
          .eq("academic_year_id", academic_year_id);
      }
    }

    const { data, error } = await supabase
      .from("terms")
      .insert([
        {
          academic_year_id,
          name,
          start_date,
          end_date,
          is_current: is_current ?? false,
        },
      ])
      .select("*, academic_year:academic_years(*, school:schools(*))")
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
