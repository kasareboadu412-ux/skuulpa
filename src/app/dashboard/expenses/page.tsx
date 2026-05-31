"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  Wallet,
  Plus,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  Receipt,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

interface AccountingData {
  income: { total: number; count: number; by_category: CategoryTotal[] };
  expenses: { total: number; count: number; by_category: CategoryTotal[] };
  net: number;
  transactions: Txn[];
}

const EMPTY: AccountingData = {
  income: { total: 0, count: 0, by_category: [] },
  expenses: { total: 0, count: 0, by_category: [] },
  net: 0,
  transactions: [],
};

function startOfYear(): string {
  return `${new Date().getFullYear()}-01-01`;
}
function today(): string {
  return new Date().toISOString().split("T")[0];
}

function CategoryBreakdown({ title, rows, total, tone }: { title: string; rows: CategoryTotal[]; total: number; tone: "income" | "expense" }) {
  const barColor = tone === "income" ? "bg-green-500" : "bg-red-500";
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500">No data for this period.</p>
        ) : rows.map((r) => {
          const pct = total > 0 ? Math.round((r.total / total) * 100) : 0;
          return (
            <div key={r.category} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="capitalize">{r.category} <span className="text-gray-400">· {r.count}</span></span>
                <span className="font-medium">{formatCurrency(r.total)}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-100">
                <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default function AccountingPage() {
  const [data, setData] = useState<AccountingData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "transactions" | "expenses">("overview");
  const [dateFrom, setDateFrom] = useState(startOfYear());
  const [dateTo, setDateTo] = useState(today());
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({
    category: "supplies",
    amount: "",
    description: "",
    date: today(),
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      const res = await fetch(`/api/accounting?${params.toString()}`);
      const json = await res.json();
      if (res.ok) setData(json.data ?? EMPTY);
      else toast.error(json.error || "Failed to load accounts");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { void load(); }, [load]);

  const handleAdd = async () => {
    const amt = parseFloat(form.amount);
    if (!form.category || !amt || amt <= 0) {
      toast.error("Category and a positive amount are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: form.category,
          amount: amt,
          description: form.description.trim() || null,
          date: form.date,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Failed to record expense"); return; }
      toast.success("Expense recorded");
      setShowAdd(false);
      setForm({ category: "supplies", amount: "", description: "", date: today() });
      void load();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Failed to delete expense"); return; }
      toast.success("Expense deleted");
      void load();
    } catch {
      toast.error("Network error");
    } finally {
      setDeleting(null);
    }
  };

  const expenseTxns = data.transactions.filter((t) => t.type === "expense");

  if (loading) {
    return (
      <div className="p-8 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded" />)}</div>
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Accounting</h1>
          <p className="text-gray-500 mt-1">Income, expenses, and profit &amp; loss</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input type="date" className="h-9 w-[150px]" value={dateFrom} max={dateTo} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input type="date" className="h-9 w-[150px]" value={dateTo} min={dateFrom} max={today()} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button className="h-9"><Plus className="w-4 h-4 mr-1" />Record Expense</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Record Expense</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="salary">Salary</SelectItem>
                      <SelectItem value="supplies">Supplies</SelectItem>
                      <SelectItem value="utilities">Utilities</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="transport">Transport</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount (GH₵)</Label>
                  <Input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={form.date} max={today()} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAdd(false)} disabled={saving}>Cancel</Button>
                <Button onClick={handleAdd} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2"><ArrowUpRight className="w-4 h-4 text-green-600" />Total Income</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{formatCurrency(data.income.total)}</p>
            <p className="text-xs text-gray-500 mt-1">{data.income.count} payment(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2"><ArrowDownRight className="w-4 h-4 text-red-600" />Total Expenses</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{formatCurrency(data.expenses.total)}</p>
            <p className="text-xs text-gray-500 mt-1">{data.expenses.count} entr(ies)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2"><Scale className="w-4 h-4" />Net {data.net >= 0 ? "Profit" : "Loss"}</CardTitle></CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${data.net >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(Math.abs(data.net))}</p>
            <p className="text-xs text-gray-500 mt-1">{formatDate(dateFrom)} – {formatDate(dateTo)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {[
          { key: "overview", label: "Overview" },
          { key: "transactions", label: "Transactions" },
          { key: "expenses", label: "Expenses" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-4 md:grid-cols-2">
          <CategoryBreakdown title="Income by category" rows={data.income.by_category} total={data.income.total} tone="income" />
          <CategoryBreakdown title="Expenses by category" rows={data.expenses.by_category} total={data.expenses.total} tone="expense" />
        </div>
      )}

      {tab === "transactions" && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">Transaction Ledger</CardTitle><CardDescription>Income and expenses for the selected period</CardDescription></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.transactions.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">No transactions in this period</TableCell></TableRow>
                ) : data.transactions.map((t) => (
                  <TableRow key={`${t.type}-${t.id}`}>
                    <TableCell>{formatDate(t.date)}</TableCell>
                    <TableCell>
                      {t.type === "income" ? (
                        <span className="inline-flex items-center gap-1 text-green-600 text-sm"><ArrowUpRight className="h-3.5 w-3.5" />Income</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 text-sm"><ArrowDownRight className="h-3.5 w-3.5" />Expense</span>
                      )}
                    </TableCell>
                    <TableCell className="capitalize">{t.category}</TableCell>
                    <TableCell>
                      {t.description}
                      {t.reference && <span className="text-xs text-gray-400 ml-1">({t.reference})</span>}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${t.type === "income" ? "text-green-600" : "text-red-600"}`}>
                      {t.type === "income" ? "+" : "−"}{formatCurrency(t.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === "expenses" && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><Receipt className="h-5 w-5" />Expenses</CardTitle><CardDescription>Recorded operating expenses for the selected period</CardDescription></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenseTxns.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">No expenses recorded yet</TableCell></TableRow>
                ) : expenseTxns.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{formatDate(e.date)}</TableCell>
                    <TableCell className="capitalize">{e.category}</TableCell>
                    <TableCell>{e.description}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(e.amount)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" disabled={deleting === e.id} onClick={() => handleDeleteExpense(e.id)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
