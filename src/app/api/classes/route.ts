import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const school_id = searchParams.get("school_id");
    const academic_year_id = searchParams.get("academic_year_id");

    let query = supabase
      .from("classes")
      .select("*, school:schools(*), academic_year:academic_years(*), teacher:teachers(*), students(count)")
      .order("sort_order", { ascending: true });

    if (school_id) {
      query = query.eq("school_id", school_id);
    }
    if (academic_year_id) {
      query = query.eq("academic_year_id", academic_year_id);
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
    const { data, error } = await supabase
      .from("classes")
      .insert([body])
      .select("*, school:schools(*), academic_year:academic_years(*)")
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
