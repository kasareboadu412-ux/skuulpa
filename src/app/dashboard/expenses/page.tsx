"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { Wallet, TrendingUp, TrendingDown, Plus } from "lucide-react";
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

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  date: string;
}

interface CategorySummary {
  category: string;
  count: number;
  total: number;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<{ total_expenses: number; total_entries: number; by_category: CategorySummary[] }>({ total_expenses: 0, total_entries: 0, by_category: [] });
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    category: "supplies",
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/expenses?limit=200");
      const data = await res.json();
      if (res.ok) {
        setExpenses(data.data ?? []);
        setSummary(data.summary ?? { total_expenses: 0, total_entries: 0, by_category: [] });
      } else {
        toast.error(data.error || "Failed to load expenses");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

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
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to record expense");
        return;
      }
      toast.success("Expense recorded");
      setShowAdd(false);
      setForm({ category: "supplies", amount: "", description: "", date: new Date().toISOString().split("T")[0] });
      void load();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const highestCategory = summary.by_category.length > 0
    ? [...summary.by_category].sort((a, b) => b.total - a.total)[0]
    : null;

  if (loading) {
    return (
      <div className="p-8 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expenses</h1>
          <p className="text-gray-500 mt-1">Track school operating expenses</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Record Expense</Button>
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
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdd(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleAdd} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2"><Wallet className="w-4 h-4" />Total Expenses</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{formatCurrency(summary.total_expenses)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-red-500" />Highest Category</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold capitalize">{highestCategory?.category ?? "—"}</p>
            {highestCategory && <p className="text-sm text-gray-500 mt-1">{formatCurrency(highestCategory.total)}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2"><TrendingDown className="w-4 h-4 text-green-500" />Entries</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{summary.total_entries}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-lg">Expense History</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-gray-500">No expenses recorded yet</TableCell></TableRow>
              ) : (
                expenses.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{formatDate(e.date)}</TableCell>
                    <TableCell><span className="capitalize">{e.category}</span></TableCell>
                    <TableCell>{e.description ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(Number(e.amount))}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
