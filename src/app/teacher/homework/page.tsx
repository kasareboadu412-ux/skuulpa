"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  Plus,
  Save,
  Filter,
  Eye,
  CalendarDays,
  Paperclip,
  AlertCircle,
  Clock,
  CheckCircle2,
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

interface HomeworkItem {
  id: string;
  title: string;
  description: string | null;
  attachments: unknown[];
  due_date: string | null;
  created_at: string;
  class_name?: string;
  subject_name?: string;
  views_count: number;
}

interface FilterState {
  class_id: string;
  subject_id: string;
}

export default function HomeworkPage() {
  const [homeworks, setHomeworks] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [form, setForm] = useState({
    title: "",
    description: "",
    due_date: "",
    class_id: "",
    subject_id: "",
    attachment_links: "",
  });
  const [creating, setCreating] = useState(false);

  // Filter
  const [filter, setFilter] = useState<FilterState>({ class_id: "", subject_id: "" });
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    loadData();
  }, []);

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

        await loadHomeworks(teacher.id);
      }
    } catch (err) {
      console.error("Load error:", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  async function loadHomeworks(tId: string) {
    try {
      let query = supabase
        .from("homework")
        .select("*, classes!inner(name), subjects!inner(name)")
        .eq("teacher_id", tId)
        .order("created_at", { ascending: false });

      if (filter.class_id) {
        query = query.eq("class_id", filter.class_id);
      }
      if (filter.subject_id) {
        query = query.eq("subject_id", filter.subject_id);
      }

      const { data: homeworkData } = await query;
      if (!homeworkData) {
        setHomeworks([]);
        return;
      }

      // Get view counts
      const homeworkIds = homeworkData.map(h => h.id);
      const { data: views } = await supabase
        .from("homework_views")
        .select("homework_id")
        .in("homework_id", homeworkIds);

      const viewCounts: Record<string, number> = {};
      if (views) {
        views.forEach(v => {
          viewCounts[v.homework_id] = (viewCounts[v.homework_id] || 0) + 1;
        });
      }

      const enriched: HomeworkItem[] = homeworkData.map(h => {
        const cls = h.classes as unknown as { name: string };
        const subj = h.subjects as unknown as { name: string } | null;
        return {
          id: h.id,
          title: h.title,
          description: h.description,
          attachments: h.attachments,
          due_date: h.due_date,
          created_at: h.created_at,
          class_name: cls?.name || "Unknown",
          subject_name: subj?.name || "General",
          views_count: viewCounts[h.id] || 0,
        };
      });

      setHomeworks(enriched);
    } catch (err) {
      console.error("Load homeworks error:", err);
    }
  }

  async function handleClassFilterChange(classId: string) {
    setFilter(prev => ({ ...prev, class_id: classId, subject_id: "" }));
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

  async function handleCreateHomework() {
    if (!form.title || !form.class_id) {
      toast.error("Title and class are required");
      return;
    }

    setCreating(true);
    try {
      const attachments = form.attachment_links
        ? form.attachment_links.split("\n").filter(l => l.trim()).map(l => ({ url: l.trim() }))
        : [];

      const { error } = await supabase.from("homework").insert({
        title: form.title,
        description: form.description || null,
        attachments: attachments,
        due_date: form.due_date || null,
        class_id: form.class_id,
        subject_id: form.subject_id || null,
        teacher_id: teacherId,
      });

      if (error) throw error;

      toast.success("Homework posted successfully");
      setShowCreateForm(false);
      setForm({
        title: "",
        description: "",
        due_date: "",
        class_id: "",
        subject_id: "",
        attachment_links: "",
      });

      if (teacherId) {
        // Reset filter to see the new entry
        setFilter({ class_id: "", subject_id: "" });
        await loadHomeworks(teacherId);
      }
    } catch (err) {
      console.error("Create homework error:", err);
      toast.error("Failed to post homework");
    } finally {
      setCreating(false);
    }
  }

  const isExpired = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date(new Date().toISOString().split("T")[0]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading homework...</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Homework</h1>
          <p className="text-sm text-muted-foreground">Post and manage homework assignments</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => { setShowCreateForm(!showCreateForm); }}>
            <Plus className="h-4 w-4 mr-2" />
            {showCreateForm ? "Cancel" : "New Homework"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1">
            <Filter className="h-3 w-3" /> Filter by Class
          </Label>
          <Select
            value={filter.class_id}
            onValueChange={handleClassFilterChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="All classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Classes</SelectItem>
              {classes.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Subject</Label>
          <Select
            value={filter.subject_id}
            onValueChange={v => {
              setFilter(prev => ({ ...prev, subject_id: v }));
              if (teacherId) loadHomeworks(teacherId);
            }}
            disabled={!filter.class_id}
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

      {/* Create form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Post New Homework</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Title</Label>
                <Input
                  placeholder="e.g. Mathematics Worksheet Chapter 5"
                  value={form.title}
                  onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Description</Label>
                <textarea
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Describe the homework assignment..."
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
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
                    <SelectItem value="">General</SelectItem>
                    {subjects.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  <Paperclip className="h-3 w-3" /> Attachment Links
                </Label>
                <textarea
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="One link per line"
                  value={form.attachment_links}
                  onChange={e => setForm(prev => ({ ...prev, attachment_links: e.target.value }))}
                />
              </div>
            </div>
            <div className="mt-4">
              <Button onClick={handleCreateHomework} disabled={creating}>
                {creating ? "Posting..." : "Post Homework"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Homework list */}
      <div className="space-y-3">
        {homeworks.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">No homework posted yet</p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Post your first homework
              </Button>
            </CardContent>
          </Card>
        ) : (
          homeworks.map((hw) => {
            const expired = isExpired(hw.due_date);
            return (
              <Card key={hw.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{hw.title}</h3>
                        {expired ? (
                          <Badge variant="danger" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Expired
                          </Badge>
                        ) : hw.due_date ? (
                          <Badge variant="success" className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="info" className="flex items-center gap-1">
                            Active
                          </Badge>
                        )}
                      </div>
                      {hw.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {hw.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">
                          {hw.class_name}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {hw.subject_name}
                        </Badge>
                        {hw.due_date && (
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            Due: {new Date(hw.due_date).toLocaleDateString("en-GH")}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          {new Date(hw.created_at).toLocaleDateString("en-GH")}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Eye className="h-4 w-4" />
                        <span className="font-medium">{hw.views_count}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Views by parents</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
