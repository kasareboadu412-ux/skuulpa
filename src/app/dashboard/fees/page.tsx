"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Filter,
  CreditCard,
  Smartphone,
  X,
} from "lucide-react";

// ─── Types matching the API ───

interface ClassRow {
  id: string;
  name: string;
}

interface FeeStructure {
  id: string;
  name: string;
  category: "tuition" | "bus" | "feeding" | "other";
  amount: number;
  frequency: string;
  class_id: string | null;
  is_active: boolean;
  class?: ClassRow | null;
}

interface StudentRow {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string | null;
  parent_primary_phone: string | null;
  class?: ClassRow | null;
}

interface FeeAssignmentRow {
  id: string;
  student_id: string;
  amount_after_discount: number;
  student?: StudentRow | null;
  fee_structure?: { id: string; name: string; category: string } | null;
  fee_payments?: { amount_paid: number; status: string }[];
}

interface PaymentRow {
  id: string;
  amount_paid: number;
  payment_method: string | null;
  receipt_number: string | null;
  momo_reference: string | null;
  payment_date: string;
  status: "confirmed" | "pending" | "failed" | "refunded";
  student?: StudentRow | null;
}

interface TermRow {
  id: string;
  name: string;
  is_current: boolean | null;
  academic_year?: { id: string; name: string } | null;
}

// ─── Badges ───

function FeeStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "success" | "warning" | "danger" }> = {
    paid: { label: "Paid", variant: "success" },
    partial: { label: "Partial", variant: "warning" },
    overdue: { label: "Outstanding", variant: "danger" },
  };
  const s = map[status] || { label: status, variant: "warning" as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" }> = {
    confirmed: { label: "Confirmed", variant: "success" },
    pending: { label: "Pending", variant: "warning" },
    failed: { label: "Failed", variant: "danger" },
    refunded: { label: "Refunded", variant: "info" },
  };
  const s = map[status] || { label: status, variant: "info" as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

function CategoryBadge({ category }: { category: string }) {
  const map: Record<string, { label: string; variant: "info" | "success" | "warning" | "secondary" }> = {
    tuition: { label: "Tuition", variant: "info" },
    bus: { label: "Bus", variant: "success" },
    feeding: { label: "Feeding", variant: "warning" },
    other: { label: "Other", variant: "secondary" },
  };
  const s = map[category] || { label: category, variant: "secondary" as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

// ─── Fee Structure Modal ───

function FeeStructureModal({
  open,
  onClose,
  onSaved,
  editFee,
  classes,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editFee: FeeStructure | null;
  classes: ClassRow[];
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<FeeStructure["category"]>("tuition");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("termly");
  const [classId, setClassId] = useState<string>("all");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editFee?.name ?? "");
      setCategory(editFee?.category ?? "tuition");
      setAmount(editFee?.amount?.toString() ?? "");
      setFrequency(editFee?.frequency ?? "termly");
      setClassId(editFee?.class_id ?? "all");
    }
  }, [open, editFee]);

  if (!open) return null;

  const handleSave = async () => {
    if (!name.trim() || !amount) {
      toast.error("Name and amount are required");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        category,
        amount: Number(amount),
        frequency,
        class_id: classId === "all" ? null : classId,
        is_active: true,
      };
      const res = await fetch(
        editFee ? `/api/fees/structures/${editFee.id}` : "/api/fees/structures",
        {
          method: editFee ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save fee structure");
        return;
      }
      toast.success(editFee ? "Fee structure updated" : "Fee structure created");
      onSaved();
      onClose();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{editFee ? "Edit Fee Structure" : "Create Fee Structure"}</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            {editFee ? "Update fee details" : "Add a new fee structure for your school"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fee-name">Fee Name</Label>
            <Input id="fee-name" placeholder="e.g. Tuition Fee" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fee-category">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as FeeStructure["category"])}>
              <SelectTrigger id="fee-category"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tuition">Tuition</SelectItem>
                <SelectItem value="bus">Bus</SelectItem>
                <SelectItem value="feeding">Feeding</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fee-amount">Amount (GH₵)</Label>
            <Input id="fee-amount" type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fee-frequency">Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger id="fee-frequency"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="termly">Termly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="once">One-time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fee-class">Applicable Class</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger id="fee-class"><SelectValue placeholder="All classes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : editFee ? "Update Fee" : "Create Fee"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// ─── Payment Dialog ───

function PaymentDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<StudentRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<StudentRow | null>(null);
  const [assignments, setAssignments] = useState<FeeAssignmentRow[]>([]);
  const [assignmentId, setAssignmentId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("momo_mtn");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setSearch(""); setResults([]); setSelected(null); setAssignments([]);
      setAssignmentId(""); setAmount(""); setMethod("momo_mtn"); setReference("");
    }
  }, [open]);

  // Debounced student search
  useEffect(() => {
    if (!open || selected) return;
    if (!search.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/students?search=${encodeURIComponent(search.trim())}&status=active`);
        const data = await res.json();
        if (res.ok) setResults((data.data ?? []).slice(0, 8));
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search, open, selected]);

  // Load student's open assignments after selection
  useEffect(() => {
    if (!selected) { setAssignments([]); return; }
    (async () => {
      try {
        const res = await fetch(`/api/fees/assignments?student_id=${selected.id}`);
        const data = await res.json();
        if (res.ok) setAssignments(data.data ?? []);
      } catch {
        // ignore
      }
    })();
  }, [selected]);

  if (!open) return null;

  const handleRecord = async () => {
    if (!selected) { toast.error("Select a student first"); return; }
    if (!amount || Number(amount) <= 0) { toast.error("Enter a valid amount"); return; }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        student_id: selected.id,
        amount_paid: Number(amount),
        payment_method: method,
      };
      if (assignmentId) body.fee_assignment_id = assignmentId;
      if (reference) {
        if (method.startsWith("momo")) body.momo_reference = reference;
        else body.transaction_id = reference;
      }

      const res = await fetch("/api/fees/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to record payment");
        return;
      }
      toast.success(`Payment recorded · receipt ${data.data?.receipt_number ?? ""}`);
      onSaved();
      onClose();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const balanceFor = (a: FeeAssignmentRow) => {
    const paid = (a.fee_payments ?? [])
      .filter((p) => p.status === "confirmed")
      .reduce((s, p) => s + Number(p.amount_paid), 0);
    return Math.max(0, Number(a.amount_after_discount) - paid);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Record Payment
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>Record a fee payment from a parent</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selected ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="payment-student">Search Student</Label>
                <Input
                  id="payment-student"
                  placeholder="Name, admission #, or parent phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
              {searching && <p className="text-xs text-gray-500">Searching...</p>}
              {!searching && results.length > 0 && (
                <div className="rounded-lg border divide-y max-h-60 overflow-y-auto">
                  {results.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelected(s)}
                      className="w-full text-left p-2 hover:bg-gray-50"
                    >
                      <p className="text-sm font-medium">{s.first_name} {s.last_name}</p>
                      <p className="text-xs text-gray-500">
                        {s.class?.name ?? "—"} · {s.admission_number ?? "no admission #"}
                      </p>
                    </button>
                  ))}
                </div>
              )}
              {!searching && search.trim() && results.length === 0 && (
                <p className="text-sm text-gray-500">No students found.</p>
              )}
            </>
          ) : (
            <>
              <div className="rounded-lg border bg-gray-50 p-3 flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{selected.first_name} {selected.last_name}</p>
                  <p className="text-xs text-gray-500">
                    {selected.class?.name ?? "—"} · {selected.admission_number ?? "no admission #"}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Change</Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-assignment">Fee (optional)</Label>
                <Select value={assignmentId || "none"} onValueChange={(v) => setAssignmentId(v === "none" ? "" : v)}>
                  <SelectTrigger id="payment-assignment"><SelectValue placeholder="No specific fee" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">General payment</SelectItem>
                    {assignments.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.fee_structure?.name ?? "Fee"} · Balance {formatCurrency(balanceFor(a))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-amount">Amount (GH₵)</Label>
                <Input id="payment-amount" type="number" min="0" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-method">Payment Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger id="payment-method"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="momo_mtn">MoMo MTN</SelectItem>
                    <SelectItem value="momo_vodafone">MoMo Vodafone</SelectItem>
                    <SelectItem value="momo_airteltigo">MoMo AirtelTigo</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-reference">Reference (optional)</Label>
                <Input id="payment-reference" placeholder="MoMo / transaction reference" value={reference} onChange={(e) => setReference(e.target.value)} />
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleRecord} disabled={saving || !selected}>
            <CreditCard className="h-4 w-4 mr-1" />
            {saving ? "Recording..." : "Record Payment"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// ─── Assign Panel ───

function AssignPanel({
  structures,
  classes,
  terms,
  onAssigned,
}: {
  structures: FeeStructure[];
  classes: ClassRow[];
  terms: TermRow[];
  onAssigned: () => void;
}) {
  const [feeId, setFeeId] = useState<string>("");
  const [classId, setClassId] = useState<string>("");
  const [termId, setTermId] = useState<string>("");
  const [applyDiscount, setApplyDiscount] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!termId) {
      const current = terms.find((t) => t.is_current);
      if (current) setTermId(current.id);
    }
  }, [terms, termId]);

  const selectedFee = structures.find((s) => s.id === feeId);
  const selectedClass = classes.find((c) => c.id === classId);
  const eligibleStructures = classId
    ? structures.filter((s) => s.class_id === null || s.class_id === classId)
    : structures;

  const handleSubmit = async () => {
    if (!feeId || !classId || !termId) {
      toast.error("Pick a fee structure, class, and term");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/fees/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bulk: true,
          fee_structure_id: feeId,
          class_id: classId,
          term_id: termId,
          apply_sibling_discount: applyDiscount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to assign fees");
        return;
      }
      toast.success(`Assigned to ${data.count ?? 0} student(s)`);
      onAssigned();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign Fee to a Class</CardTitle>
        <CardDescription>
          Charge a fee structure to every active student in a class for the selected term.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="assign-class">Class</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger id="assign-class"><SelectValue placeholder="Select a class" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="assign-term">Term</Label>
            <Select value={termId} onValueChange={setTermId}>
              <SelectTrigger id="assign-term"><SelectValue placeholder="Select a term" /></SelectTrigger>
              <SelectContent>
                {terms.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}{t.academic_year?.name ? ` · ${t.academic_year.name}` : ""}{t.is_current ? " (current)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="assign-fee">Fee Structure</Label>
          <Select value={feeId} onValueChange={setFeeId}>
            <SelectTrigger id="assign-fee"><SelectValue placeholder="Select a fee structure" /></SelectTrigger>
            <SelectContent>
              {eligibleStructures.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-gray-500">No matching fee structures.</div>
              ) : eligibleStructures.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} · {formatCurrency(Number(s.amount))} · {s.frequency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {classId && (
            <p className="text-xs text-gray-500">
              Showing fees applicable to {selectedClass?.name} or all classes.
            </p>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={applyDiscount}
            onChange={(e) => setApplyDiscount(e.target.checked)}
            className="h-4 w-4"
          />
          Apply sibling discount (10% per sibling, capped at 50%)
        </label>

        {selectedFee && selectedClass && (
          <div className="rounded-lg border bg-gray-50 p-3 text-sm">
            <p>
              About to charge <span className="font-semibold">{formatCurrency(Number(selectedFee.amount))}</span>
              {" "}({selectedFee.frequency}) to every active student in{" "}
              <span className="font-semibold">{selectedClass.name}</span>.
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={handleSubmit} disabled={submitting || !feeId || !classId || !termId}>
          {submitting ? "Assigning..." : "Assign Fee"}
        </Button>
      </CardFooter>
    </Card>
  );
}

// ─── Main page ───

export default function FeesPage() {
  const [activeTab, setActiveTab] = useState<"structures" | "assign" | "assignments" | "ledger">("structures");
  const [loading, setLoading] = useState(true);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [terms, setTerms] = useState<TermRow[]>([]);
  const [assignments, setAssignments] = useState<FeeAssignmentRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);

  const [showFeeModal, setShowFeeModal] = useState(false);
  const [editFee, setEditFee] = useState<FeeStructure | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, cRes, tRes, aRes, pRes] = await Promise.all([
        fetch("/api/fees/structures"),
        fetch("/api/classes"),
        fetch("/api/terms"),
        fetch("/api/fees/assignments"),
        fetch("/api/fees/payments?limit=100"),
      ]);
      const [sData, cData, tData, aData, pData] = await Promise.all([
        sRes.json(), cRes.json(), tRes.json(), aRes.json(), pRes.json(),
      ]);
      if (sRes.ok) setStructures(sData.data ?? []);
      if (cRes.ok) setClasses((cData.data ?? []).map((c: ClassRow) => ({ id: c.id, name: c.name })));
      if (tRes.ok) setTerms(tData.data ?? []);
      if (aRes.ok) setAssignments(aData.data ?? []);
      if (pRes.ok) setPayments(pData.data ?? []);
    } catch {
      toast.error("Failed to load fees data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAll(); }, [loadAll]);

  // Aggregate per-student rows for the assignments tab
  const studentRows = useMemo(() => {
    const map = new Map<string, {
      student_id: string;
      studentName: string;
      className: string;
      admissionNumber: string;
      parentPhone: string;
      totalFee: number;
      paid: number;
      balance: number;
      status: "paid" | "partial" | "overdue";
    }>();
    for (const a of assignments) {
      if (!a.student) continue;
      const id = a.student.id;
      const paidConfirmed = (a.fee_payments ?? [])
        .filter((p) => p.status === "confirmed")
        .reduce((s, p) => s + Number(p.amount_paid), 0);
      const charged = Number(a.amount_after_discount ?? 0);
      const existing = map.get(id);
      if (existing) {
        existing.totalFee += charged;
        existing.paid += paidConfirmed;
      } else {
        map.set(id, {
          student_id: id,
          studentName: `${a.student.first_name} ${a.student.last_name}`,
          className: a.student.class?.name ?? "—",
          admissionNumber: a.student.admission_number ?? "—",
          parentPhone: a.student.parent_primary_phone ?? "—",
          totalFee: charged,
          paid: paidConfirmed,
          balance: 0,
          status: "overdue",
        });
      }
    }
    for (const row of map.values()) {
      row.balance = Math.max(0, row.totalFee - row.paid);
      if (row.balance <= 0) row.status = "paid";
      else if (row.paid > 0) row.status = "partial";
      else row.status = "overdue";
    }
    return Array.from(map.values());
  }, [assignments]);

  const filteredRows = studentRows.filter((r) => {
    const s = searchQuery.toLowerCase();
    const matchesSearch = !s || r.studentName.toLowerCase().includes(s) || r.admissionNumber.toLowerCase().includes(s);
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Deactivate this fee structure?")) return;
    try {
      const res = await fetch(`/api/fees/structures/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Delete failed");
        return;
      }
      toast.success("Fee structure deactivated");
      void loadAll();
    } catch {
      toast.error("Network error");
    }
  };

  const handleConfirmPayment = async (paymentId: string) => {
    try {
      const res = await fetch(`/api/fees/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to confirm");
        return;
      }
      toast.success("Payment confirmed");
      void loadAll();
    } catch {
      toast.error("Network error");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-full bg-gray-100 rounded animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fee Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage fee structures, assign fees, and track payments</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setEditFee(null); setShowFeeModal(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            Add Fee Structure
          </Button>
          <Button variant="outline" onClick={() => setShowPaymentDialog(true)}>
            <CreditCard className="h-4 w-4 mr-1" />
            Record Payment
          </Button>
        </div>
      </div>

      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {[
          { key: "structures", label: "Fee Structures" },
          { key: "assign", label: "Assign" },
          { key: "assignments", label: "Student Fees" },
          { key: "ledger", label: "Payment Ledger" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "structures" && (
        <Card>
          <CardHeader>
            <CardTitle>Fee Structures</CardTitle>
            <CardDescription>Define the fees your school charges</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Category</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Frequency</th>
                    <th className="pb-3 font-medium">Class</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {structures.map((fs) => (
                    <tr key={fs.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-900">{fs.name}</td>
                      <td className="py-3"><CategoryBadge category={fs.category} /></td>
                      <td className="py-3 font-semibold">{formatCurrency(Number(fs.amount))}</td>
                      <td className="py-3 capitalize text-gray-600">{fs.frequency}</td>
                      <td className="py-3 text-gray-600">{fs.class?.name ?? "All classes"}</td>
                      <td className="py-3">
                        <Badge variant={fs.is_active ? "success" : "secondary"}>
                          {fs.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditFee(fs); setShowFeeModal(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(fs.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {structures.length === 0 && (
                <p className="text-center text-gray-500 py-8">No fee structures yet. Click &ldquo;Add Fee Structure&rdquo; to create one.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "assign" && (
        <AssignPanel
          structures={structures.filter((s) => s.is_active)}
          classes={classes}
          terms={terms}
          onAssigned={() => { void loadAll(); }}
        />
      )}

      {activeTab === "assignments" && (
        <Card>
          <CardHeader>
            <CardTitle>Student Fee Assignments</CardTitle>
            <CardDescription>View fee status for all students</CardDescription>
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search by name or admission #..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-4 w-4 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="overdue">Outstanding</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 font-medium">Admission #</th>
                    <th className="pb-3 font-medium">Student Name</th>
                    <th className="pb-3 font-medium">Class</th>
                    <th className="pb-3 font-medium">Total Fee</th>
                    <th className="pb-3 font-medium">Paid</th>
                    <th className="pb-3 font-medium">Balance</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Parent Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((sf) => (
                    <tr key={sf.student_id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 text-gray-600">{sf.admissionNumber}</td>
                      <td className="py-3 font-medium text-gray-900">{sf.studentName}</td>
                      <td className="py-3 text-gray-600">{sf.className}</td>
                      <td className="py-3 font-semibold">{formatCurrency(sf.totalFee)}</td>
                      <td className="py-3 text-green-600 font-semibold">{formatCurrency(sf.paid)}</td>
                      <td className="py-3 font-semibold">{formatCurrency(sf.balance)}</td>
                      <td className="py-3"><FeeStatusBadge status={sf.status} /></td>
                      <td className="py-3 text-gray-600">{sf.parentPhone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredRows.length === 0 && (
                <p className="text-center text-gray-500 py-8">No students match your filters.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "ledger" && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Ledger</CardTitle>
            <CardDescription>All recorded fee payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Student</th>
                    <th className="pb-3 font-medium">Receipt</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Method</th>
                    <th className="pb-3 font-medium">Reference</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 text-gray-600 text-xs">{new Date(p.payment_date).toLocaleString()}</td>
                      <td className="py-3 font-medium text-gray-900">
                        {p.student ? `${p.student.first_name} ${p.student.last_name}` : "—"}
                      </td>
                      <td className="py-3 text-gray-600 text-xs">{p.receipt_number ?? "—"}</td>
                      <td className="py-3 font-semibold">{formatCurrency(Number(p.amount_paid))}</td>
                      <td className="py-3 text-gray-600 capitalize">{(p.payment_method ?? "—").replace(/_/g, " ")}</td>
                      <td className="py-3 text-gray-500 text-xs">{p.momo_reference ?? "—"}</td>
                      <td className="py-3"><PaymentStatusBadge status={p.status} /></td>
                      <td className="py-3">
                        {p.status === "pending" && (
                          <Button size="sm" variant="outline" onClick={() => handleConfirmPayment(p.id)}>
                            Confirm
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {payments.length === 0 && (
                <p className="text-center text-gray-500 py-8">No payments recorded yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <FeeStructureModal
        open={showFeeModal}
        onClose={() => { setShowFeeModal(false); setEditFee(null); }}
        onSaved={() => void loadAll()}
        editFee={editFee}
        classes={classes}
      />
      <PaymentDialog
        open={showPaymentDialog}
        onClose={() => setShowPaymentDialog(false)}
        onSaved={() => void loadAll()}
      />
    </div>
  );
}
