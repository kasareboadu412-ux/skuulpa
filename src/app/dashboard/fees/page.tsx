"use client";

import { useState, useEffect } from "react";
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
  Check,
  AlertCircle,
  Clock,
} from "lucide-react";

// ─── Types ───

interface FeeStructure {
  id: string;
  name: string;
  category: "tuition" | "bus" | "feeding" | "other";
  amount: number;
  frequency: string;
  class: string;
  isActive: boolean;
}

interface StudentFee {
  id: string;
  admissionNumber: string;
  studentName: string;
  className: string;
  totalFee: number;
  paid: number;
  balance: number;
  status: "paid" | "partial" | "overdue";
  parentPhone: string;
}

interface PaymentRecord {
  id: string;
  studentName: string;
  admissionNumber: string;
  amount: number;
  method: string;
  reference: string;
  date: string;
  status: "confirmed" | "pending" | "failed" | "refunded";
}

// ─── Sample data ───

const sampleFeeStructures: FeeStructure[] = [
  { id: "fs1", name: "Tuition Fee", category: "tuition", amount: 2500, frequency: "termly", class: "All Classes", isActive: true },
  { id: "fs2", name: "Bus Fee (Madina)", category: "bus", amount: 450, frequency: "termly", class: "All Classes", isActive: true },
  { id: "fs3", name: "Bus Fee (Adenta)", category: "bus", amount: 550, frequency: "termly", class: "All Classes", isActive: true },
  { id: "fs4", name: "Feeding Fee", category: "feeding", amount: 600, frequency: "termly", class: "All Classes", isActive: true },
  { id: "fs5", name: "ICT Lab Levy", category: "other", amount: 200, frequency: "termly", class: "JHS 1-3", isActive: true },
  { id: "fs6", name: "Sports Fee", category: "other", amount: 150, frequency: "termly", class: "Class 1-6", isActive: false },
];

const sampleStudentFees: StudentFee[] = [
  { id: "sf1", admissionNumber: "SKL/26/0001", studentName: "Adwoa Mensah", className: "JHS 2", totalFee: 3800, paid: 3800, balance: 0, status: "paid", parentPhone: "0244123456" },
  { id: "sf2", admissionNumber: "SKL/26/0002", studentName: "Yaw Boateng", className: "Class 4", totalFee: 3450, paid: 2500, balance: 950, status: "partial", parentPhone: "0544987654" },
  { id: "sf3", admissionNumber: "SKL/26/0003", studentName: "Akua Serwaa", className: "Class 1", totalFee: 3100, paid: 3100, balance: 0, status: "paid", parentPhone: "0204112233" },
  { id: "sf4", admissionNumber: "SKL/26/0004", studentName: "Kofi Adom", className: "JHS 1", totalFee: 3850, paid: 1500, balance: 2350, status: "overdue", parentPhone: "0266123456" },
  { id: "sf5", admissionNumber: "SKL/26/0005", studentName: "Esi Nyarko", className: "Nursery 2", totalFee: 2900, paid: 2250, balance: 650, status: "partial", parentPhone: "0244789012" },
  { id: "sf6", admissionNumber: "SKL/26/0006", studentName: "Nana Amoako", className: "Class 3", totalFee: 3450, paid: 3450, balance: 0, status: "paid", parentPhone: "0544345678" },
  { id: "sf7", admissionNumber: "SKL/26/0007", studentName: "Afua Donkor", className: "JHS 3", totalFee: 4200, paid: 1200, balance: 3000, status: "overdue", parentPhone: "0204987612" },
  { id: "sf8", admissionNumber: "SKL/26/0008", studentName: "Kwame Asante", className: "Class 2", totalFee: 3100, paid: 3100, balance: 0, status: "paid", parentPhone: "0266543210" },
];

