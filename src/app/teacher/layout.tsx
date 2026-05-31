"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardCheck,
  GraduationCap,
  FileSpreadsheet,
  BookOpen,
  BookText,
  Users,
  AlertTriangle,
  Clock,
  Menu,
  X,
  ChevronLeft,
  LogOut,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const navItems = [
  { label: "Dashboard", href: "/teacher", icon: LayoutDashboard },
  { label: "Take Attendance", href: "/teacher/attendance", icon: ClipboardCheck },
  { label: "Classes", href: "/teacher/classes", icon: GraduationCap },
  { label: "Assessments", href: "/teacher/assessments", icon: FileSpreadsheet },
  { label: "Homework", href: "/teacher/homework", icon: BookOpen },
  { label: "Schemes of Work", href: "/teacher/schemes", icon: BookText },
  { label: "Students", href: "/teacher/students", icon: Users },
  { label: "Behavior", href: "/teacher/behavior", icon: AlertTriangle },
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [teacherName, setTeacherName] = useState<string>("");
  const [classAssignments, setClassAssignments] = useState<string[]>([]);
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [loadingTeacher, setLoadingTeacher] = useState(true);

  useEffect(() => {
    async function loadTeacherData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/auth/login");
          return;
        }

        const { data: teacher } = await supabase
          .from("teachers")
          .select("*, teacher_subject_assignments(*), classes(*)")
          .eq("user_id", user.id)
          .single();

        if (teacher) {
          setTeacherName(`${teacher.first_name} ${teacher.last_name}`);

          const classNames = teacher.classes
            ? teacher.classes.map((c: { name: string }) => c.name)
            : [];
          setClassAssignments(classNames);

          const today = new Date().toISOString().split("T")[0];
          const { data: attendance } = await supabase
            .from("teacher_attendance")
            .select("*")
            .eq("teacher_id", teacher.id)
            .eq("date", today)
            .single();

          if (attendance) {
            setClockedIn(!!attendance.clock_in_time && !attendance.clock_out_time);
            setClockInTime(attendance.clock_in_time);
          }
        }
      } catch (err) {
        console.error("Failed to load teacher data", err);
      } finally {
        setLoadingTeacher(false);
      }
    }
    loadTeacherData();
  }, [router]);

  async function handleClockIn() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: teacher } = await supabase
        .from("teachers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!teacher) return;

      const today = new Date().toISOString().split("T")[0];
      const now = new Date().toTimeString().split(" ")[0];

      if (!clockedIn) {
        const { error } = await supabase.from("teacher_attendance").upsert(
          {
            teacher_id: teacher.id,
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
        toast.success("Clocked in successfully");
      } else {
        const { error } = await supabase
          .from("teacher_attendance")
          .update({ clock_out_time: now })
          .eq("teacher_id", teacher.id)
          .eq("date", today);
        if (error) throw error;
        setClockedIn(false);
        setClockInTime(null);
        toast.success("Clocked out successfully");
      }
    } catch (err) {
      console.error("Clock in/out failed", err);
      toast.error("Failed to clock in/out");
    }
  }

  if (loadingTeacher) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading teacher portal...</p>
        </div>
      </div>
    );
  }

  // On mobile, hide sidebar for non-active-route check for classes subpages
  const isClassDetail = pathname.startsWith("/teacher/classes/") && pathname !== "/teacher/classes";

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <Link href="/teacher" className="flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-blue-600" />
              <span className="font-bold text-lg text-gray-900">Skuulr</span>
              <Badge variant="outline" className="text-xs ml-1">Teacher</Badge>
            </Link>
            <button
              className="lg:hidden text-gray-500 hover:text-gray-700"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href ||
                (item.href === "/teacher" && pathname === "/teacher") ||
                (item.href !== "/teacher" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar footer */}
          <div className="px-3 py-4 border-t border-gray-200">
            <button
              onClick={async () => {
                try {
                  await fetch("/api/auth/logout", { method: "POST" });
                } catch {
                  // server-side cookie clear failed; still proceed
                }
                await supabase.auth.signOut();
                router.push("/auth/login");
                router.refresh();
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 w-full"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 lg:px-6">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden text-gray-500 hover:text-gray-700"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              {isClassDetail && (
                <button
                  onClick={() => router.back()}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
              )}
            </div>

            <div className="flex items-center gap-4">
              {/* Class assignments */}
              {classAssignments.length > 0 && (
                <div className="hidden sm:flex items-center gap-1 text-sm text-gray-500">
                  <Users className="h-4 w-4" />
                  <span className="truncate max-w-[200px]">
                    {classAssignments.join(", ")}
                  </span>
                </div>
              )}

              {/* Clock in/out */}
              <Button
                size="sm"
                variant={clockedIn ? "outline" : "default"}
                onClick={handleClockIn}
                className="flex items-center gap-1.5"
              >
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {clockedIn ? `Clocked in ${clockInTime?.slice(0, 5) || ""}` : "Clock In"}
                </span>
                <span className="sm:hidden">
                  {clockedIn ? clockInTime?.slice(0, 5) : "In"}
                </span>
              </Button>

              {/* Teacher name */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-900">{teacherName || "Teacher"}</p>
                  <p className="text-xs text-gray-500">Teacher</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile class assignments */}
          {classAssignments.length > 0 && (
            <div className="sm:hidden px-4 pb-2 flex items-center gap-1 text-xs text-gray-500 border-b border-gray-100">
              <Users className="h-3 w-3" />
              <span>{classAssignments.join(", ")}</span>
            </div>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
