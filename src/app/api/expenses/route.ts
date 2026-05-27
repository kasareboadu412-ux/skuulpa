import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireStaff } from "@/lib/auth-guard";

export const runtime = "nodejs";

const VALID_CATEGORIES = ["salary", "supplies", "utilities", "maintenance", "transport", "other"] as const;

export async function GET(request: NextRequest) {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { schoolId } = auth;

  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const date_from = searchParams.get("date_from");
    const date_to = searchParams.get("date_to");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "50");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("expenses")
      .select("*", { count: "exact" })
      .eq("school_id", schoolId)
      .order("date", { ascending: false });

    if (category) query = query.eq("category", category);
    if (date_from) query = query.gte("date", date_from);
    if (date_to) query = query.lte("date", date_to);

    const { data, error, count } = await query.range(offset, offset + limit - 1);
    if (error) return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 400 });

    const categoryMap = new Map<string, { category: string; count: number; total: number }>();
    for (const expense of data ?? []) {
      const cat = expense.category ?? "other";
      if (!categoryMap.has(cat)) categoryMap.set(cat, { category: cat, count: 0, total: 0 });
      const entry = categoryMap.get(cat)!;
      entry.count++;
      entry.total += Number(expense.amount);
    }

    const totalExpenses = data?.reduce((sum: number, e: { amount: number }) => sum + Number(e.amount), 0) ?? 0;

    return NextResponse.json({
      data,
      summary: { total_expenses: totalExpenses, total_entries: count ?? 0, by_category: Array.from(categoryMap.values()) },
      pagination: { page, limit, total: count ?? 0 },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { schoolId } = auth;

  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { category, amount, description, date, receipt_url } = body;

    if (!amount) return NextResponse.json({ error: "amount is required" }, { status: 400 });

    const resolvedCategory = category ?? "other";
    if (!VALID_CATEGORIES.includes(resolvedCategory as typeof VALID_CATEGORIES[number])) {
      return NextResponse.json(
        { error: `category must be one of: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("expenses")
      .insert([{
        school_id: schoolId,
        category: resolvedCategory,
        amount,
        description: description ?? null,
        date: date ?? new Date().toISOString().split("T")[0],
        receipt_url: receipt_url ?? null,
      }])
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: "Failed to create expense" }, { status: 400 });
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
