"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ClipboardCheck,
  Clock,
  XCircle,
  Calendar,
  Phone,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";

interface AttendanceRecord {
  id: string;
  date: string;
  status: "present" | "absent" | "late" | "excused";
  student?: { id: string; first_name: string; last_name: string; class?: { id: string; name: string } | null } | null;
  class?: { id: string; name: string } | null;
}

interface AbsenceNotification {
  id: string;
  date: string;
  notification_status: "sent" | "pending" | "failed";
  notification_channel: string;
  student?: { first_name: string; last_name: string; class?: { name: string } | null } | null;
}

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
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [notificationFilter, setNotificationFilter] = useState("all");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [notifications, setNotifications] = useState<AbsenceNotification[]>([]);
  const [totalEnrolled, setTotalEnrolled] = useState(0);

  const loadDay = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const [rRes, nRes, sRes] = await Promise.all([
        fetch(`/api/attendance?date=${date}&limit=1000`),
        fetch(`/api/attendance/absences?date=${date}&limit=50`),
        fetch(`/api/students?status=active`),
      ]);
      const [rData, nData, sData] = await Promise.all([rRes.json(), nRes.json(), sRes.json()]);
      if (rRes.ok) setRecords(rData.data ?? []);
      if (nRes.ok) setNotifications(nData.data ?? []);
      if (sRes.ok) setTotalEnrolled((sData.data ?? []).length);
    } catch {
      toast.error("Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadDay(selectedDate); }, [selectedDate, loadDay]);

  const totals = useMemo(() => {
    const present = records.filter((r) => r.status === "present").length;
    const absent = records.filter((r) => r.status === "absent").length;
    const late = records.filter((r) => r.status === "late").length;
    const excused = records.filter((r) => r.status === "excused").length;
    return { present, absent, late, excused, total: totalEnrolled };
  }, [records, totalEnrolled]);

  const attendanceRate = totals.total > 0 ? Math.round(((totals.present + totals.late) / totals.total) * 100) : 0;

  const classBreakdown = useMemo(() => {
    const map = new Map<string, { className: string; present: number; absent: number; late: number; excused: number }>();
    for (const r of records) {
      const name = r.student?.class?.name ?? r.class?.name ?? "Unassigned";
      const entry = map.get(name) ?? { className: name, present: 0, absent: 0, late: 0, excused: 0 };
      if (r.status === "present") entry.present++;
      else if (r.status === "absent") entry.absent++;
      else if (r.status === "late") entry.late++;
      else if (r.status === "excused") entry.excused++;
      map.set(name, entry);
    }
    return Array.from(map.values()).sort((a, b) => a.className.localeCompare(b.className));
  }, [records]);

  const filteredNotifications = notificationFilter === "all"
    ? notifications
    : notifications.filter((n) => n.notification_status === notificationFilter);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (<div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />))}
        </div>
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor student attendance across all classes</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-44" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-500">Attendance Rate</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceRate}%</div>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(selectedDate).toLocaleDateString("en-GH", { weekday: "long", month: "short", day: "numeric" })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-500">Present</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totals.present}</div>
            <p className="text-xs text-gray-500 mt-1">{totals.total} total enrolled</p>
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
              {totals.total > 0 ? Math.round((totals.absent / totals.total) * 100) : 0}% absent
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-500">Late</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{totals.late}</div>
            <p className="text-xs text-gray-500 mt-1">
              {totals.total > 0 ? Math.round((totals.late / totals.total) * 100) : 0}% late
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Class Breakdown</CardTitle>
            <CardDescription>Attendance status by class for {selectedDate}</CardDescription>
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
                    <th className="pb-3 font-medium">Excused</th>
                  </tr>
                </thead>
                <tbody>
                  {classBreakdown.map((c) => (
                    <tr key={c.className} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-900">{c.className}</td>
                      <td className="py-3 text-green-600 font-medium">{c.present}</td>
                      <td className="py-3 text-red-600 font-medium">{c.absent}</td>
                      <td className="py-3 text-yellow-600 font-medium">{c.late}</td>
                      <td className="py-3 text-blue-600 font-medium">{c.excused}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t font-medium bg-gray-50">
                    <td className="py-3 text-gray-900">Total</td>
                    <td className="py-3 text-green-600">{totals.present}</td>
                    <td className="py-3 text-red-600">{totals.absent}</td>
                    <td className="py-3 text-yellow-600">{totals.late}</td>
                    <td className="py-3 text-blue-600">{totals.excused}</td>
                  </tr>
                </tfoot>
              </table>
              {classBreakdown.length === 0 && (
                <p className="text-center text-gray-500 py-8">No attendance recorded for this date.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Absence Notification Log</CardTitle>
            <CardDescription>Parent notifications sent for absences</CardDescription>
            <div className="flex gap-2 mt-2">
              {["all", "sent", "pending", "failed"].map((f) => (
                <button
                  key={f}
                  onClick={() => setNotificationFilter(f)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    notificationFilter === f ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredNotifications.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No notifications.</p>
              ) : filteredNotifications.map((n) => (
                <div key={n.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {n.student ? `${n.student.first_name} ${n.student.last_name}` : "—"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {n.student?.class?.name ?? "—"} · {n.date}
                    </p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      {n.notification_channel.includes("whatsapp") ? <MessageSquare className="h-3 w-3" /> : <Phone className="h-3 w-3" />}
                      {n.notification_channel}
                    </p>
                  </div>
                  <NotificationBadge status={n.notification_status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
