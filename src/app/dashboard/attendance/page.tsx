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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ClipboardCheck,
  Users,
  Clock,
  XCircle,
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  Phone,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ─── Types ───

interface ClassBreakdown {
  className: string;
  present: number;
  absent: number;
  late: number;
  total: number;
}

interface AbsenceNotification {
  id: string;
  studentName: string;
  className: string;
  date: string;
  status: "sent" | "pending" | "failed";
  channel: string;
}

// ─── Sample data ───

const classBreakdown: ClassBreakdown[] = [
  { className: "Nursery 1", present: 18, absent: 2, late: 1, total: 21 },
  { className: "Nursery 2", present: 22, absent: 1, late: 2, total: 25 },
  { className: "Class 1", present: 28, absent: 1, late: 0, total: 29 },
  { className: "Class 2", present: 30, absent: 0, late: 3, total: 33 },
  { className: "Class 3", present: 25, absent: 2, late: 1, total: 28 },
  { className: "Class 4", present: 32, absent: 1, late: 2, total: 35 },
  { className: "JHS 1", present: 40, absent: 1, late: 4, total: 45 },
  { className: "JHS 2", present: 42, absent: 0, late: 1, total: 43 },
  { className: "JHS 3", present: 38, absent: 2, late: 3, total: 43 },
];

const absenceNotifications: AbsenceNotification[] = [
  { id: "n1", studentName: "Samuel Antwi", className: "JHS 1", date: "2026-05-26", status: "sent", channel: "WhatsApp" },
  { id: "n2", studentName: "Akosua Amponsah", className: "JHS 1", date: "2026-05-26", status: "sent", channel: "SMS" },
  { id: "n3", studentName: "Kofi Adom", className: "JHS 1", date: "2026-05-25", status: "sent", channel: "WhatsApp" },
  { id: "n4", studentName: "Esi Nyarko", className: "Nursery 2", date: "2026-05-25", status: "pending", channel: "WhatsApp" },
  { id: "n5", studentName: "Kwabena Ofori", className: "Class 3", date: "2026-05-24", status: "failed", channel: "SMS" },
  { id: "n6", studentName: "Micheal Adjei", className: "JHS 3", date: "2026-05-24", status: "sent", channel: "Both" },
  { id: "n7", studentName: "Mansa Osei", className: "JHS 2", date: "2026-05-23", status: "sent", channel: "WhatsApp" },
];

const weeklyTrendData = [
  { day: "Mon", present: 310, absent: 18, late: 14 },
  { day: "Tue", present: 315, absent: 15, late: 12 },
  { day: "Wed", present: 308, absent: 20, late: 14 },
  { day: "Thu", present: 312, absent: 17, late: 13 },
  { day: "Fri", present: 305, absent: 22, late: 15 },
];

// ─── Main Page ───

function NotificationBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" }> = {
    sent: { label: "Sent", variant: "success" },
    pending: { label: "Pending", variant: "warning" },
    failed: { label: "Failed", variant: "danger" },
  };
  const s = map[status] || { label: status, variant: "info" as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export default function AttendancePage() {
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [notificationFilter, setNotificationFilter] = useState("all");

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const totals = classBreakdown.reduce(
    (acc, c) => ({
      present: acc.present + c.present,
      absent: acc.absent + c.absent,
      late: acc.late + c.late,
      total: acc.total + c.total,
    }),
    { present: 0, absent: 0, late: 0, total: 0 }
  );

  const attendanceRate =
    totals.total > 0
      ? Math.round(((totals.present + totals.late) / totals.total) * 100)
      : 0;

  const filteredNotifications =
    notificationFilter === "all"
      ? absenceNotifications
      : absenceNotifications.filter((n) => n.status === notificationFilter);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Overview</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor student attendance across all classes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-44"
          />
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-500">Attendance Rate</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceRate}%</div>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(selectedDate).toLocaleDateString("en-GH", {
                weekday: "long",
              })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-500">Present</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totals.present}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {totals.total} total enrolled
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-500">Absent</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totals.absent}</div>
            <p className="text-xs text-gray-500 mt-1">
              {Math.round((totals.absent / totals.total) * 100)}% absent rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-500">Late</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {totals.late}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {Math.round((totals.late / totals.total) * 100)}% late rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly trend */}
      <Card>
        <CardHeader>
          <CardTitle>This Week Trend</CardTitle>
          <CardDescription>Daily attendance breakdown for the current week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTrendData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar
                  dataKey="present"
                  stackId="a"
                  fill="#22c55e"
                  name="Present"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="late"
                  stackId="a"
                  fill="#eab308"
                  name="Late"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="absent"
                  stackId="a"
                  fill="#ef4444"
                  name="Absent"
                  radius={[0, 0, 4, 4]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Class-by-class breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Class Breakdown</CardTitle>
            <CardDescription>Attendance status by class for today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 font-medium">Class</th>
                    <th className="pb-3 font-medium">Present</th>
                    <th className="pb-3 font-medium">Absent</th>
                    <th className="pb-3 font-medium">Late</th>
                    <th className="pb-3 font-medium">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {classBreakdown.map((c) => (
                    <tr key={c.className} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-900">
                        {c.className}
                      </td>
                      <td className="py-3 text-green-600 font-medium">
                        {c.present}
                      </td>
                      <td className="py-3 text-red-600 font-medium">
                        {c.absent}
                      </td>
                      <td className="py-3 text-yellow-600 font-medium">
                        {c.late}
                      </td>
                      <td className="py-3">
                        <span
                          className={`text-sm font-semibold ${
                            (c.present + c.late) / c.total >= 0.9
                              ? "text-green-600"
                              : (c.present + c.late) / c.total >= 0.75
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}
                        >
                          {Math.round(((c.present + c.late) / c.total) * 100)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t font-medium bg-gray-50">
                    <td className="py-3 text-gray-900">Total</td>
                    <td className="py-3 text-green-600">{totals.present}</td>
                    <td className="py-3 text-red-600">{totals.absent}</td>
                    <td className="py-3 text-yellow-600">{totals.late}</td>
                    <td className="py-3">{attendanceRate}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Absence notification log */}
        <Card>
          <CardHeader>
            <CardTitle>Absence Notification Log</CardTitle>
            <CardDescription>
              Parent notifications sent for absences
            </CardDescription>
            <div className="flex gap-2 mt-2">
              {["all", "sent", "pending", "failed"].map((f) => (
                <button
                  key={f}
                  onClick={() => setNotificationFilter(f)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    notificationFilter === f
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredNotifications.length === 0 && (
                <p className="text-center text-gray-500 py-4">
                  No notifications match the filter.
                </p>
              )}
              {filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {n.studentName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {n.className} · {n.date}
                    </p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      {n.channel === "WhatsApp" || n.channel === "Both" ? (
                        <MessageSquare className="h-3 w-3" />
                      ) : (
                        <Phone className="h-3 w-3" />
                      )}
                      {n.channel}
                    </p>
                  </div>
                  <NotificationBadge status={n.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
