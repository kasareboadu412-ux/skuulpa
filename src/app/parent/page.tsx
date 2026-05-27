"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  Calendar,
  BookOpen,
  AlertTriangle,
  Megaphone,
  TrendingUp,
  ChevronRight,
  ArrowRight,
  User,
  CalendarCheck,
  ClipboardList,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  class: { name: string } | { name: string }[] | null;
}

interface FeeSummary {
  totalDue: number;
  totalPaid: number;
  balance: number;
}

interface DashboardData {
  student: Student;
  feeSummary: FeeSummary | null;
  daysPresent: number;
  totalDays: number;
  homeworkPending: number;
  nextEvent: string | null;
  recentAbsences: { date: string; status: string }[];
}

export default function ParentDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const studentsRes = await fetch("/api/parent/students");
        if (!studentsRes.ok) throw new Error("Failed to load students");
        const studentsData = await studentsRes.json();
        const student = studentsData.students?.[0];
        if (!student) {
          setLoading(false);
          return;
        }

        const [feeRes, attRes, hwRes] = await Promise.all([
          fetch(`/api/parent/fees?studentId=${student.id}`),
          fetch(`/api/parent/attendance?studentId=${student.id}`),
          fetch(`/api/parent/homework?studentId=${student.id}`),
        ]);

        const feeData = feeRes.ok ? await feeRes.json() : null;
        const attData = attRes.ok ? await attRes.json() : null;
        const hwData = hwRes.ok ? await hwRes.json() : null;

        const attendanceRecords = attData?.attendanceRecords || [];
        const recentAbsences = attendanceRecords.filter(
          (r: { status: string }) => r.status === "absent"
        ).slice(0, 5);

        const homework = hwData?.homework || [];
        const homeworkPending = homework.filter(
          (h: { viewed: boolean }) => !h.viewed
        ).length;

        const upcomingHomework = homework
          .filter((h: { due_date: string | null }) => h.due_date)
          .sort(
            (a: { due_date: string }, b: { due_date: string }) =>
              new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
          );
        const nextEvent = upcomingHomework[0]?.due_date || null;

        setData({
          student,
          feeSummary: feeData?.summary || null,
          daysPresent: attData?.summary?.present || 0,
          totalDays: attData?.summary?.total || 0,
          homeworkPending,
          nextEvent,
          recentAbsences,
        });
      } catch {
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data?.student) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <User className="h-12 w-12 text-gray-300" />
        <p className="text-gray-500 text-sm">
          No children found. Contact your school to link your account.
        </p>
      </div>
    );
  }

  const {
    student,
    feeSummary,
    daysPresent,
    totalDays,
    homeworkPending,
    nextEvent,
    recentAbsences,
  } = data;

  const cls = student.class
    ? Array.isArray(student.class)
      ? student.class[0]
      : student.class
    : null;

  const getFeeStatusColor = (): "green" | "yellow" | "red" | "gray" => {
    if (!feeSummary) return "gray";
    if (feeSummary.balance <= 0) return "green";
    const ratio = feeSummary.balance / feeSummary.totalDue;
    if (ratio < 0.5) return "yellow";
    return "red";
  };

  const feeStatusColor = getFeeStatusColor();
  const presentPercentage =
    totalDays > 0 ? Math.round((daysPresent / totalDays) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Welcome back, {student.first_name}!
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {cls?.name || "Class not assigned"} &middot;{" "}
          {student.first_name} {student.last_name}
        </p>
      </div>

      {/* Fee Balance Card */}
      <Card
        className={`border-l-4 ${
          feeStatusColor === "green"
            ? "border-l-green-500"
            : feeStatusColor === "yellow"
            ? "border-l-yellow-500"
            : feeStatusColor === "red"
            ? "border-l-red-500"
            : "border-l-gray-300"
        }`}
      >
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Wallet className="h-4 w-4" /> Fee Balance
              </p>
              {feeSummary ? (
                <>
                  <p
                    className={`text-2xl font-bold mt-1 ${
                      feeStatusColor === "green"
                        ? "text-green-600"
                        : feeStatusColor === "yellow"
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(feeSummary.balance)}
                  </p>
                  {feeSummary.balance <= 0 ? (
                    <Badge variant="success" className="mt-1">
                      Fully Paid
                    </Badge>
                  ) : (
                    <Badge
                      variant={
                        feeStatusColor === "yellow" ? "warning" : "danger"
                      }
                      className="mt-1"
                    >
                      {feeStatusColor === "yellow"
                        ? "Partial Payment"
                        : "Overdue"}
                    </Badge>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">
                  No fee data
                </p>
              )}
            </div>
            <Link href="/parent/fees">
              <Button size="sm" className="gap-1">
                Pay Now <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <p className="text-lg font-bold">{presentPercentage}%</p>
            <p className="text-[10px] text-muted-foreground">Attendance</p>
            <p className="text-[10px] text-muted-foreground">
              {daysPresent}/{totalDays} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <BookOpen className="h-5 w-5 text-orange-600 mx-auto mb-1" />
            <p className="text-lg font-bold">{homeworkPending}</p>
            <p className="text-[10px] text-muted-foreground">Homework</p>
            <p className="text-[10px] text-muted-foreground">Pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-5 w-5 text-purple-600 mx-auto mb-1" />
            <p className="text-lg font-bold">
              {nextEvent ? new Date(nextEvent).getDate() : "\u2014"}
            </p>
            <p className="text-[10px] text-muted-foreground">Next Due</p>
            <p className="text-[10px] text-muted-foreground">
              {nextEvent
                ? new Date(nextEvent).toLocaleDateString("en-GB", {
                    month: "short",
                  })
                : "No tasks"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Absence Alerts */}
      {recentAbsences.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm text-red-800">
                  Recent Absences
                </p>
                <div className="mt-1 space-y-1">
                  {recentAbsences.slice(0, 3).map(
                    (a: { date: string }, i: number) => (
                      <p key={i} className="text-xs text-red-700">
                        {formatDate(a.date)}
                      </p>
                    )
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* School Announcements */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-blue-600" />
            School Announcements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No recent announcements
          </p>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/parent/attendance">
          <Card className="hover:shadow-md transition cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <CalendarCheck className="h-6 w-6 text-blue-600" />
              <div>
                <p className="font-medium text-sm">Attendance</p>
                <p className="text-xs text-muted-foreground">
                  View full history
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-300 ml-auto" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/parent/results">
          <Card className="hover:shadow-md transition cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <ClipboardList className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-sm">Results</p>
                <p className="text-xs text-muted-foreground">
                  View report cards
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-300 ml-auto" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
