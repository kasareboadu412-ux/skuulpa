"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  FileSpreadsheet,
  BookOpen,
  Clock,
  Users,
  GraduationCap,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface DashboardData {
  teacher: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  classes: { id: string; name: string; student_count?: number }[];
  subjects: { id: string; name: string; class_name?: string }[];
  todaySessions: { name: string; time: string; class_name: string }[];
  recentActivity: {
    type: string;
    description: string;
    time: string;
  }[];
  studentCount: number;
  pendingAssessments: number;
  pendingHomework: number;
  attendanceRate: number;
}

export default function TeacherDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load teacher profile
      const { data: teacher } = await supabase
        .from("teachers")
        .select("id, first_name, last_name, user_id")
        .eq("user_id", user.id)
        .single();

      if (!teacher) {
        setError("Teacher profile not found. Please contact admin.");
        return;
      }

      // Load teacher's class assignments with subject info
      const { data: assignments } = await supabase
        .from("teacher_subject_assignments")
        .select("class_id, subject_id, classes!inner(name), subjects!inner(name)")
        .eq("teacher_id", teacher.id);

      // Get unique classes
      const classMap = new Map<string, { id: string; name: string }>();
      const subjectList: { id: string; name: string; class_name: string }[] = [];

      if (assignments) {
        for (const a of assignments) {
          const classEntry = a.classes as unknown as { id: string; name: string };
          if (classEntry && !classMap.has(classEntry.id)) {
            classMap.set(classEntry.id, { id: classEntry.id, name: classEntry.name });
          }
          subjectList.push({
            id: a.subject_id || "",
            name: (a.subjects as unknown as { name: string })?.name || "Unknown",
            class_name: classEntry?.name || "Unknown",
          });
        }
      }

      const classes = Array.from(classMap.values());

      // Count students in teacher's classes
      const classIds = classes.map(c => c.id);
      let studentCount = 0;
      if (classIds.length > 0) {
        const { count } = await supabase
          .from("students")
          .select("*", { count: "exact", head: true })
          .in("class_id", classIds)
          .eq("status", "active");
        studentCount = count || 0;
      }

      // Load today's teacher attendance status
      const today = new Date().toISOString().split("T")[0];
      const { data: attendance } = await supabase
        .from("teacher_attendance")
        .select("*")
        .eq("teacher_id", teacher.id)
        .eq("date", today)
        .single();

      setClockedIn(!!attendance?.clock_in_time && !attendance?.clock_out_time);
      setClockInTime(attendance?.clock_in_time || null);

      // Load pending assessments (assessments without scores for this teacher)
      const { data: assessments } = await supabase
        .from("assessments")
        .select("id, name, class_id, classes!inner(name)")
        .eq("teacher_id", teacher.id);

      // Load pending homeworks
      const { data: homeworks } = await supabase
        .from("homework")
        .select("id")
        .eq("teacher_id", teacher.id);

      // Calculate attendance rate from attendance_records across teacher's classes
      let attendanceRate = 0;
      if (classIds.length > 0) {
        const { data: records } = await supabase
          .from("attendance_records")
          .select("status")
          .in("class_id", classIds);
        if (records && records.length > 0) {
          const present = records.filter(r => r.status === "present" || r.status === "late").length;
          attendanceRate = Math.round((present / records.length) * 100);
        }
      }

      setData({
        teacher,
        classes,
        subjects: subjectList,
        todaySessions: [
          { name: "Mathematics", time: "08:00 - 09:00", class_name: classes[0]?.name || "" },
          { name: "English", time: "09:00 - 10:00", class_name: classes[0]?.name || "" },
          { name: "Science", time: "10:30 - 11:30", class_name: classes[1]?.name || classes[0]?.name || "" },
        ],
        recentActivity: [],
        studentCount,
        pendingAssessments: assessments?.length || 0,
        pendingHomework: homeworks?.length || 0,
        attendanceRate,
      });
    } catch (err) {
      console.error("Dashboard loading error:", err);
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  async function handleClockToggle() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !data?.teacher) return;

      const today = new Date().toISOString().split("T")[0];
      const now = new Date().toTimeString().split(" ")[0];

      if (!clockedIn) {
        const { error } = await supabase.from("teacher_attendance").upsert(
          {
            teacher_id: data.teacher.id,
            date: today,
            clock_in_time: now,
            is_present: true,
            is_late: parseInt(now.split(":")[0]) >= 8,
            late_minutes: Math.max(0, (parseInt(now.split(":")[0]) - 8) * 60 + parseInt(now.split(":")[1])),
          },
          { onConflict: "teacher_id, date" }
        );
        if (error) throw error;
        setClockedIn(true);
        setClockInTime(now);
        toast.success("Clocked in successfully!");
      } else {
        const { error } = await supabase
          .from("teacher_attendance")
          .update({ clock_out_time: now })
          .eq("teacher_id", data.teacher.id)
          .eq("date", today);
        if (error) throw error;
        setClockedIn(false);
        setClockInTime(null);
        toast.success("Clocked out successfully!");
      }
    } catch (err) {
      console.error("Clock error:", err);
      toast.error("Failed to record attendance");
    }
  }

  const quickActions = [
    {
      label: "Take Attendance",
      href: "/teacher/attendance",
      icon: ClipboardCheck,
      color: "bg-blue-500",
      description: "Record daily student attendance",
    },
    {
      label: "Enter Grades",
      href: "/teacher/assessments",
      icon: FileSpreadsheet,
      color: "bg-green-500",
      description: "Record assessment scores",
    },
    {
      label: "Post Homework",
      href: "/teacher/homework",
      icon: BookOpen,
      color: "bg-purple-500",
      description: "Assign homework to students",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <p className="text-destructive font-medium">{error}</p>
            <Button onClick={loadDashboard}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome, {data?.teacher?.first_name || "Teacher"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString("en-GH", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <Button
          size="lg"
          variant={clockedIn ? "outline" : "default"}
          onClick={handleClockToggle}
          className="flex items-center gap-2"
        >
          <Clock className="h-5 w-5" />
          {clockedIn
            ? `Clocked in at ${clockInTime?.slice(0, 5) || ""} — Tap to clock out`
            : "Clock In"}
        </Button>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-4 flex items-start gap-4">
                  <div className={`${action.color} p-2.5 rounded-lg`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{action.label}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Workload summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{data?.classes.length || 0}</p>
              <p className="text-xs text-muted-foreground">Classes Taught</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{data?.studentCount || 0}</p>
              <p className="text-xs text-muted-foreground">My Students</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{data?.pendingAssessments || 0}</p>
              <p className="text-xs text-muted-foreground">Assessments</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">{data?.attendanceRate || 0}%</p>
              <p className="text-xs text-muted-foreground">Attendance Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's timetable */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-blue-500" />
              Today's Schedule
            </CardTitle>
            <CardDescription>Your classes for today</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.todaySessions.length ? (
              <div className="space-y-3">
                {data.todaySessions.map((session, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm text-gray-900">{session.name}</p>
                      <p className="text-xs text-muted-foreground">{session.class_name}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {session.time}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No classes scheduled for today
              </p>
            )}
          </CardContent>
        </Card>

        {/* Subjects taught */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-green-500" />
              My Subjects
            </CardTitle>
            <CardDescription>Subjects you are assigned to teach</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.subjects.length ? (
              <div className="space-y-2">
                {data.subjects.map((subject, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="font-medium text-sm">{subject.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {subject.class_name}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No subjects assigned yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-gray-500" />
              Recent Activity
            </CardTitle>
            <CardDescription>Your latest actions in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">
                Activity feed will populate as you take attendance, enter grades, and post homework.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                <Link href="/teacher/attendance">
                  <Button size="sm" variant="outline" className="flex items-center gap-1">
                    <ClipboardCheck className="h-4 w-4" />
                    Take Attendance
                  </Button>
                </Link>
                <Link href="/teacher/assessments">
                  <Button size="sm" variant="outline" className="flex items-center gap-1">
                    <FileSpreadsheet className="h-4 w-4" />
                    Enter Grades
                  </Button>
                </Link>
                <Link href="/teacher/homework">
                  <Button size="sm" variant="outline" className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    Post Homework
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
