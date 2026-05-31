import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireStaff } from "@/lib/auth-guard";

export const runtime = "nodejs";

interface CategoryTotal {
  category: string;
  count: number;
  total: number;
}

interface Txn {
  id: string;
  type: "income" | "expense";
  date: string;
  category: string;
  description: string;
  amount: number;
  reference: string | null;
}

/**
 * GET /api/accounting?date_from=&date_to=
 *
 * School financial summary: income (from confirmed fee payments), expenses,
 * net profit/loss, category breakdowns and a merged transaction ledger.
 */
export async function GET(request: NextRequest) {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { schoolId } = auth;

  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");

    // ── Income: confirmed / partial fee payments for this school ──
    let incomeQuery = supabase
      .from("fee_payments")
      .select(
        "id, amount_paid, payment_method, payment_date, status, receipt_number, student:students!inner(school_id, first_name, last_name), fee_assignment:fee_assignments(fee_structure:fee_structures(category))"
      )
      .eq("student.school_id", schoolId)
      .in("status", ["confirmed", "partial"])
      .order("payment_date", { ascending: false });

    if (dateFrom) incomeQuery = incomeQuery.gte("payment_date", dateFrom);
    if (dateTo) incomeQuery = incomeQuery.lte("payment_date", `${dateTo}T23:59:59`);

    // ── Expenses for this school ──
    let expenseQuery = supabase
      .from("expenses")
      .select("id, category, amount, description, date")
      .eq("school_id", schoolId)
      .order("date", { ascending: false });

    if (dateFrom) expenseQuery = expenseQuery.gte("date", dateFrom);
    if (dateTo) expenseQuery = expenseQuery.lte("date", dateTo);

    const [{ data: payments }, { data: expenses }] = await Promise.all([incomeQuery, expenseQuery]);

    // ── Income aggregation ──
    const incomeByCat = new Map<string, CategoryTotal>();
    const incomeTxns: Txn[] = [];
    let incomeTotal = 0;

    for (const p of (payments ?? []) as Array<Record<string, unknown>>) {
      const amount = Number(p.amount_paid ?? 0);
      incomeTotal += amount;

      const fa = p.fee_assignment as { fee_structure?: { category?: string } | { category?: string }[] } | null;
      const fsRaw = fa?.fee_structure;
      const fs = Array.isArray(fsRaw) ? fsRaw[0] : fsRaw;
      const category = fs?.category ?? "general";

      if (!incomeByCat.has(category)) incomeByCat.set(category, { category, count: 0, total: 0 });
      const entry = incomeByCat.get(category)!;
      entry.count++;
      entry.total += amount;

      const studentRaw = p.student as { first_name?: string; last_name?: string } | { first_name?: string; last_name?: string }[] | null;
      const student = Array.isArray(studentRaw) ? studentRaw[0] : studentRaw;
      incomeTxns.push({
        id: String(p.id),
        type: "income",
        date: String(p.payment_date ?? ""),
        category,
        description: student ? `${student.first_name} ${student.last_name}` : "Fee payment",
        amount,
        reference: (p.receipt_number as string) ?? null,
      });
    }

    // ── Expense aggregation ──
    const expenseByCat = new Map<string, CategoryTotal>();
    const expenseTxns: Txn[] = [];
    let expenseTotal = 0;

    for (const e of (expenses ?? []) as Array<Record<string, unknown>>) {
      const amount = Number(e.amount ?? 0);
      expenseTotal += amount;
      const category = (e.category as string) ?? "other";

      if (!expenseByCat.has(category)) expenseByCat.set(category, { category, count: 0, total: 0 });
      const entry = expenseByCat.get(category)!;
      entry.count++;
      entry.total += amount;

      expenseTxns.push({
        id: String(e.id),
        type: "expense",
        date: String(e.date ?? ""),
        category,
        description: (e.description as string) ?? category,
        amount,
        reference: null,
      });
    }

    const transactions = [...incomeTxns, ...expenseTxns]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 200);

    return NextResponse.json({
      data: {
        income: {
          total: Math.round(incomeTotal * 100) / 100,
          count: incomeTxns.length,
          by_category: Array.from(incomeByCat.values()).sort((a, b) => b.total - a.total),
        },
        expenses: {
          total: Math.round(expenseTotal * 100) / 100,
          count: expenseTxns.length,
          by_category: Array.from(expenseByCat.values()).sort((a, b) => b.total - a.total),
        },
        net: Math.round((incomeTotal - expenseTotal) * 100) / 100,
        transactions,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
