"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  GraduationCap,
  TrendingUp,
  BookOpen,
  Clock,
  AlertCircle,
  Star,
  Flame,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

interface ClassStudent {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string | null;
  profile_photo_url: string | null;
  last_score: number | null;
  attendance_streak: number;
}

interface ClassDetail {
  id: string;
  name: string;
  student_count: number;
  completed_assessments: number;
  total_assessments: number;
  attendance_rate: number;
  average_score: number | null;
}

export default function ClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.classId as string;

  const [classDetail, setClassDetail] = useState<ClassDetail | null>(null);
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string; code: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (classId) loadClassData();
  }, [classId]);

  async function loadClassData() {
    try {
      // Get class info
      const { data: cls } = await supabase
        .from("classes")
        .select("id, name")
        .eq("id", classId)
        .single();

      if (!cls) {
        setError("Class not found");
        return;
      }

      // Get teacher ID
      const { data: { user } } = await supabase.auth.getUser();
      let teacherId: string | null = null;
      if (user) {
        const { data: teacher } = await supabase
          .from("teachers")
          .select("id")
          .eq("user_id", user.id)
          .single();
        if (teacher) teacherId = teacher.id;
      }

      // Get subjects taught by this teacher for this class
      const { data: assignData } = await supabase
        .from("teacher_subject_assignments")
        .select("subject_id, subjects!inner(id, name, code)")
        .eq("class_id", classId)
        .eq("teacher_id", teacherId);

      const subjectList = (assignData || []).map((a: { subjects: unknown }) => {
        const subj = a.subjects as { id: string; name: string; code: string | null };
        return subj;
      });
      setSubjects(subjectList);

      // Get active students
      const { data: studentData } = await supabase
        .from("students")
        .select("id, first_name, last_name, admission_number, profile_photo_url")
        .eq("class_id", classId)
        .eq("status", "active")
        .order("first_name");

      // Get attendance records count for rate
      const { data: attendanceRecords } = await supabase
        .from("attendance_records")
        .select("id, student_id, status")
        .eq("class_id", classId);

      const totalAttendance = attendanceRecords?.length || 0;
      const presentAttendance = attendanceRecords?.filter(
        r => r.status === "present" || r.status === "late"
      ).length || 0;
      const attendanceRate = totalAttendance > 0
        ? Math.round((presentAttendance / totalAttendance) * 100)
        : 0;

      // Get completed assessments for this class
      const { data: assessments } = await supabase
        .from("assessments")
        .select("id, max_score")
        .eq("class_id", classId)
        .eq("teacher_id", teacherId);

      const totalAssessments = assessments?.length || 0;

      // Get assessment scores
      const assessmentIds = assessments?.map(a => a.id) || [];
      let avgScore: number | null = null;
      if (assessmentIds.length > 0) {
        const { data: scores } = await supabase
          .from("assessment_scores")
          .select("score, student_id, assessment_id")
          .in("assessment_id", assessmentIds);

        const scoredAssessments = new Set(scores?.map(s => s.assessment_id) || []);
        const completedAssessments = scoredAssessments.size;

        if (scores && scores.length > 0) {
          const validScores = scores.filter(s => s.score !== null);
          if (validScores.length > 0) {
            const total = validScores.reduce((sum, s) => sum + (s.score || 0), 0);
            avgScore = Math.round((total / validScores.length) * 100) / 100;
          }
        }

        // Compute last score per student
        const studentScores: Record<string, number[]> = {};
        if (scores) {
          scores.forEach(s => {
            if (s.score !== null) {
              if (!studentScores[s.student_id]) studentScores[s.student_id] = [];
              studentScores[s.student_id].push(s.score);
            }
          });
        }

        // Build student list with last scores and attendance streaks
        const today = new Date();

        // For attendance streak: count consecutive days student was present
        const studentRecords: Record<string, string[]> = {};
        if (attendanceRecords) {
          attendanceRecords.forEach(r => {
            if (r.status === "present" || r.status === "late") {
              if (!studentRecords[r.student_id]) studentRecords[r.student_id] = [];
              studentRecords[r.student_id].push(r.id);
            }
          });
        }

        const enrichedStudents: ClassStudent[] = (studentData || []).map((s: { id: string; first_name: string; last_name: string; admission_number: string | null; profile_photo_url: string | null }) => ({
          id: s.id,
          first_name: s.first_name,
          last_name: s.last_name,
          admission_number: s.admission_number,
          profile_photo_url: s.profile_photo_url,
          last_score: studentScores[s.id]?.length
            ? studentScores[s.id][studentScores[s.id].length - 1]
            : null,
          attendance_streak: studentRecords[s.id]?.length || 0,
        }));

        setStudents(enrichedStudents);
        setClassDetail({
          id: cls.id,
          name: cls.name,
          student_count: studentData?.length || 0,
          completed_assessments: completedAssessments,
          total_assessments: totalAssessments,
          attendance_rate: attendanceRate,
          average_score: avgScore,
        });
      } else {
        const enrichedStudents: ClassStudent[] = (studentData || []).map((s: { id: string; first_name: string; last_name: string; admission_number: string | null; profile_photo_url: string | null }) => ({
          id: s.id,
          first_name: s.first_name,
          last_name: s.last_name,
          admission_number: s.admission_number,
          profile_photo_url: s.profile_photo_url,
          last_score: null,
          attendance_streak: 0,
        }));
        setStudents(enrichedStudents);
        setClassDetail({
          id: cls.id,
          name: cls.name,
          student_count: studentData?.length || 0,
          completed_assessments: 0,
          total_assessments: totalAssessments,
          attendance_rate: attendanceRate,
          average_score: null,
        });
      }
    } catch (err) {
      console.error("Failed to load class detail:", err);
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
          <p className="text-sm text-muted-foreground">Loading class details...</p>
        </div>
      </div>
    );
  }

  if (error || !classDetail) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <p className="text-destructive font-medium">{error || "Class not found"}</p>
            <Button onClick={() => router.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="flex-shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{classDetail.name}</h1>
          <p className="text-sm text-muted-foreground">
            {classDetail.student_count} student{classDetail.student_count !== 1 ? "s" : ""} enrolled
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{classDetail.student_count}</p>
              <p className="text-xs text-muted-foreground">Students</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">
                {classDetail.average_score !== null ? classDetail.average_score : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Avg Score</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{classDetail.attendance_rate}%</p>
              <p className="text-xs text-muted-foreground">Attendance</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">
                {classDetail.completed_assessments}/{classDetail.total_assessments}
              </p>
              <p className="text-xs text-muted-foreground">Assessments</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subjects */}
      {subjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-gray-500" />
              Subjects Taught
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {subjects.map(s => (
                <Badge key={s.id} variant="secondary" className="text-sm px-3 py-1">
                  {s.name}
                  {s.code && <span className="text-muted-foreground ml-1">({s.code})</span>}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Student roster */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-500" />
            Student Roster
          </CardTitle>
          <CardDescription>{students.length} active student{students.length !== 1 ? "s" : ""}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {students.length === 0 ? (
            <div className="text-center py-8 px-6">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-muted-foreground">No students enrolled in this class yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Photo */}
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                    {student.profile_photo_url ? (
                      <img
                        src={student.profile_photo_url}
                        alt={`${student.first_name} ${student.last_name}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-medium text-gray-500">
                        {student.first_name[0]}{student.last_name[0]}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {student.first_name} {student.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {student.admission_number || "No ID"}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 text-xs flex-shrink-0">
                    {student.last_score !== null && (
                      <div className="flex items-center gap-1 text-gray-600">
                        <Star className="h-3 w-3 text-amber-400" />
                        <span>{student.last_score}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-gray-600">
                      <Flame className="h-3 w-3 text-orange-400" />
                      <span>{student.attendance_streak}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
