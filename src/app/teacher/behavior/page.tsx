"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  Star,
  MessageSquareWarning,
  Plus,
  Send,
  Search,
  AlertCircle,
  History,
  User,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

interface StudentOption {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string | null;
  class_name?: string;
}

interface BehaviorLog {
  id: string;
  type: string | null;
  description: string;
  date: string;
  shared_with_parent: boolean;
  shared_at: string | null;
  created_at: string;
  student_name?: string;
  student_id?: string;
}

interface BehaviorStats {
  stars: number;
  warnings: number;
  incidents: number;
}

export default function BehaviorPage() {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Log form
  const [showLogForm, setShowLogForm] = useState(false);
  const [logType, setLogType] = useState<string>("star");
  const [logDescription, setLogDescription] = useState("");
  const [logDate, setLogDate] = useState(new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);

  // History
  const [history, setHistory] = useState<BehaviorLog[]>([]);
  const [stats, setStats] = useState<BehaviorStats>({ stars: 0, warnings: 0, incidents: 0 });
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Recent feed
  const [recentFeed, setRecentFeed] = useState<BehaviorLog[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      loadHistory(selectedStudentId);
    } else {
      setHistory([]);
      setStats({ stars: 0, warnings: 0, incidents: 0 });
    }
  }, [selectedStudentId]);

  async function loadData() {
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

        // Load students in teacher's classes
        const { data: assignments } = await supabase
          .from("teacher_subject_assignments")
          .select("class_id, classes!inner(name)")
          .eq("teacher_id", teacher.id);

        const classIds = [...new Set((assignments || []).map((a: { class_id: string }) => a.class_id))];

        // Also include main class
        const { data: tClasses } = await supabase
          .from("classes")
          .select("id")
          .eq("teacher_id", teacher.id);
        if (tClasses) {
          tClasses.forEach((c: { id: string }) => {
            if (!classIds.includes(c.id)) classIds.push(c.id);
          });
        }

        if (classIds.length > 0) {
          const { data: studentData } = await supabase
            .from("students")
            .select("id, first_name, last_name, admission_number, classes!inner(name)")
            .in("class_id", classIds)
            .eq("status", "active")
            .order("first_name");

          if (studentData) {
            setStudents(
              studentData.map((s: { classes: unknown; id: string; first_name: string; last_name: string; admission_number: string | null }) => {
                const cls = s.classes as { name: string };
                return {
                  id: s.id,
                  first_name: s.first_name,
                  last_name: s.last_name,
                  admission_number: s.admission_number,
                  class_name: cls?.name || "Unknown",
                };
              })
            );
          }
        }

        // Load recent feed
        await loadRecentFeed(teacher.id, classIds);
      }
    } catch (err) {
      console.error("Load error:", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  async function loadRecentFeed(tId: string, classIds: string[]) {
    setLoadingFeed(true);
    try {
      const { data: logs } = await supabase
        .from("behavior_logs")
        .select("*, students!inner(id, first_name, last_name)")
        .eq("teacher_id", tId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (logs) {
        setRecentFeed(
          logs.map((l: { students: unknown; id: string; type: string | null; description: string; date: string; shared_with_parent: boolean; shared_at: string | null; created_at: string }) => {
            const student = l.students as { id: string; first_name: string; last_name: string };
            return {
              id: l.id,
              type: l.type,
              description: l.description,
              date: l.date,
              shared_with_parent: l.shared_with_parent,
              shared_at: l.shared_at,
              created_at: l.created_at,
              student_name: student ? `${student.first_name} ${student.last_name}` : "Unknown",
              student_id: student?.id,
            };
          })
        );
      }
    } catch (err) {
      console.error("Load feed error:", err);
    } finally {
      setLoadingFeed(false);
    }
  }

  async function loadHistory(studentId: string) {
    setLoadingHistory(true);
    try {
      const { data: logs } = await supabase
        .from("behavior_logs")
        .select("*")
        .eq("student_id", studentId)
        .eq("teacher_id", teacherId)
        .order("date", { ascending: false });

      if (logs) {
        setHistory(
          logs.map((l: { id: string; type: string | null; description: string; date: string; shared_with_parent: boolean; shared_at: string | null; created_at: string }) => ({
            id: l.id,
            type: l.type,
            description: l.description,
            date: l.date,
            shared_with_parent: l.shared_with_parent,
            shared_at: l.shared_at,
            created_at: l.created_at,
          }))
        );

        const stars = logs.filter(l => l.type === "star").length;
        const warnings = logs.filter(l => l.type === "warning").length;
        const incidents = logs.filter(l => l.type === "incident").length;
        setStats({ stars, warnings, incidents });
      }
    } catch (err) {
      console.error("Load history error:", err);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleSubmitLog() {
    if (!selectedStudentId) {
      toast.error("Please select a student");
      return;
    }
    if (!logDescription.trim()) {
      toast.error("Description is required");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("behavior_logs").insert({
        student_id: selectedStudentId,
        teacher_id: teacherId,
        type: logType,
        description: logDescription.trim(),
        date: logDate,
      });

      if (error) throw error;

      toast.success("Behavior logged successfully");
      setShowLogForm(false);
      setLogDescription("");
      setLogType("star");
      setLogDate(new Date().toISOString().split("T")[0]);

      await loadHistory(selectedStudentId);
      if (teacherId) {
        const { data: assignments } = await supabase
          .from("teacher_subject_assignments")
          .select("class_id")
          .eq("teacher_id", teacherId);
        const classIds = [...new Set((assignments || []).map((a: { class_id: string }) => a.class_id))];
        await loadRecentFeed(teacherId, classIds);
      }
    } catch (err) {
      console.error("Log error:", err);
      toast.error("Failed to log behavior");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleShareWithParent(logId: string, currentlyShared: boolean) {
    try {
      const { error } = await supabase
        .from("behavior_logs")
        .update({
          shared_with_parent: !currentlyShared,
          shared_at: !currentlyShared ? new Date().toISOString() : null,
        })
        .eq("id", logId);

      if (error) throw error;

      toast.success(currentlyShared ? "No longer shared with parent" : "Shared with parent");
      if (selectedStudentId) await loadHistory(selectedStudentId);
    } catch (err) {
      console.error("Share error:", err);
      toast.error("Failed to update sharing status");
    }
  }

  const typeIcon = (type: string | null) => {
    switch (type) {
      case "star": return <Sparkles className="h-4 w-4 text-yellow-500" />;
      case "warning": return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "incident": return <MessageSquareWarning className="h-4 w-4 text-red-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const typeBadgeVariant = (type: string | null): "success" | "warning" | "danger" | "default" => {
    switch (type) {
      case "star": return "success";
      case "warning": return "warning";
      case "incident": return "danger";
      default: return "default";
    }
  };

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
          <p className="text-sm text-muted-foreground">Loading behavior page...</p>
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Behavior</h1>
          <p className="text-sm text-muted-foreground">Track stars, warnings, and incidents</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Student selector and log form */}
        <div className="lg:col-span-1 space-y-4">
          {/* Student selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select Student</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="max-h-[300px] overflow-y-auto space-y-1">
                {filteredStudents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No students found
                  </p>
                ) : (
                  filteredStudents.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStudentId(s.id)}
                      className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${
                        selectedStudentId === s.id
                          ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                          : "hover:bg-gray-100 text-gray-700"
                      }`}
                    >
                      <span className="font-medium">{s.first_name} {s.last_name}</span>
                      {s.class_name && (
                        <span className="text-xs text-muted-foreground ml-1">({s.class_name})</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Student stats when selected */}
          {selectedStudentId && (
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 bg-yellow-50 rounded-lg">
                    <p className="text-lg font-bold text-yellow-600">{stats.stars}</p>
                    <p className="text-xs text-yellow-500">Stars</p>
                  </div>
                  <div className="text-center p-2 bg-orange-50 rounded-lg">
                    <p className="text-lg font-bold text-orange-600">{stats.warnings}</p>
                    <p className="text-xs text-orange-500">Warnings</p>
                  </div>
                  <div className="text-center p-2 bg-red-50 rounded-lg">
                    <p className="text-lg font-bold text-red-600">{stats.incidents}</p>
                    <p className="text-xs text-red-500">Incidents</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Log form button */}
          {selectedStudentId && (
            <Button
              onClick={() => setShowLogForm(!showLogForm)}
              className="w-full"
              variant={showLogForm ? "outline" : "default"}
            >
              <Plus className="h-4 w-4 mr-2" />
              {showLogForm ? "Cancel" : "Log Behavior"}
            </Button>
          )}

          {/* Log form */}
          {showLogForm && selectedStudentId && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">New Behavior Entry</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <div className="flex gap-2">
                    {[
                      { value: "star", label: "Star", icon: Sparkles, color: "text-yellow-500" },
                      { value: "warning", label: "Warning", icon: AlertTriangle, color: "text-orange-500" },
                      { value: "incident", label: "Incident", icon: MessageSquareWarning, color: "text-red-500" },
                    ].map(opt => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setLogType(opt.value)}
                          className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border text-xs font-medium transition-colors ${
                            logType === opt.value
                              ? "bg-blue-50 border-blue-200 text-blue-700"
                              : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          <Icon className={`h-5 w-5 ${opt.color}`} />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={logDate}
                    onChange={e => setLogDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Describe what happened..."
                    value={logDescription}
                    onChange={e => setLogDescription(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleSubmitLog}
                  disabled={submitting}
                  className="w-full"
                >
                  {submitting ? "Logging..." : "Submit Entry"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: History and recent feed */}
        <div className="lg:col-span-2 space-y-4">
          {/* Behavior history for selected student */}
          {selectedStudentId && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-5 w-5 text-gray-500" />
                  Behavior History
                </CardTitle>
                <CardDescription>
                  {students.find(s => s.id === selectedStudentId)?.first_name}{" "}
                  {students.find(s => s.id === selectedStudentId)?.last_name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingHistory ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-6">
                    <AlertTriangle className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No behavior records for this student</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {history.map(log => (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="mt-0.5">{typeIcon(log.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant={typeBadgeVariant(log.type)} className="text-xs capitalize">
                              {log.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(log.date).toLocaleDateString("en-GH")}
                            </span>
                          </div>
                          <p className="text-sm mt-1">{log.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs"
                              onClick={() => toggleShareWithParent(log.id, log.shared_with_parent)}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              {log.shared_with_parent ? "Shared" : "Share with parent"}
                            </Button>
                            {log.shared_with_parent && (
                              <Badge variant="success" className="text-xs">Shared</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recent behavior feed */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-gray-500" />
                Recent Entries
              </CardTitle>
              <CardDescription>Latest behavior logs across all students</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingFeed ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : recentFeed.length === 0 ? (
                <div className="text-center py-6">
                  <Star className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No behavior logs yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select a student and log their first behavior entry
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentFeed.map(log => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="mt-0.5">{typeIcon(log.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-900">{log.student_name}</span>
                          <Badge variant={typeBadgeVariant(log.type)} className="text-xs capitalize">
                            {log.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.date).toLocaleDateString("en-GH")}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{log.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
