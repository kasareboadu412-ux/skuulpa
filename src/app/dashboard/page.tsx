"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
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
  Bell,
  Send,
  Plus,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

// ─── Sample data (will be replaced with real Supabase queries) ───

const feeTrendData = [
  { month: "Sep", amount: 28400 },
  { month: "Oct", amount: 32200 },
  { month: "Nov", amount: 29800 },
  { month: "Dec", amount: 35100 },
  { month: "Jan", amount: 41800 },
  { month: "Feb", amount: 44500 },
];

const feeByClassData = [
  { className: "Nursery 1", collected: 5200, expected: 5800 },
  { className: "Nursery 2", collected: 6100, expected: 6400 },
  { className: "Class 1", collected: 8400, expected: 8400 },
  { className: "Class 2", collected: 7200, expected: 7800 },
  { className: "Class 3", collected: 5800, expected: 6200 },
  { className: "Class 4", collected: 9100, expected: 9600 },
  { className: "JHS 1", collected: 11300, expected: 12000 },
  { className: "JHS 2", collected: 10200, expected: 10800 },
  { className: "JHS 3", collected: 12800, expected: 13500 },
];

const recentPayments = [
  {
    id: "1",
    student: "Adwoa Mensah",
    class: "JHS 2",
    amount: 1800,
    method: "MoMo MTN",
    status: "confirmed",
    date: "2026-05-26T09:15:00",
  },
  {
    id: "2",
    student: "Yaw Boateng",
    class: "Class 4",
    amount: 950,
    method: "MoMo VC",
    status: "confirmed",
    date: "2026-05-26T08:45:00",
  },
  {
    id: "3",
    student: "Akua Serwaa",
    class: "Class 1",
    amount: 1200,
    method: "Cash",
    status: "confirmed",
    date: "2026-05-25T15:30:00",
  },
  {
    id: "4",
    student: "Kofi Adom",
    class: "JHS 1",
    amount: 800,
    method: "MoMo AT",
    status: "pending",
    date: "2026-05-25T14:20:00",
  },
  {
    id: "5",
    student: "Esi Nyarko",
    class: "Nursery 2",
    amount: 650,
    method: "MoMo MTN",
    status: "confirmed",
    date: "2026-05-25T11:10:00",
  },
  {
    id: "6",
    student: "Nana Amoako",
    class: "Class 3",
    amount: 750,
    method: "Bank",
    status: "confirmed",
    date: "2026-05-24T16:00:00",
  },
  {
    id: "7",
    student: "Afua Donkor",
    class: "JHS 3",
    amount: 2100,
    method: "MoMo MTN",
    status: "failed",
    date: "2026-05-24T13:45:00",
  },
  {
    id: "8",
    student: "Kwame Asante",
    class: "Class 2",
    amount: 880,
    method: "Cash",
    status: "confirmed",
    date: "2026-05-24T10:30:00",
  },
  {
    id: "9",
    student: "Mansa Osei",
    class: "JHS 2",
    amount: 500,
    method: "MoMo VC",
    status: "confirmed",
    date: "2026-05-23T15:00:00",
  },
  {
    id: "10",
    student: "Kojo Frimpong",
    class: "Class 4",
    amount: 1100,
    method: "MoMo MTN",
    status: "confirmed",
    date: "2026-05-23T09:20:00",
  },
];

const atRiskStudents = [
  {
    id: "s1",
    name: "Kwame Asante",
    class: "Class 2",
    issue: "Below 50% in Math & Science",
    trend: "declining",
    teacherNote: "Missing homework frequently",
  },
  {
    id: "s2",
    name: "Akosua Amponsah",
    class: "JHS 1",
    issue: "Attendance dropped to 65%",
    trend: "declining",
    teacherNote: "Reports feeling unwell often",
  },
  {
    id: "s3",
    name: "Nana Yeboah",
    class: "Class 4",
    issue: "Fee overdue — 3 weeks",
    trend: "warning",
    teacherNote: "Payment plan requested but not followed",
  },
  {
    id: "s4",
    name: "Esi Nyarko",
    class: "Nursery 2",
    issue: "Behavioral concerns — 2 incidents",
    trend: "stable",
    teacherNote: "Responding well to counseling",
  },
];

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

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "declining")
    return <ArrowDownRight className="h-4 w-4 text-red-500" />;
  if (trend === "warning")
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  return <ArrowUpRight className="h-4 w-4 text-green-500" />;
}

// ─── Skeleton loader ───

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

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatSkeleton key={i} />
          ))}
        </div>
        <div className="h-80 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  const totalCollected = 44500;
  const collectionRate = 87.3;
  const activeStudents = 342;
  const attendanceRate = 94.1;

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Proprietor Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Welcome back, Captain. Here&apos;s your school at a glance.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Fees Collected
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCollected)}</div>
            <p className="text-xs text-gray-500 mt-1">This term</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Collection Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{collectionRate}%</div>
            <p className="text-xs text-green-600 mt-1">▲ 2.4% vs last term</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Active Students
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeStudents}</div>
            <p className="text-xs text-gray-500 mt-1">Across 9 classes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Attendance Rate
            </CardTitle>
            <ClipboardCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceRate}%</div>
            <p className="text-xs text-gray-500 mt-1">Today: 312/342 present</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Fee collection trend */}
        <Card>
          <CardHeader>
            <CardTitle>Fee Collection Trend</CardTitle>
            <CardDescription>Monthly fee collection for current academic year</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={feeTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `GH₵${v / 1000}k`} />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), "Amount"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#2563eb" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Fee by class */}
        <Card>
          <CardHeader>
            <CardTitle>Fee Collection by Class</CardTitle>
            <CardDescription>Collected vs expected fees per class</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={feeByClassData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="className"
                    tick={{ fontSize: 10 }}
                    angle={-30}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `GH₵${v / 1000}k`} />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), ""]}
                  />
                  <Bar dataKey="expected" fill="#93c5fd" name="Expected" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="collected" fill="#2563eb" name="Collected" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent payments + Quick actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent payments feed */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>Latest 10 fee payments recorded</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {payment.student}
                    </p>
                    <p className="text-xs text-gray-500">
                      {payment.class} · {payment.method}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(payment.amount)}
                    </span>
                    <StatusBadge status={payment.status} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick actions + At-risk */}
        <div className="space-y-6">
          {/* Quick actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                onClick={() => toast.success("Send reminder modal would open")}
              >
                <Send className="h-4 w-4" />
                Send Reminder
              </Button>
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                onClick={() => toast.success("Record payment modal would open")}
              >
                <Plus className="h-4 w-4" />
                Record Payment
              </Button>
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                onClick={() => toast.success("Take attendance modal would open")}
              >
                <ClipboardCheck className="h-4 w-4" />
                Take Attendance
              </Button>
            </CardContent>
          </Card>

          {/* At-risk students */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                At-Risk Students
              </CardTitle>
              <CardDescription>Students needing attention</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {atRiskStudents.map((student) => (
                <div
                  key={student.id}
                  className="rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {student.name}
                      </p>
                      <p className="text-xs text-gray-500">{student.class}</p>
                    </div>
                    <TrendIcon trend={student.trend} />
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{student.issue}</p>
                  <p className="text-xs text-gray-400 italic mt-1">
                    &ldquo;{student.teacherNote}&rdquo;
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
