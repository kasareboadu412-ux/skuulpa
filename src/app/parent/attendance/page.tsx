"use client";

import { useEffect, useState } from "react";
import {
  CalendarCheck,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  class: { name: string } | { name: string }[] | null;
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: string | null;
}

interface AbsenceNotification {
  id: string;
  date: string | null;
  parent1_notified_at: string | null;
  notification_channel: string | null;
  notification_status: string;
  created_at: string;
}

export default function AttendancePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [absences, setAbsences] = useState<AbsenceNotification[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    present: number;
    absent: number;
    late: number;
    presentPercentage: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0);

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
    async function fetchAttendance() {
      setLoading(true);
      try {
        // Calculate date range for the current view (past 3 months)
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() - monthOffset + 1);
        endDate.setDate(0); // end of previous month
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - monthOffset - 2);
        startDate.setDate(1);

        const params = new URLSearchParams({
          studentId: selectedStudentId,
          from: startDate.toISOString().split("T")[0],
          to: endDate.toISOString().split("T")[0],
        });

        const res = await fetch(`/api/parent/attendance?${params}`);
        if (!res.ok) throw new Error("Failed to load attendance");
        const data = await res.json();
        setRecords(data.attendanceRecords || []);
        setAbsences(data.absenceNotifications || []);
        setSummary(data.summary || null);
      } catch {
        toast.error("Failed to load attendance data");
      } finally {
        setLoading(false);
      }
    }
    fetchAttendance();
  }, [selectedStudentId, monthOffset]);

  // Build calendar grid
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = currentMonth.getDay(); // 0=Sun

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const getDayStatus = (day: number): string | null => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const record = records.find((r) => r.date.startsWith(dateStr));
    return record?.status || null;
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "present":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "absent":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "late":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "present": return "bg-green-100 text-green-700";
      case "absent": return "bg-red-100 text-red-700";
      case "late": return "bg-yellow-100 text-yellow-700";
      default: return "bg-gray-100 text-gray-400";
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
        <CalendarCheck className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-lg font-bold">Attendance History</h1>
          {students.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {students.find((s) => s.id === selectedStudentId)?.first_name}{" "}
              {students.find((s) => s.id === selectedStudentId)?.last_name}
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

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-4 gap-2">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-blue-600">
                {summary.presentPercentage}%
              </p>
              <p className="text-[10px] text-muted-foreground">Present</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-green-600">
                {summary.present}
              </p>
              <p className="text-[10px] text-muted-foreground">Days</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-red-600">
                {summary.absent}
              </p>
              <p className="text-[10px] text-muted-foreground">Absent</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-yellow-600">
                {summary.late}
              </p>
              <p className="text-[10px] text-muted-foreground">Late</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Calendar Navigator */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMonthOffset((prev) => prev + 1)}
        >
          &larr; Prev
        </Button>
        <span className="font-medium text-sm">
          {monthNames[month]} {year}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMonthOffset((prev) => Math.max(0, prev - 1))}
          disabled={monthOffset === 0}
        >
          Next &rarr;
        </Button>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                key={d}
                className="text-center text-[10px] font-medium text-muted-foreground py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const status = getDayStatus(day);
              const today =
                day === now.getDate() &&
                month === now.getMonth() &&
                year === now.getFullYear();

              return (
                <div
                  key={day}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-colors ${
                    today ? "ring-2 ring-blue-400" : ""
                  } ${getStatusColor(status)}`}
                >
                  <span className="font-medium">{day}</span>
                  {getStatusIcon(status)}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" /> Present
            </span>
            <span className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-500" /> Absent
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-yellow-500" /> Late
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Absence Notifications */}
      {absences.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Absence Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {absences.slice(0, 10).map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-medium">
                    {a.date ? formatDate(a.date) : "Unknown date"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.notification_channel === "whatsapp"
                      ? "WhatsApp"
                      : a.notification_channel === "sms"
                      ? "SMS"
                      : a.notification_channel === "both"
                      ? "WhatsApp & SMS"
                      : "—"}{" "}
                    &middot;{" "}
                    {a.notification_status === "sent" ? "Sent" : "Failed"}
                  </p>
                </div>
                <Badge
                  variant={
                    a.notification_status === "sent" ? "success" : "danger"
                  }
                  className="text-[10px]"
                >
                  {a.notification_status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Attendance Records */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Recent Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No attendance records found
            </p>
          ) : (
            <div className="space-y-2">
              {records.slice(0, 20).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0"
                >
                  <span>{formatDate(r.date)}</span>
                  <Badge
                    variant={
                      r.status === "present"
                        ? "success"
                        : r.status === "absent"
                        ? "danger"
                        : r.status === "late"
                        ? "warning"
                        : "secondary"
                    }
                  >
                    {r.status?.replace(/_/g, " ") || "Unknown"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
