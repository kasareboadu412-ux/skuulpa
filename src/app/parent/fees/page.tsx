"use client";

import { useEffect, useState } from "react";
import {
  Wallet,
  Download,
  QrCode,
  ArrowLeft,
  ChevronDown,
  CheckCircle2,
  Clock,
  XCircle,
  Banknote,
  Smartphone,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface SchoolMini {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

interface ClassMini {
  name: string;
  school?: SchoolMini | SchoolMini[] | null;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  class: ClassMini | ClassMini[] | null;
}

interface FeeAssignment {
  id: string;
  amount_after_discount: number | null;
  is_opted_in: boolean;
  fee_structure: {
    name: string;
    category: string;
    amount: number;
    due_date: string | null;
  } | null;
  term: { name: string } | null;
}

interface Receipt {
  id: string;
  receipt_number: string;
  qr_code_data: string | null;
  pdf_url: string | null;
}

interface FeePayment {
  id: string;
  amount_paid: number;
  payment_method: string | null;
  transaction_id: string | null;
  receipt_number: string | null;
  payment_date: string;
  status: string;
  receipts: Receipt[];
  fee_assignment: {
    fee_structure: { name: string; category: string } | null;
  } | null;
}

interface CategoryTotal {
  total: number;
  paid: number;
}

export default function FeesPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [feeAssignments, setFeeAssignments] = useState<FeeAssignment[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [summary, setSummary] = useState<{
    totalDue: number;
    totalPaid: number;
    balance: number;
    categoryTotals: Record<string, CategoryTotal>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQr, setShowQr] = useState<string | null>(null);
  const [showPayInfo, setShowPayInfo] = useState(false);

  function getSchool(student: Student | undefined): SchoolMini | null {
    if (!student?.class) return null;
    const cls = Array.isArray(student.class) ? student.class[0] : student.class;
    if (!cls?.school) return null;
    const sch = Array.isArray(cls.school) ? cls.school[0] : cls.school;
    return sch ?? null;
  }

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/parent/students");
        const data = await res.json();
        if (data.students?.length > 0) {
          setStudents(data.students);
          setSelectedStudentId(data.students[0].id);
        }
      } catch {
        toast.error("Failed to load students");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!selectedStudentId) return;
    async function fetchFees() {
      setLoading(true);
      try {
        const res = await fetch(`/api/parent/fees?studentId=${selectedStudentId}`);
        if (!res.ok) throw new Error("Failed to load fee data");
        const data = await res.json();
        setFeeAssignments(data.feeAssignments || []);
        setPayments(data.payments || []);
        setSummary(data.summary || null);
      } catch {
        toast.error("Failed to load fee information");
      } finally {
        setLoading(false);
      }
    }
    fetchFees();
  }, [selectedStudentId]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const getPaymentMethodIcon = (method: string | null) => {
    switch (method) {
      case "momovc":
      case "momomtn":
      case "momo_at":
        return <Smartphone className="h-4 w-4" />;
      case "cash":
        return <Banknote className="h-4 w-4" />;
      default:
        return <Wallet className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge variant="success">Confirmed</Badge>;
      case "pending":
        return (
          <Badge variant="warning">
            <Clock className="h-3 w-3 mr-1" /> Pending
          </Badge>
        );
      case "failed":
        return <Badge variant="danger">Failed</Badge>;
      case "refunded":
        return <Badge variant="secondary">Refunded</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Wallet className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-lg font-bold">Fee Statement</h1>
          {selectedStudent && (
            <p className="text-xs text-muted-foreground">
              {selectedStudent.first_name} {selectedStudent.last_name}
            </p>
          )}
        </div>
        {students.length > 1 && (
          <Select
            value={selectedStudentId}
            onValueChange={setSelectedStudentId}
          >
            <SelectTrigger className="w-28 h-8 text-xs ml-auto">
              <SelectValue placeholder="Child" />
            </SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.first_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Summary Card */}
      {summary && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Due</span>
              <span className="font-semibold">{formatCurrency(summary.totalDue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Paid</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(summary.totalPaid)}
              </span>
            </div>
            <div className="border-t pt-3 flex justify-between items-center">
              <span className="font-medium">Balance</span>
              <span
                className={`font-bold text-lg ${
                  summary.balance <= 0
                    ? "text-green-600"
                    : summary.balance / summary.totalDue < 0.5
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {formatCurrency(summary.balance)}
              </span>
            </div>

            {summary.balance > 0 && (
              <Button
                className="w-full mt-2 gap-2"
                size="lg"
                onClick={() => setShowPayInfo(true)}
              >
                <Smartphone className="h-5 w-5" />
                Pay Now with MoMo
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fee Breakdown by Category */}
      {summary?.categoryTotals && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Fee Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(summary.categoryTotals).map(([category, ct]) => {
              if (ct.total === 0) return null;
              const balance = ct.total - ct.paid;
              return (
                <div
                  key={category}
                  className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium capitalize">{category} Fee</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(ct.paid)} paid of {formatCurrency(ct.total)}
                    </p>
                  </div>
                  <span
                    className={`font-semibold text-sm ${
                      balance <= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {balance <= 0 ? "Paid" : formatCurrency(balance)}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No payments recorded yet
            </p>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="border rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getPaymentMethodIcon(payment.payment_method)}
                      <span className="font-semibold">
                        {formatCurrency(payment.amount_paid)}
                      </span>
                    </div>
                    {getStatusBadge(payment.status)}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatDate(payment.payment_date)}</span>
                    {payment.receipt_number && (
                      <span>Receipt: {payment.receipt_number}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    {payment.fee_assignment?.fee_structure && (
                      <span className="text-xs text-muted-foreground">
                        {payment.fee_assignment.fee_structure.name}
                      </span>
                    )}
                    <div className="flex gap-2">
                      {/* Download Receipt */}
                      {payment.receipts?.[0]?.pdf_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() =>
                            window.open(payment.receipts![0].pdf_url!, "_blank")
                          }
                        >
                          <Download className="h-3 w-3" />
                          Receipt
                        </Button>
                      )}
                      {/* QR Code */}
                      {payment.receipts?.[0]?.qr_code_data && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() =>
                            setShowQr(
                              showQr === payment.receipts![0].id
                                ? null
                                : payment.receipts![0].id
                            )
                          }
                        >
                          <QrCode className="h-3 w-3" />
                          QR
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* QR Code Display */}
                  {showQr === payment.receipts?.[0]?.id && (
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <img
                        src={payment.receipts[0].qr_code_data!}
                        alt="Payment QR Code"
                        className="mx-auto h-32 w-32"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Receipt: {payment.receipts[0].receipt_number}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showPayInfo && (
        <PayInfoModal
          balance={summary?.balance ?? 0}
          school={getSchool(students.find((s) => s.id === selectedStudentId))}
          onClose={() => setShowPayInfo(false)}
        />
      )}
    </div>
  );
}

function PayInfoModal({
  balance,
  school,
  onClose,
}: {
  balance: number;
  school: SchoolMini | null;
  onClose: () => void;
}) {
  const phone = school?.phone ?? null;
  const waPhone = phone ? phone.replace(/[^0-9]/g, "") : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            How to Pay
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
            <p className="text-xs text-blue-900">Outstanding balance</p>
            <p className="text-2xl font-bold text-blue-900">{formatCurrency(balance)}</p>
          </div>

          <div>
            <p className="font-medium mb-1">1. MTN / Vodafone / AirtelTigo MoMo</p>
            <p className="text-gray-600">
              Send the amount above to{" "}
              {phone ? (
                <a href={`tel:${phone}`} className="font-semibold text-blue-600">{phone}</a>
              ) : (
                <span className="text-gray-400">(school MoMo number not set)</span>
              )}
              . Include your child&apos;s name as the reference.
            </p>
          </div>

          <div>
            <p className="font-medium mb-1">2. Or pay in person</p>
            <p className="text-gray-600">
              {school?.address
                ? <>Bring cash or a transfer slip to <span className="font-semibold">{school.address}</span>.</>
                : "Visit the school office during working hours."}
            </p>
          </div>

          <div>
            <p className="font-medium mb-1">3. Confirm with the office</p>
            <p className="text-gray-600">
              After paying, message the school so your child&apos;s account can be marked. Receipts will appear in this app once confirmed.
            </p>
          </div>

          {waPhone && (
            <a
              href={`https://wa.me/${waPhone}?text=${encodeURIComponent(`Hi, I just paid ${formatCurrency(balance)} for my child.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button variant="outline" className="w-full">Message school on WhatsApp</Button>
            </a>
          )}
        </CardContent>
        <div className="flex justify-end gap-2 p-4 pt-0">
          <Button onClick={onClose}>Close</Button>
        </div>
      </Card>
    </div>
  );
}
