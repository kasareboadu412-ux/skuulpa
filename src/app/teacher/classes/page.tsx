"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Users,
  BookOpen,
  TrendingUp,
  Clock,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

interface ClassSummary {
  id: string;
  name: string;
  student_count: number;
  subject_count: number;
  attendance_rate: number;
  assessment_count: number;
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadClasses();
  }, []);

  async function loadClasses() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Not authenticated");
        return;
      }

      const { data: teacher } = await supabase
        .from("teachers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!teacher) {
        setError("Teacher profile not found");
        return;
      }

      // Get all class IDs this teacher teaches
      const { data: tClasses } = await supabase
        .from("classes")
        .select("id, name")
        .eq("teacher_id", teacher.id);

      const { data: assignments } = await supabase
        .from("teacher_subject_assignments")
        .select("class_id, classes!inner(id, name)")
        .eq("teacher_id", teacher.id);

      const classMap = new Map<string, string>();
      if (tClasses) tClasses.forEach((c: { id: string; name: string }) => classMap.set(c.id, c.name));
      if (assignments) {
        assignments.forEach((a: { classes: unknown }) => {
          const cls = a.classes as { id: string; name: string };
          if (cls && !classMap.has(cls.id)) classMap.set(cls.id, cls.name);
        });
      }

      if (classMap.size === 0) {
        setClasses([]);
        setLoading(false);
        return;
      }

      // Build summaries
      const summaries = await Promise.all(
        Array.from(classMap.entries()).map(async ([id, name]) => {
          // Student count
          const { count: studentCount } = await supabase
            .from("students")
            .select("*", { count: "exact", head: true })
            .eq("class_id", id)
            .eq("status", "active");

          // Subject count for this teacher
          const { count: subjectCount } = await supabase
            .from("teacher_subject_assignments")
            .select("*", { count: "exact", head: true })
            .eq("class_id", id)
            .eq("teacher_id", teacher.id);

          // Attendance rate
          const { data: attendanceRecords } = await supabase
            .from("attendance_records")
            .select("status")
            .eq("class_id", id);

          const totalAttendance = attendanceRecords?.length || 0;
          const presentAttendance = attendanceRecords?.filter(
            r => r.status === "present" || r.status === "late"
          ).length || 0;
          const attendanceRate = totalAttendance > 0
            ? Math.round((presentAttendance / totalAttendance) * 100)
            : 0;

          // Assessment count
          const { count: assessmentCount } = await supabase
            .from("assessments")
            .select("*", { count: "exact", head: true })
            .eq("class_id", id)
            .eq("teacher_id", teacher.id);

          return {
            id,
            name,
            student_count: studentCount || 0,
            subject_count: subjectCount || 0,
            attendance_rate: attendanceRate,
            assessment_count: assessmentCount || 0,
          };
        })
      );

      setClasses(summaries);
    } catch (err) {
      console.error("Load classes error:", err);
      setError("Failed to load class data");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading classes...</p>
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
            <Button onClick={loadClasses}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Classes</h1>
        <p className="text-sm text-muted-foreground">
          {classes.length + " class" + (classes.length === 1 ? "" : "es") + " assigned"}
        </p>
      </div>

      {classes.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <GraduationCap className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-muted-foreground">No classes assigned to you yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls) => (
            <Link key={cls.id} href={`/teacher/classes/${cls.id}`}>
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{cls.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Class overview</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <GraduationCap className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-sm font-semibold">{cls.student_count}</p>
                        <p className="text-[10px] text-muted-foreground">Students</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="text-sm font-semibold">{cls.subject_count}</p>
                        <p className="text-[10px] text-muted-foreground">Subjects</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-500" />
                      <div>
                        <p className="text-sm font-semibold">{cls.attendance_rate}%</p>
                        <p className="text-[10px] text-muted-foreground">Attendance</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-purple-500" />
                      <div>
                        <p className="text-sm font-semibold">{cls.assessment_count}</p>
                        <p className="text-[10px] text-muted-foreground">Assessments</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end text-sm text-blue-600 font-medium">
                    <span>View Details</span>
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