const samplePayments: PaymentRecord[] = [
  { id: "p1", studentName: "Adwoa Mensah", admissionNumber: "SKL/26/0001", amount: 1800, method: "MoMo MTN", reference: "MTN-9832", date: "2026-05-26 09:15", status: "confirmed" },
  { id: "p2", studentName: "Yaw Boateng", admissionNumber: "SKL/26/0002", amount: 950, method: "MoMo VC", reference: "VC-7711", date: "2026-05-26 08:45", status: "confirmed" },
  { id: "p3", studentName: "Akua Serwaa", admissionNumber: "SKL/26/0003", amount: 1200, method: "Cash", reference: "REC-0012", date: "2026-05-25 15:30", status: "confirmed" },
  { id: "p4", studentName: "Kofi Adom", admissionNumber: "SKL/26/0004", amount: 800, method: "MoMo AT", reference: "AT-4456", date: "2026-05-25 14:20", status: "pending" },
  { id: "p5", studentName: "Esi Nyarko", admissionNumber: "SKL/26/0005", amount: 650, method: "MoMo MTN", reference: "MTN-1123", date: "2026-05-25 11:10", status: "confirmed" },
  { id: "p6", studentName: "Nana Amoako", admissionNumber: "SKL/26/0006", amount: 750, method: "Bank", reference: "BKT-8890", date: "2026-05-24 16:00", status: "confirmed" },
  { id: "p7", studentName: "Afua Donkor", admissionNumber: "SKL/26/0007", amount: 2100, method: "MoMo MTN", reference: "MTN-5567", date: "2026-05-24 13:45", status: "failed" },
];

// ─── Helpers ───

function FeeStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "success" | "warning" | "danger" }> = {
    paid: { label: "Paid", variant: "success" },
    partial: { label: "Partial", variant: "warning" },
    overdue: { label: "Overdue", variant: "danger" },
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
  editFee,
}: {
  open: boolean;
  onClose: () => void;
  editFee: FeeStructure | null;
}) {
  const [name, setName] = useState(editFee?.name || "");
  const [category, setCategory] = useState(editFee?.category || "tuition");
  const [amount, setAmount] = useState(editFee?.amount.toString() || "");
  const [frequency, setFrequency] = useState(editFee?.frequency || "termly");
  const [className, setClassName] = useState(editFee?.class || "");

  useEffect(() => {
    if (editFee) {
      setName(editFee.name);
      setCategory(editFee.category);
      setAmount(editFee.amount.toString());
      setFrequency(editFee.frequency);
      setClassName(editFee.class);
    }
  }, [editFee]);

  if (!open) return null;

  const handleSave = () => {
    if (!name || !amount) {
      toast.error("Name and amount are required");
      return;
    }
    toast.success(editFee ? "Fee structure updated" : "Fee structure created");
    onClose();
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
            <Input
              id="fee-name"
              placeholder="e.g. Tuition Fee"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fee-category">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as any)}>
              <SelectTrigger id="fee-category">
                <SelectValue />
              </SelectTrigger>
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
            <Input
              id="fee-amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fee-frequency">Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger id="fee-frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="termly">Termly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fee-class">Applicable Class</Label>
            <Input
              id="fee-class"
              placeholder="e.g. All Classes, JHS 1-3"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {editFee ? "Update Fee" : "Create Fee"}
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
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("momomtn");

  if (!open) return null;

  const handleRecord = () => {
    if (!searchTerm || !amount) {
      toast.error("Student and amount are required");
      return;
    }
    toast.success("Payment recorded successfully");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Record Mobile Money Payment
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Record a fee payment from a parent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="payment-student">Search Student</Label>
            <Input
              id="payment-student"
              placeholder="Name or admission number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {searchTerm && (
            <div className="rounded-lg border p-2 bg-gray-50">
              <p className="text-sm font-medium">Kofi Adom</p>
              <p className="text-xs text-gray-500">JHS 1 · SKL/26/0004</p>
              <p className="text-xs text-amber-600 mt-1">
                Balance: {formatCurrency(2350)}
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="payment-amount">Amount (GH₵)</Label>
            <Input
              id="payment-amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-method">Payment Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger id="payment-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="momomtn">MoMo MTN</SelectItem>
                <SelectItem value="momovc">MoMo Vodafone Cash</SelectItem>
                <SelectItem value="momo_at">MoMo AirtelTigo</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="bank">Bank Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleRecord}>
            <CreditCard className="h-4 w-4 mr-1" />
            Record Payment
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// ─── Main Page ───

export default function FeesPage() {
  const [activeTab, setActiveTab] = useState<"structures" | "assignments" | "ledger">("structures");
  const [loading, setLoading] = useState(true);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [editFee, setEditFee] = useState<FeeStructure | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Filter student fees
  const filteredFees = sampleStudentFees.filter((sf) => {
    const matchesSearch =
      sf.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sf.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || sf.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fee Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage fee structures, assign fees, and track payments
          </p>
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

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {[
          { key: "structures", label: "Fee Structures" },
          { key: "assignments", label: "Student Fees" },
          { key: "ledger", label: "Payment Ledger" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Fee Structures Tab */}
      {activeTab === "structures" && (
        <Card>
          <CardHeader>
            <CardTitle>Fee Structures</CardTitle>
            <CardDescription>
              Define the fees your school charges
            </CardDescription>
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
                  {sampleFeeStructures.map((fs) => (
                    <tr key={fs.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-900">{fs.name}</td>
                      <td className="py-3">
                        <CategoryBadge category={fs.category} />
                      </td>
                      <td className="py-3 font-semibold">{formatCurrency(fs.amount)}</td>
                      <td className="py-3 capitalize text-gray-600">{fs.frequency}</td>
                      <td className="py-3 text-gray-600">{fs.class}</td>
                      <td className="py-3">
                        <Badge variant={fs.isActive ? "success" : "secondary"}>
                          {fs.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setEditFee(fs); setShowFeeModal(true); }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500"
                            onClick={() => toast.error("Delete not implemented in demo")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Student Fees Tab */}
      {activeTab === "assignments" && (
        <Card>
          <CardHeader>
            <CardTitle>Student Fee Assignments</CardTitle>
            <CardDescription>
              View fee status for all students
            </CardDescription>
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or admission #..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
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
                  {filteredFees.map((sf) => (
                    <tr key={sf.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 text-gray-600">{sf.admissionNumber}</td>
                      <td className="py-3 font-medium text-gray-900">{sf.studentName}</td>
                      <td className="py-3 text-gray-600">{sf.className}</td>
                      <td className="py-3 font-semibold">{formatCurrency(sf.totalFee)}</td>
                      <td className="py-3 text-green-600 font-semibold">{formatCurrency(sf.paid)}</td>
                      <td className="py-3 font-semibold">{formatCurrency(sf.balance)}</td>
                      <td className="py-3">
                        <FeeStatusBadge status={sf.status} />
                      </td>
                      <td className="py-3 text-gray-600">{sf.parentPhone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredFees.length === 0 && (
                <p className="text-center text-gray-500 py-8">No students match your filters.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Ledger Tab */}
      {activeTab === "ledger" && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Ledger</CardTitle>
            <CardDescription>
              All recorded fee payments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Student</th>
                    <th className="pb-3 font-medium">Admission #</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Method</th>
                    <th className="pb-3 font-medium">Reference</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {samplePayments.map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 text-gray-600 text-xs">{p.date}</td>
                      <td className="py-3 font-medium text-gray-900">{p.studentName}</td>
                      <td className="py-3 text-gray-600">{p.admissionNumber}</td>
                      <td className="py-3 font-semibold">{formatCurrency(p.amount)}</td>
                      <td className="py-3 text-gray-600">{p.method}</td>
                      <td className="py-3 text-gray-500 text-xs">{p.reference}</td>
                      <td className="py-3">
                        <PaymentStatusBadge status={p.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <FeeStructureModal
        open={showFeeModal}
        onClose={() => { setShowFeeModal(false); setEditFee(null); }}
        editFee={editFee}
      />
      <PaymentDialog
        open={showPaymentDialog}
        onClose={() => setShowPaymentDialog(false)}
      />
    </div>
  );
}
