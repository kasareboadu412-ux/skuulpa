import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const school_id = searchParams.get("school_id");
    const category = searchParams.get("category");
    const date_from = searchParams.get("date_from");
    const date_to = searchParams.get("date_to");

    let query = supabase
      .from("expenses")
      .select("*")
      .order("date", { ascending: false });

    if (school_id) {
      query = query.eq("school_id", school_id);
    }
    if (category) {
      query = query.eq("category", category);
    }
    if (date_from) {
      query = query.gte("date", date_from);
    }
    if (date_to) {
      query = query.lte("date", date_to);
    }

    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "50");
    const offset = (page - 1) * limit;

    const { data, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Calculate category breakdown
    const categoryMap = new Map<string, { category: string; count: number; total: number }>();
    for (const expense of data ?? []) {
      const cat = expense.category ?? "other";
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, { category: cat, count: 0, total: 0 });
      }
      const entry = categoryMap.get(cat)!;
      entry.count++;
      entry.total += Number(expense.amount);
    }

    const totalExpenses = data?.reduce((sum: number, e: any) => sum + Number(e.amount), 0) ?? 0;

    return NextResponse.json({
      data,
      summary: {
        total_expenses: totalExpenses,
        total_entries: count ?? 0,
        by_category: Array.from(categoryMap.values()),
      },
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

    const { school_id, category, amount, description, date, receipt_url } = body;

    if (!school_id || !amount) {
      return NextResponse.json(
        { error: "school_id and amount are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("expenses")
      .insert([
        {
          school_id,
          category: category ?? "other",
          amount,
          description: description ?? null,
          date: date ?? new Date().toISOString().split("T")[0],
          receipt_url: receipt_url ?? null,
        },
      ])
      .select("*")
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
