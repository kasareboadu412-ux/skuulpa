"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  FileSpreadsheet,
  BookOpen,
  Clock,
  Users,
  CheckCircle2,
  LogOut,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface TeacherMe {
  teacher: {
    id: string;
    first_name: string;
    last_name: string;
    employee_id: string | null;
    status: string;
  };
  owned_classes: Array<{ id: string; name: string; students?: Array<{ count: number }> }>;
  subject_assignments: Array<{ class_id: string; subject_id: string; class?: { id: string; name: string } | null; subject?: { id: string; name: string; code: string | null } | null }>;
  today_attendance: { clock_in_time: string | null; clock_out_time: string | null; is_late: boolean; late_minutes: number | null } | null;
}

export default function TeacherDashboard() {
  const [data, setData] = useState<TeacherMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clocking, setClocking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teachers/me");
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to load teacher profile");
        return;
      }
      setData(json.data);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const clock = async (action: "in" | "out") => {
    setClocking(true);
    try {
      const res = await fetch("/api/teachers/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Failed"); return; }
      toast.success(action === "in" ? "Clocked in" : "Clocked out");
      void load();
    } catch {
      toast.error("Network error");
    } finally {
      setClocking(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 bg-gray-200 rounded w-64 animate-pulse" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (<div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600 mb-2">{error || "Teacher profile not found"}</p>
            <p className="text-sm text-gray-500">If you&apos;re a teacher, ask your school admin to add you in the Teachers section.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const t = data.teacher;
  const today = new Date().toLocaleDateString("en-GH", { weekday: "long", month: "long", day: "numeric" });
  const isClockedIn = !!data.today_attendance?.clock_in_time && !data.today_attendance?.clock_out_time;
  const studentCount = data.owned_classes.reduce((s, c) => s + (c.students?.[0]?.count ?? 0), 0);
  const subjectsTaught = new Set(data.subject_assignments.map((a) => a.subject?.id).filter(Boolean)).size;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {t.first_name}</h1>
          <p className="text-sm text-gray-500 mt-1">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          {isClockedIn ? (
            <Button onClick={() => clock("out")} variant="outline" disabled={clocking}>
              <LogOut className="h-4 w-4 mr-2" /> Clock out
            </Button>
          ) : (
            <Button onClick={() => clock("in")} disabled={clocking}>
              <Clock className="h-4 w-4 mr-2" />
              {data.today_attendance?.clock_in_time ? "Clocked out today" : "Clock in"}
            </Button>
          )}
        </div>
      </div>

      {data.today_attendance?.clock_in_time && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-3 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">
                Clocked in at {data.today_attendance.clock_in_time}
                {data.today_attendance.clock_out_time && ` · out at ${data.today_attendance.clock_out_time}`}
              </p>
              {data.today_attendance.is_late && (
                <p className="text-xs text-amber-700">
                  Late by {data.today_attendance.late_minutes} min
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">My Classes</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.owned_classes.length}</p>
            <p className="text-xs text-gray-500 mt-1">As class teacher</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Students</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{studentCount}</p>
            <p className="text-xs text-gray-500 mt-1">In owned classes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Subjects Taught</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{subjectsTaught}</p>
            <p className="text-xs text-gray-500 mt-1">{data.subject_assignments.length} assignments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Status</CardTitle></CardHeader>
          <CardContent>
            <Badge variant={t.status === "active" ? "success" : "warning"}>{t.status}</Badge>
            {t.employee_id && <p className="text-xs text-gray-500 mt-1">ID: {t.employee_id}</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My Classes</CardTitle>
            <CardDescription>Classes you are the form teacher for</CardDescription>
          </CardHeader>
          <CardContent>
            {data.owned_classes.length === 0 ? (
              <p className="text-sm text-gray-500">You have not been assigned as form teacher to any class yet.</p>
            ) : (
              <div className="space-y-2">
                {data.owned_classes.map((c) => (
                  <Link key={c.id} href={`/teacher/classes/${c.id}`} className="block">
                    <div className="rounded-lg border p-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{c.name}</p>
                        <span className="text-xs text-gray-500">{c.students?.[0]?.count ?? 0} students</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subject Assignments</CardTitle>
            <CardDescription>Subjects you teach in various classes</CardDescription>
          </CardHeader>
          <CardContent>
            {data.subject_assignments.length === 0 ? (
              <p className="text-sm text-gray-500">No subject assignments yet.</p>
            ) : (
              <div className="space-y-2">
                {data.subject_assignments.map((a, i) => (
                  <div key={i} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{a.subject?.name ?? "—"}</p>
                        <p className="text-xs text-gray-500">{a.class?.name ?? "—"}</p>
                      </div>
                      {a.subject?.code && <Badge variant="secondary">{a.subject.code}</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common teacher tasks</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Link href="/teacher/attendance"><Button variant="outline" className="w-full justify-start"><ClipboardCheck className="h-4 w-4 mr-2" />Take Attendance</Button></Link>
          <Link href="/teacher/assessments"><Button variant="outline" className="w-full justify-start"><FileSpreadsheet className="h-4 w-4 mr-2" />Assessments</Button></Link>
          <Link href="/teacher/schemes"><Button variant="outline" className="w-full justify-start"><BookOpen className="h-4 w-4 mr-2" />Schemes of Work</Button></Link>
          <Link href="/teacher/students"><Button variant="outline" className="w-full justify-start"><Users className="h-4 w-4 mr-2" />My Students</Button></Link>
          <Link href="/teacher/behavior"><Button variant="outline" className="w-full justify-start"><ClipboardCheck className="h-4 w-4 mr-2" />Behavior Log</Button></Link>
          <Link href="/teacher/homework"><Button variant="outline" className="w-full justify-start"><FileSpreadsheet className="h-4 w-4 mr-2" />Homework</Button></Link>
        </CardContent>
      </Card>
    </div>
  );
}
