"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Search,
  X,
  AlertCircle,
  Mail,
  Phone,
  CalendarDays,
  TrendingUp,
  Clock,
  Star,
  MessageSquareWarning,
  FileSpreadsheet,
  User,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

interface StudentSummary {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string | null;
  profile_photo_url: string | null;
  class_name?: string;
  parent_primary_phone: string;
  parent_email: string | null;
  enrollment_date: string;
  attendance_rate: number;
  average_score: number | null;
  behavior_count: number;
  behavior_breakdown: { stars: number; warnings: number; incidents: number };
}

interface StudentFullProfile {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string | null;
  profile_photo_url: string | null;
  dob: string | null;
  class_name?: string;
  parent_primary_phone: string;
  parent_secondary_phone: string | null;
  parent_email: string | null;
  enrollment_date: string;
  status: string;
  medical_info: Record<string, unknown>;
  attendance_rate: number;
  average_score: number | null;
  behavior_count: number;
  behavior_breakdown: { stars: number; warnings: number; incidents: number };
  recent_scores: { name: string; score: number | null; max_score: number }[];
}

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentFullProfile | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
      const { data: assignments } = await supabase
        .from("teacher_subject_assignments")
        .select("class_id, classes!inner(name)")
        .eq("teacher_id", teacher.id);

      const { data: tClasses } = await supabase
        .from("classes")
        .select("id, name")
        .eq("teacher_id", teacher.id);

      const classMap = new Map<string, string>();
      if (tClasses) tClasses.forEach((c: { id: string; name: string }) => classMap.set(c.id, c.name));
      if (assignments) {
        assignments.forEach((a: { classes: unknown }) => {
          const cls = a.classes as { id: string; name: string };
          if (cls && !classMap.has(cls.id)) classMap.set(cls.id, cls.name);
        });
      }

      const classIds = Array.from(classMap.keys());

      if (classIds.length === 0) {
        setLoading(false);
        return;
      }

      // Get all students
      const { data: studentData } = await supabase
        .from("students")
        .select("*, classes!inner(name)")
        .in("class_id", classIds)
        .eq("status", "active")
        .order("first_name");

      if (!studentData) {
        setStudents([]);
        setLoading(false);
        return;
      }

      // Build enriched data
      const enrichedStudents = await Promise.all(
        studentData.map(async (s) => {
          const cls = s.classes as unknown as { name: string };

          // Attendance rate
          const { data: attendanceRecords } = await supabase
            .from("attendance_records")
            .select("status")
            .eq("student_id", s.id);

          const total = attendanceRecords?.length || 0;
          const present = attendanceRecords?.filter(
            r => r.status === "present" || r.status === "late"
          ).length || 0;
          const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

          // Average score
          const { data: scores } = await supabase
            .from("assessment_scores")
            .select("score")
            .eq("student_id", s.id);

          let avgScore: number | null = null;
          if (scores && scores.length > 0) {
            const validScores = scores.filter(sc => sc.score !== null);
            if (validScores.length > 0) {
              avgScore = Math.round(
                (validScores.reduce((sum, sc) => sum + (sc.score || 0), 0) / validScores.length) * 100
              ) / 100;
            }
          }

          // Behavior count
          const { data: behaviors } = await supabase
            .from("behavior_logs")
            .select("type")
            .eq("student_id", s.id);

          const stars = behaviors?.filter(b => b.type === "star").length || 0;
          const warnings = behaviors?.filter(b => b.type === "warning").length || 0;
          const incidents = behaviors?.filter(b => b.type === "incident").length || 0;

          return {
            id: s.id,
            first_name: s.first_name,
            last_name: s.last_name,
            admission_number: s.admission_number,
            profile_photo_url: s.profile_photo_url,
            class_name: cls?.name || "Unknown",
            parent_primary_phone: s.parent_primary_phone,
            parent_email: s.parent_email,
            enrollment_date: s.enrollment_date,
            attendance_rate: attendanceRate,
            average_score: avgScore,
            behavior_count: behaviors?.length || 0,
            behavior_breakdown: { stars, warnings, incidents },
          };
        })
      );

      setStudents(enrichedStudents);
    } catch (err) {
      console.error("Load students error:", err);
      setError("Failed to load student data");
    } finally {
      setLoading(false);
    }
  }

  async function openStudentProfile(studentId: string) {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    try {
      // Get full student details
      const { data: fullStudent } = await supabase
        .from("students")
        .select("*")
        .eq("id", studentId)
        .single();

      if (!fullStudent) return;

      // Get recent assessment scores
      const { data: scores } = await supabase
        .from("assessment_scores")
        .select("score, assessments!inner(name, max_score)")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(10);

      const recentScores = (scores || []).map((s: { assessments: unknown; score: number | null }) => {
        const assessment = s.assessments as { name: string; max_score: number };
        return {
          name: assessment?.name || "Unknown",
          score: s.score,
          max_score: assessment?.max_score || 100,
        };
      });

      setSelectedStudent({
        id: fullStudent.id,
        first_name: fullStudent.first_name,
        last_name: fullStudent.last_name,
        admission_number: fullStudent.admission_number,
        profile_photo_url: fullStudent.profile_photo_url,
        dob: fullStudent.dob,
        class_name: student.class_name,
        parent_primary_phone: fullStudent.parent_primary_phone,
        parent_secondary_phone: fullStudent.parent_secondary_phone,
        parent_email: fullStudent.parent_email,
        enrollment_date: fullStudent.enrollment_date,
        status: fullStudent.status,
        medical_info: fullStudent.medical_info as Record<string, unknown>,
        attendance_rate: student.attendance_rate,
        average_score: student.average_score,
        behavior_count: student.behavior_count,
        behavior_breakdown: student.behavior_breakdown,
        recent_scores: recentScores,
      });

      setShowDrawer(true);
    } catch (err) {
      console.error("Open profile error:", err);
    }
  }

  const filteredStudents = students.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q) ||
      (s.admission_number && s.admission_number.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading students...</p>
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
            <Button onClick={loadStudents}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-sm text-muted-foreground">
            {students.length} student{students.length !== 1 ? "s" : ""} across your classes
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by name or admission number..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Student grid */}
      {students.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-muted-foreground">No students assigned to your classes</p>
          </CardContent>
        </Card>
      ) : filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-muted-foreground">No students match your search</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((student) => (
            <Card
              key={student.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => openStudentProfile(student.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                    {student.profile_photo_url ? (
                      <img
                        src={student.profile_photo_url}
                        alt={`${student.first_name} ${student.last_name}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg font-medium text-gray-500">
                        {student.first_name[0]}{student.last_name[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {student.first_name} {student.last_name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {student.admission_number || "No ID"}
                    </p>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {student.class_name}
                    </Badge>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 text-blue-600">
                      <TrendingUp className="h-3 w-3" />
                      <span className="text-xs font-semibold">{student.average_score !== null ? student.average_score : "—"}</span>
                    </div>
                    <p className="text-[10px] text-blue-500">Score</p>
                  </div>
                  <div className="p-2 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 text-green-600">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs font-semibold">{student.attendance_rate}%</span>
                    </div>
                    <p className="text-[10px] text-green-500">Attend</p>
                  </div>
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 text-purple-600">
                      <AlertTriangle className="h-3 w-3" />
                      <span className="text-xs font-semibold">{student.behavior_count}</span>
                    </div>
                    <p className="text-[10px] text-purple-500">Behav</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Student profile drawer */}
      {showDrawer && selectedStudent && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowDrawer(false)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between z-10">
              <h2 className="font-semibold text-lg text-gray-900">Student Profile</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowDrawer(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-4 space-y-6">
              {/* Header */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                  {selectedStudent.profile_photo_url ? (
                    <img
                      src={selectedStudent.profile_photo_url}
                      alt={`${selectedStudent.first_name} ${selectedStudent.last_name}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-medium text-gray-500 bg-blue-100">
                      <User className="h-8 w-8 text-blue-500" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {selectedStudent.first_name} {selectedStudent.last_name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedStudent.admission_number || "No ID"}
                  </p>
                  <Badge variant="secondary" className="mt-1">
                    {selectedStudent.class_name}
                  </Badge>
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-lg font-bold text-blue-600">
                    {selectedStudent.average_score !== null ? selectedStudent.average_score : "—"}
                  </p>
                  <p className="text-xs text-blue-500">Avg Score</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-lg font-bold text-green-600">{selectedStudent.attendance_rate}%</p>
                  <p className="text-xs text-green-500">Attend</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <p className="text-lg font-bold text-amber-600">{selectedStudent.behavior_breakdown.stars}</p>
                  <p className="text-xs text-amber-500">Stars</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-lg font-bold text-red-600">{selectedStudent.behavior_breakdown.incidents}</p>
                  <p className="text-xs text-red-500">Issues</p>
                </div>
              </div>

              {/* Personal info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {selectedStudent.dob && (
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-gray-400" />
                      <span className="text-muted-foreground">DOB: </span>
                      <span>{new Date(selectedStudent.dob).toLocaleDateString("en-GH")}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-gray-400" />
                    <span className="text-muted-foreground">Enrolled: </span>
                    <span>{new Date(selectedStudent.enrollment_date).toLocaleDateString("en-GH")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="success" className="text-xs capitalize">{selectedStudent.status}</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Parent info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Parent / Guardian</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{selectedStudent.parent_primary_phone}</span>
                  </div>
                  {selectedStudent.parent_secondary_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{selectedStudent.parent_secondary_phone}</span>
                    </div>
                  )}
                  {selectedStudent.parent_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span>{selectedStudent.parent_email}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Medical info */}
              {Object.keys(selectedStudent.medical_info).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Medical Information</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                      {JSON.stringify(selectedStudent.medical_info, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* Recent scores */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Recent Scores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedStudent.recent_scores.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No scores recorded yet</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedStudent.recent_scores.map((s, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-700 truncate mr-2">{s.name}</span>
                          <span className="text-sm font-medium">
                            {s.score !== null ? `${s.score}/${s.max_score}` : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Behavior breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-400" />
                    Behavior Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <SparklesIcon className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">{selectedStudent.behavior_breakdown.stars} stars</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquareWarning className="h-4 w-4 text-orange-500" />
                      <span className="text-sm">{selectedStudent.behavior_breakdown.warnings} warnings</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="text-sm">{selectedStudent.behavior_breakdown.incidents} incidents</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowDrawer(false);
                    window.location.href = `/teacher/behavior`;
                  }}
                >
                  <Star className="h-4 w-4 mr-2" />
                  View Behavior
                </Button>
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => {
                    setShowDrawer(false);
                    window.location.href = `/teacher/assessments`;
                  }}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  View Scores
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Sparkles icon component for use inside the drawer
function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      <path d="M19 3v4" />
      <path d="M21 5h-4" />
    </svg>
  );
}
