"use client";

import { useState, useEffect } from "react";
import {
  BookText,
  Plus,
  Save,
  Eye,
  EyeOff,
  AlertCircle,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Link2,
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

interface Scheme {
  id: string;
  title: string;
  week_number: number | null;
  topics_covered: string | null;
  objectives: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  class_name?: string;
  subject_name?: string;
  term_name?: string;
  lesson_notes_count: number;
}

interface LessonNote {
  id: string;
  date: string;
  topic: string;
  content: string | null;
}

export default function SchemesPage() {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingScheme, setEditingScheme] = useState<Scheme | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSchemeId, setExpandedSchemeId] = useState<string | null>(null);
  const [lessonNotes, setLessonNotes] = useState<LessonNote[]>([]);
  const [showLessonForm, setShowLessonForm] = useState(false);

  // Create/Edit form
  const [form, setForm] = useState({
    title: "",
    week_number: "",
    topics_covered: "",
    objectives: "",
    status: "draft" as string,
    class_id: "",
    subject_id: "",
    term_id: "",
  });
  const [saving, setSaving] = useState(false);

  // Lesson note form
  const [lessonForm, setLessonForm] = useState({
    date: new Date().toISOString().split("T")[0],
    topic: "",
    content: "",
  });
  const [savingLesson, setSavingLesson] = useState(false);

  // Lookups
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [terms, setTerms] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: teacher } = await supabase
        .from("teachers")
        .select("id, school_id")
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

        // Load current term
        const { data: yearData } = await supabase
          .from("academic_years")
          .select("id")
          .eq("school_id", teacher.school_id)
          .eq("is_current", true)
          .single();

        if (yearData) {
          const { data: termData } = await supabase
            .from("terms")
            .select("id, name")
            .eq("academic_year_id", yearData.id)
            .eq("is_current", true);

          if (termData) setTerms(termData);
        }

        // Get all subjects taught
        const { data: allSubjects } = await supabase
          .from("teacher_subject_assignments")
          .select("subject_id, subjects!inner(id, name)")
          .eq("teacher_id", teacher.id);

        const subjectMap = new Map<string, { id: string; name: string }>();
        if (allSubjects) {
          allSubjects.forEach((a: { subjects: unknown }) => {
            const subj = a.subjects as { id: string; name: string };
            if (subj && !subjectMap.has(subj.id)) subjectMap.set(subj.id, subj);
          });
        }
        setSubjects(Array.from(subjectMap.values()));

        await loadSchemes(teacher.id);
      }
    } catch (err) {
      console.error("Load error:", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  async function loadSchemes(tId: string) {
    try {
      const { data: schemesData } = await supabase
        .from("schemes_of_work")
        .select("*, classes!inner(name), subjects!inner(name), terms!inner(name)")
        .eq("teacher_id", tId)
        .order("week_number", { ascending: true, nullsFirst: false });

      if (!schemesData) {
        setSchemes([]);
        return;
      }

      // Get lesson note counts
      const schemeIds = schemesData.map(s => s.id);
      const { data: notes } = await supabase
        .from("lesson_notes")
        .select("scheme_of_work_id")
        .in("scheme_of_work_id", schemeIds);

      const noteCounts: Record<string, number> = {};
      if (notes) {
        notes.forEach(n => {
          noteCounts[n.scheme_of_work_id] = (noteCounts[n.scheme_of_work_id] || 0) + 1;
        });
      }

      const enriched: Scheme[] = schemesData.map(s => ({
        id: s.id,
        title: s.title,
        week_number: s.week_number,
        topics_covered: s.topics_covered,
        objectives: s.objectives,
        status: s.status,
        created_at: s.created_at,
        updated_at: s.updated_at,
        class_name: (s.classes as unknown as { name: string })?.name || "Unknown",
        subject_name: (s.subjects as unknown as { name: string })?.name || "Unknown",
        term_name: (s.terms as unknown as { name: string })?.name || "Unknown",
        lesson_notes_count: noteCounts[s.id] || 0,
      }));

      setSchemes(enriched);
    } catch (err) {
      console.error("Load schemes error:", err);
    }
  }

  function resetForm() {
    setForm({
      title: "",
      week_number: "",
      topics_covered: "",
      objectives: "",
      status: "draft",
      class_id: "",
      subject_id: "",
      term_id: "",
    });
    setEditingScheme(null);
  }

  function startEdit(scheme: Scheme) {
    setEditingScheme(scheme);
    setForm({
      title: scheme.title,
      week_number: scheme.week_number?.toString() || "",
      topics_covered: scheme.topics_covered || "",
      objectives: scheme.objectives || "",
      status: scheme.status,
      class_id: "",
      subject_id: "",
      term_id: "",
    });
    setShowCreateForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSave() {
    if (!form.title) {
      toast.error("Title is required");
      return;
    }

    setSaving(true);
    try {
      // Get current term if not specified
      let termId = form.term_id;
      if (!termId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: teacher } = await supabase
            .from("teachers")
            .select("school_id")
            .eq("user_id", user.id)
            .single();
          if (teacher) {
            const { data: yearData } = await supabase
              .from("academic_years")
              .select("id")
              .eq("school_id", teacher.school_id)
              .eq("is_current", true)
              .single();
            if (yearData) {
              const { data: currentTerm } = await supabase
                .from("terms")
                .select("id")
                .eq("academic_year_id", yearData.id)
                .eq("is_current", true)
                .single();
              if (currentTerm) termId = currentTerm.id;
            }
          }
        }
      }

      const payload = {
        title: form.title,
        week_number: form.week_number ? parseInt(form.week_number) : null,
        topics_covered: form.topics_covered || null,
        objectives: form.objectives || null,
        status: form.status,
        teacher_id: teacherId,
        term_id: termId || null,
      };

      if (editingScheme) {
        const { error } = await supabase
          .from("schemes_of_work")
          .update(payload)
          .eq("id", editingScheme.id);
        if (error) throw error;
        toast.success("Scheme updated successfully");
      } else {
        const { error } = await supabase.from("schemes_of_work").insert({
          ...payload,
          class_id: form.class_id,
          subject_id: form.subject_id || null,
        });
        if (error) throw error;
        toast.success("Scheme created successfully");
      }

      setShowCreateForm(false);
      resetForm();
      if (teacherId) await loadSchemes(teacherId);
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to save scheme");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(scheme: Scheme) {
    const newStatus = scheme.status === "published" ? "draft" : "published";
    try {
      const { error } = await supabase
        .from("schemes_of_work")
        .update({ status: newStatus })
        .eq("id", scheme.id);
      if (error) throw error;
      toast.success(`Scheme ${newStatus === "published" ? "published" : "moved to draft"}`);
      if (teacherId) await loadSchemes(teacherId);
    } catch (err) {
      console.error("Toggle status error:", err);
      toast.error("Failed to update status");
    }
  }

  async function expandScheme(schemeId: string) {
    if (expandedSchemeId === schemeId) {
      setExpandedSchemeId(null);
      setLessonNotes([]);
      return;
    }

    setExpandedSchemeId(schemeId);
    try {
      const { data: notes } = await supabase
        .from("lesson_notes")
        .select("id, date, topic, content")
        .eq("scheme_of_work_id", schemeId)
        .order("date", { ascending: false });

      setLessonNotes(notes || []);
    } catch (err) {
      console.error("Load lesson notes error:", err);
    }
  }

  async function handleAddLessonNote(schemeId: string) {
    if (!lessonForm.topic) {
      toast.error("Topic is required");
      return;
    }

    setSavingLesson(true);
    try {
      const { error } = await supabase.from("lesson_notes").insert({
        scheme_of_work_id: schemeId,
        teacher_id: teacherId,
        date: lessonForm.date,
        topic: lessonForm.topic,
        content: lessonForm.content || null,
      });

      if (error) throw error;

      toast.success("Lesson note added");
      setLessonForm({
        date: new Date().toISOString().split("T")[0],
        topic: "",
        content: "",
      });
      setShowLessonForm(false);
      await expandScheme(schemeId);
      if (teacherId) await loadSchemes(teacherId);
    } catch (err) {
      console.error("Save lesson note error:", err);
      toast.error("Failed to add lesson note");
    } finally {
      setSavingLesson(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading schemes of work...</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Schemes of Work</h1>
          <p className="text-sm text-muted-foreground">Plan and manage your teaching schemes</p>
        </div>
        <Button onClick={() => { setShowCreateForm(!showCreateForm); resetForm(); }}>
          <Plus className="h-4 w-4 mr-2" />
          {showCreateForm ? "Cancel" : "New Scheme"}
        </Button>
      </div>

      {/* Create/Edit form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingScheme ? "Edit Scheme" : "Create New Scheme"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Title</Label>
                <Input
                  placeholder="e.g. Mathematics Term 1 Scheme"
                  value={form.title}
                  onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              {!editingScheme && (
                <>
                  <div className="space-y-1.5">
                    <Label>Class</Label>
                    <Select
                      value={form.class_id}
                      onValueChange={v => setForm(prev => ({ ...prev, class_id: v }))}
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
                      value={form.subject_id}
                      onValueChange={v => setForm(prev => ({ ...prev, subject_id: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label>Week Number</Label>
                <Input
                  type="number"
                  placeholder="1"
                  min={1}
                  max={14}
                  value={form.week_number}
                  onChange={e => setForm(prev => ({ ...prev, week_number: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={v => setForm(prev => ({ ...prev, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Topics Covered</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="List the topics covered this week"
                  value={form.topics_covered}
                  onChange={e => setForm(prev => ({ ...prev, topics_covered: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Objectives</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="What students should achieve"
                  value={form.objectives}
                  onChange={e => setForm(prev => ({ ...prev, objectives: e.target.value }))}
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : (editingScheme ? "Update Scheme" : "Create Scheme")}
              </Button>
              <Button variant="outline" onClick={() => { setShowCreateForm(false); resetForm(); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scheme list */}
      <div className="space-y-3">
        {schemes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <BookText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">No schemes of work yet</p>
              <Button onClick={() => { setShowCreateForm(true); resetForm(); }}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first scheme
              </Button>
            </CardContent>
          </Card>
        ) : (
          schemes.map((scheme) => {
            const isExpanded = expandedSchemeId === scheme.id;
            return (
              <Card key={scheme.id}>
                <CardContent className="p-0">
                  {/* Main scheme card */}
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => expandScheme(scheme.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{scheme.title}</h3>
                          <Badge variant={scheme.status === "published" ? "success" : "warning"}>
                            {scheme.status === "published" ? (
                              <><Eye className="h-3 w-3 mr-1" /> Published</>
                            ) : (
                              <><EyeOff className="h-3 w-3 mr-1" /> Draft</>
                            )}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="text-xs">{scheme.class_name}</Badge>
                          <Badge variant="outline" className="text-xs">{scheme.subject_name}</Badge>
                          <span>{scheme.term_name}</span>
                          {scheme.week_number && (
                            <span>Week {scheme.week_number}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {scheme.lesson_notes_count} lesson note{scheme.lesson_notes_count !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); toggleStatus(scheme); }}
                        >
                          {scheme.status === "published" ? "Unpublish" : "Publish"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); startEdit(scheme); }}
                        >
                          Edit
                        </Button>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded: Topics and Lesson Notes */}
                  {isExpanded && (
                    <div className="border-t px-4 py-3 space-y-4">
                      {scheme.topics_covered && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-1">Topics</h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-line">{scheme.topics_covered}</p>
                        </div>
                      )}
                      {scheme.objectives && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-1">Objectives</h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-line">{scheme.objectives}</p>
                        </div>
                      )}

                      {/* Lesson notes */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-700">Daily Lesson Notes</h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowLessonForm(!showLessonForm)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Note
                          </Button>
                        </div>

                        {showLessonForm && (
                          <div className="mb-3 p-3 bg-gray-50 rounded-lg space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Date</Label>
                                <Input
                                  type="date"
                                  value={lessonForm.date}
                                  onChange={e => setLessonForm(prev => ({ ...prev, date: e.target.value }))}
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Topic</Label>
                                <Input
                                  placeholder="Lesson topic"
                                  value={lessonForm.topic}
                                  onChange={e => setLessonForm(prev => ({ ...prev, topic: e.target.value }))}
                                  className="h-8 text-xs"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Content</Label>
                              <textarea
                                className="flex min-h-[60px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm"
                                placeholder="Lesson content..."
                                value={lessonForm.content}
                                onChange={e => setLessonForm(prev => ({ ...prev, content: e.target.value }))}
                              />
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleAddLessonNote(scheme.id)}
                              disabled={savingLesson}
                            >
                              {savingLesson ? "Saving..." : "Save Note"}
                            </Button>
                          </div>
                        )}

                        {lessonNotes.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-3">
                            No lesson notes added yet
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {lessonNotes.map(note => (
                              <div key={note.id} className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                  <CalendarDays className="h-3 w-3" />
                                  <span>{new Date(note.date).toLocaleDateString("en-GH")}</span>
                                </div>
                                <p className="text-sm font-medium">{note.topic}</p>
                                {note.content && (
                                  <p className="text-xs text-muted-foreground mt-1">{note.content}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
