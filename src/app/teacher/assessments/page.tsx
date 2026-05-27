"use client";

import { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Plus,
  Save,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface Assessment {
  id: string;
  name: string;
  type: string | null;
  max_score: number;
  ca_weight_pct: number;
  date: string | null;
  subject_id: string | null;
  class_id: string;
  subject_name?: string;
  class_name?: string;
  scores_count: number;
  total_students: number;
}

interface StudentScore {
  student_id: string;
  first_name: string;
  last_name: string;
  admission_number: string | null;
  score: string;
  existing_score_id?: string;
  existing_score: number | null;
  remarks: string;
}

interface SubjectOption {
  id: string;
  name: string;
}

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [createForm, setCreateForm] = useState({
    name: "",
    type: "quiz" as string,
    max_score: "100",
    ca_weight_pct: "0",
    date: new Date().toISOString().split("T")[0],
    class_id: "",
    subject_id: "",
  });
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [creating, setCreating] = useState(false);

  // Score entry
  const [students, setStudents] = useState<StudentScore[]>([]);
  const [savingScores, setSavingScores] = useState(false);
  const [expandedStats, setExpandedStats] = useState(false);
  const [teacherId, setTeacherId] = useState<string | null>(null);

  useEffect(() => {
    loadTeacherAndData();
  }, []);

  async function loadTeacherAndData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: teacher } = await supabase
        .from("teachers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (teacher) {
        setTeacherId(teacher.id);

        // Load classes
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
        setClasses(Array.from(classMap, ([id, name]) => ({ id, name })));

        await loadAssessments(teacher.id);
      }
    } catch (err) {
      console.error("Load error:", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  async function loadAssessments(tId: string) {
    try {
      const { data: assessmentsData } = await supabase
        .from("assessments")
        .select("*, classes!inner(name), subjects!inner(name)")
        .eq("teacher_id", tId)
        .order("date", { ascending: false });

      if (!assessmentsData) {
        setAssessments([]);
        return;
      }

      const enriched = await Promise.all(
        assessmentsData.map(async (a) => {
          const cls = a.classes as unknown as { name: string };
          const subj = a.subjects as unknown as { name: string } | null;

          const { count: scoresCount } = await supabase
            .from("assessment_scores")
            .select("*", { count: "exact", head: true })
            .eq("assessment_id", a.id);

          const { count: totalStudents } = await supabase
            .from("students")
            .select("*", { count: "exact", head: true })
            .eq("class_id", a.class_id)
            .eq("status", "active");

          return {
            id: a.id,
            name: a.name,
            type: a.type,
            max_score: a.max_score,
            ca_weight_pct: a.ca_weight_pct,
            date: a.date,
            subject_id: a.subject_id,
            class_id: a.class_id,
            subject_name: subj?.name || "All Subjects",
            class_name: cls?.name || "Unknown",
            scores_count: scoresCount || 0,
            total_students: totalStudents || 0,
          };
        })
      );

      setAssessments(enriched);
    } catch (err) {
      console.error("Load assessments error:", err);
    }
  }

  async function handleClassChange(classId: string) {
    setCreateForm(prev => ({ ...prev, class_id: classId, subject_id: "" }));

    if (teacherId) {
      const { data: assignData } = await supabase
        .from("teacher_subject_assignments")
        .select("subject_id, subjects!inner(id, name)")
        .eq("class_id", classId)
        .eq("teacher_id", teacherId);

      const subjectList = (assignData || []).map((a: { subjects: unknown }) => {
        const subj = a.subjects as { id: string; name: string };
        return subj;
      });
      setSubjects(subjectList);
    }
  }

  async function handleCreateAssessment() {
    if (!createForm.name || !createForm.class_id) {
      toast.error("Assessment name and class are required");
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase.from("assessments").insert({
        name: createForm.name,
        type: createForm.type,
        max_score: parseFloat(createForm.max_score) || 0,
        ca_weight_pct: parseFloat(createForm.ca_weight_pct) || 0,
        date: createForm.date || null,
        class_id: createForm.class_id,
        subject_id: createForm.subject_id || null,
        teacher_id: teacherId,
      });

      if (error) throw error;

      toast.success("Assessment created successfully");
      setShowCreateForm(false);
      setCreateForm({
        name: "",
        type: "quiz",
        max_score: "100",
        ca_weight_pct: "0",
        date: new Date().toISOString().split("T")[0],
        class_id: "",
        subject_id: "",
      });

      if (teacherId) await loadAssessments(teacherId);
    } catch (err) {
      console.error("Create assessment error:", err);
      toast.error("Failed to create assessment");
    } finally {
      setCreating(false);
    }
  }

  async function selectAssessment(assessmentId: string) {
    setSelectedAssessmentId(assessmentId);
    setExpandedStats(false);

    const assessment = assessments.find(a => a.id === assessmentId);
    if (!assessment) return;

    try {
      const { data: studentData } = await supabase
        .from("students")
        .select("id, first_name, last_name, admission_number")
        .eq("class_id", assessment.class_id)
        .eq("status", "active")
        .order("first_name");

      const { data: existingScores } = await supabase
        .from("assessment_scores")
        .select("id, student_id, score, remarks")
        .eq("assessment_id", assessmentId);

      const scoreMap = new Map<string, { id: string; score: number | null; remarks: string | null }>();
      if (existingScores) {
        existingScores.forEach((s: { id: string; student_id: string; score: number | null; remarks: string | null }) => {
          scoreMap.set(s.student_id, { id: s.id, score: s.score, remarks: s.remarks });
        });
      }

      const enrichedStudents: StudentScore[] = (studentData || []).map((s: { id: string; first_name: string; last_name: string; admission_number: string | null }) => {
        const existing = scoreMap.get(s.id);
        return {
          student_id: s.id,
          first_name: s.first_name,
          last_name: s.last_name,
          admission_number: s.admission_number,
          score: existing?.score !== null && existing?.score !== undefined ? String(existing.score) : "",
          existing_score_id: existing?.id,
          existing_score: existing?.score ?? null,
          remarks: existing?.remarks || "",
        };
      });

      setStudents(enrichedStudents);
    } catch (err) {
      console.error("Load scores error:", err);
      toast.error("Failed to load student scores");
    }
  }

  function updateScore(studentId: string, value: string) {
    setStudents(prev =>
      prev.map(s => (s.student_id === studentId ? { ...s, score: value } : s))
    );
  }

  function updateRemarks(studentId: string, value: string) {
    setStudents(prev =>
      prev.map(s => (s.student_id === studentId ? { ...s, remarks: value } : s))
    );
  }

  const calcStats = () => {
    const numericScores = students
      .map(s => parseFloat(s.score))
      .filter(s => !isNaN(s));

    if (numericScores.length === 0) return null;

    return {
      average: (numericScores.reduce((a, b) => a + b, 0) / numericScores.length).toFixed(1),
      highest: Math.max(...numericScores),
      lowest: Math.min(...numericScores),
      entered: numericScores.length,
      total: students.length,
    };
  };

  async function handleSaveScores() {
    if (!selectedAssessmentId) return;

    setSavingScores(true);
    try {
      // Delete existing scores and re-insert
      const { error: delError } = await supabase
        .from("assessment_scores")
        .delete()
        .eq("assessment_id", selectedAssessmentId);
      if (delError) throw delError;

      const scores = students
        .filter(s => s.score.trim() !== "")
        .map(s => ({
          assessment_id: selectedAssessmentId,
          student_id: s.student_id,
          score: parseFloat(s.score) || 0,
          remarks: s.remarks || null,
        }));

      if (scores.length === 0) {
        toast.info("No scores to save");
        return;
      }

      const { error } = await supabase
        .from("assessment_scores")
        .insert(scores);
      if (error) throw error;

      toast.success(`Scores saved for ${scores.length} student(s)`);
      if (teacherId) await loadAssessments(teacherId);
    } catch (err) {
      console.error("Save scores error:", err);
      toast.error("Failed to save scores");
    } finally {
      setSavingScores(false);
    }
  }

  const typeColors: Record<string, "default" | "secondary" | "warning" | "info" | "success"> = {
    quiz: "info",
    test: "warning",
    homework: "secondary",
    project: "success",
    exam: "default",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading assessments...</p>
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
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = calcStats();

  const selectedAssessment = assessments.find(a => a.id === selectedAssessmentId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assessments</h1>
          <p className="text-sm text-muted-foreground">Create assessments and enter scores</p>
        </div>
        <Button onClick={() => { setShowCreateForm(!showCreateForm); setSelectedAssessmentId(null); }}>
          <Plus className="h-4 w-4 mr-2" />
          {showCreateForm ? "Cancel" : "New Assessment"}
        </Button>
      </div>

      {/* Create assessment form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create New Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Assessment Name</Label>
                <Input
                  placeholder="e.g. End of Term Exam"
                  value={createForm.name}
                  onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={createForm.type} onValueChange={v => setCreateForm(prev => ({ ...prev, type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="test">Test</SelectItem>
                    <SelectItem value="homework">Homework</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="exam">Exam</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Max Score</Label>
                <Input
                  type="number"
                  value={createForm.max_score}
                  onChange={e => setCreateForm(prev => ({ ...prev, max_score: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>CA Weight (%)</Label>
                <Input
                  type="number"
                  value={createForm.ca_weight_pct}
                  onChange={e => setCreateForm(prev => ({ ...prev, ca_weight_pct: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={createForm.date}
                  onChange={e => setCreateForm(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Class</Label>
                <Select
                  value={createForm.class_id}
                  onValueChange={handleClassChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Subject</Label>
                <Select
                  value={createForm.subject_id}
                  onValueChange={v => setCreateForm(prev => ({ ...prev, subject_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Subjects</SelectItem>
                    {subjects.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4">
              <Button onClick={handleCreateAssessment} disabled={creating}>
                {creating ? "Creating..." : "Create Assessment"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assessment list */}
      <div className="space-y-3">
        {assessments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <FileSpreadsheet className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">No assessments yet</p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first assessment
              </Button>
            </CardContent>
          </Card>
        ) : (
          assessments.map((assessment) => (
            <Card
              key={assessment.id}
              className={`cursor-pointer transition-colors ${
                selectedAssessmentId === assessment.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => selectAssessment(assessment.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{assessment.name}</h3>
                      <Badge variant={typeColors[assessment.type as keyof typeof typeColors] || "secondary"}>
                        {assessment.type}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Max: {assessment.max_score}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {assessment.class_name} • {assessment.subject_name}
                      {assessment.date && ` • ${new Date(assessment.date).toLocaleDateString("en-GH")}`}
                      {assessment.ca_weight_pct > 0 && ` • CA Weight: ${assessment.ca_weight_pct}%`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium">
                      <span className={
                        assessment.scores_count === assessment.total_students
                          ? "text-green-600"
                          : "text-amber-600"
                      }>
                        {assessment.scores_count}/{assessment.total_students}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">Scores entered</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Score entry grid */}
      {selectedAssessment && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Score Entry: {selectedAssessment.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpandedStats(!expandedStats)}
                className="flex items-center gap-1"
              >
                <BarChart3 className="h-4 w-4" />
                Stats
                {expandedStats ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </CardTitle>
            <CardDescription>
              {selectedAssessment.class_name} — Max Score: {selectedAssessment.max_score}
            </CardDescription>
          </CardHeader>

          {/* Stats expandable */}
          {expandedStats && stats && (
            <CardContent className="pt-0">
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-lg font-bold text-blue-600">{stats.average}</p>
                  <p className="text-xs text-blue-500">Average</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-lg font-bold text-green-600">{stats.highest}</p>
                  <p className="text-xs text-green-500">Highest</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-lg font-bold text-red-600">{stats.lowest}</p>
                  <p className="text-xs text-red-500">Lowest</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-lg font-bold text-purple-600">{stats.entered}/{stats.total}</p>
                  <p className="text-xs text-purple-500">Entered</p>
                </div>
              </div>
            </CardContent>
          )}

          <CardContent className="p-0">
            {students.length === 0 ? (
              <div className="text-center py-8 px-6">
                <p className="text-muted-foreground">No students in this class</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">#</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Student</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">ID</th>
                      <th className="p-3 text-xs font-medium text-muted-foreground w-24">Score</th>
                      <th className="p-3 text-xs font-medium text-muted-foreground w-40">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {students.map((s, idx) => (
                      <tr key={s.student_id} className="hover:bg-gray-50">
                        <td className="p-3 text-sm text-muted-foreground">{idx + 1}</td>
                        <td className="p-3 text-sm font-medium text-gray-900">
                          {s.first_name} {s.last_name}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {s.admission_number || "—"}
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            placeholder="Score"
                            value={s.score}
                            onChange={e => updateScore(s.student_id, e.target.value)}
                            className="h-8 text-sm w-20"
                            min={0}
                            max={selectedAssessment.max_score}
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            placeholder="Remarks"
                            value={s.remarks}
                            onChange={e => updateRemarks(s.student_id, e.target.value)}
                            className="h-8 text-sm"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>

          {students.length > 0 && (
            <CardFooter className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => { setSelectedAssessmentId(null); setStudents([]); }}
                className="flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                Close
              </Button>
              <Button onClick={handleSaveScores} disabled={savingScores} className="flex items-center gap-1">
                {savingScores ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Scores
                  </>
                )}
              </Button>
            </CardFooter>
          )}
        </Card>
      )}
    </div>
  );
}
