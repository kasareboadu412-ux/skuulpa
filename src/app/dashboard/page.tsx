"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Users,
  ClipboardCheck,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface DashboardStats {
  students: { total: number; active: number };
  classes: number;
  teachers: number;
  fees: { total_collected: number; pending_amount: number; total_charged: number; collection_rate: number };
  attendance: { today: { total: number; present: number; absent: number; rate: number } };
  feeding: { today_fed: number };
  recent_payments: Array<{
    id: string;
    amount_paid: number;
    payment_method: string | null;
    status: "confirmed" | "pending" | "failed" | "refunded";
    payment_date: string;
    student: { first_name: string; last_name: string; class: { name: string } | null } | null;
  }>;
  current_term: { name: string } | null;
}

interface ByClass {
  class_name: string;
  total_charged: number;
  total_collected: number;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" }> = {
    confirmed: { label: "Confirmed", variant: "success" },
    pending: { label: "Pending", variant: "warning" },
    failed: { label: "Failed", variant: "danger" },
    refunded: { label: "Refunded", variant: "info" },
  };
  const s = map[status] || { label: status, variant: "info" as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

function StatSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-7 w-32 bg-gray-200 rounded animate-pulse mb-1" />
        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
      </CardContent>
    </Card>
  );
}

export default function ProprietorDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [byClass, setByClass] = useState<ByClass[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [sRes, rRes] = await Promise.all([
          fetch("/api/dashboard/stats"),
          fetch("/api/reports/fees"),
        ]);
        const [sData, rData] = await Promise.all([sRes.json(), rRes.json()]);
        if (sRes.ok) setStats(sData.data);
        if (rRes.ok) setByClass(rData.data?.by_class ?? []);
      } catch {
        toast.error("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (<StatSkeleton key={i} />))}
        </div>
        <div className="h-80 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Card><CardContent className="py-12 text-center text-gray-500">Unable to load dashboard data. Try refreshing.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Proprietor Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          {stats.current_term ? `${stats.current_term.name} · ` : ""}Here&apos;s your school at a glance.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Fees Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.fees.total_collected)}</div>
            <p className="text-xs text-gray-500 mt-1">
              Pending: {formatCurrency(stats.fees.pending_amount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Collection Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.fees.collection_rate}%</div>
            <p className="text-xs text-gray-500 mt-1">
              of {formatCurrency(stats.fees.total_charged)} charged
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Active Students</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.students.active}</div>
            <p className="text-xs text-gray-500 mt-1">
              Across {stats.classes} class{stats.classes === 1 ? "" : "es"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Attendance Today</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.attendance.today.rate}%</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.attendance.today.present}/{stats.attendance.today.total} present
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Fee Collection by Class</CardTitle>
            <CardDescription>Charged vs collected per class this term</CardDescription>
          </CardHeader>
          <CardContent>
            {byClass.length === 0 ? (
              <p className="text-sm text-gray-500 py-12 text-center">No fee assignments yet.</p>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byClass} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="class_name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `GH₵${v / 1000}k`} />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), ""]} />
                    <Bar dataKey="total_charged" fill="#93c5fd" name="Charged" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="total_collected" fill="#2563eb" name="Collected" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>Latest fee payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recent_payments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No payments yet.</p>
              ) : stats.recent_payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {p.student ? `${p.student.first_name} ${p.student.last_name}` : "—"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {p.student?.class?.name ?? "—"} · {(p.payment_method ?? "").replace(/_/g, " ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(Number(p.amount_paid))}</span>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
