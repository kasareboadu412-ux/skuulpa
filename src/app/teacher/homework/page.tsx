"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, Plus, X, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface ClassOption { id: string; name: string }
interface SubjectOption { id: string; name: string }

interface Homework {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  created_at: string;
  class?: ClassOption | null;
  subject?: SubjectOption | null;
  homework_views?: Array<{ count: number }>;
}

interface TeacherMe {
  teacher: { id: string };
  owned_classes: Array<ClassOption>;
  subject_assignments: Array<{ class?: ClassOption | null; subject?: SubjectOption | null }>;
}

export default function TeacherHomeworkPage() {
  const [homework, setHomework] = useState<Homework[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [teacherId, setTeacherId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    class_id: "",
    subject_id: "",
    due_date: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const meRes = await fetch("/api/teachers/me");
      const meJson = await meRes.json();
      if (!meRes.ok) { toast.error(meJson.error || "Failed"); return; }
      const me: TeacherMe = meJson.data;
      setTeacherId(me.teacher.id);

      const classMap = new Map<string, ClassOption>();
      const subjectMap = new Map<string, SubjectOption>();
      me.owned_classes.forEach((c) => classMap.set(c.id, c));
      me.subject_assignments.forEach((a) => {
        if (a.class) classMap.set(a.class.id, a.class);
        if (a.subject) subjectMap.set(a.subject.id, a.subject);
      });
      setClasses(Array.from(classMap.values()));
      setSubjects(Array.from(subjectMap.values()));

      const hRes = await fetch(`/api/homework?teacher_id=${me.teacher.id}`);
      const hJson = await hRes.json();
      if (hRes.ok) setHomework(hJson.data ?? []);
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.class_id) {
      toast.error("Title and class are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/homework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          class_id: form.class_id,
          subject_id: form.subject_id || null,
          teacher_id: teacherId,
          due_date: form.due_date || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to create homework"); return; }
      toast.success("Homework assigned");
      setShowDialog(false);
      setForm({ title: "", description: "", class_id: "", subject_id: "", due_date: "" });
      void load();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 space-y-4"><div className="h-8 bg-gray-200 rounded w-48 animate-pulse" /><div className="h-64 bg-gray-100 rounded-xl animate-pulse" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Homework</h1>
          <p className="text-sm text-gray-500 mt-1">Assign and track homework</p>
        </div>
        <Button onClick={() => setShowDialog(true)} disabled={classes.length === 0}>
          <Plus className="h-4 w-4 mr-2" />Assign Homework
        </Button>
      </div>

      {homework.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No homework assigned yet.</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {homework.map((h) => (
            <Card key={h.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{h.title}</CardTitle>
                    <CardDescription className="text-xs">
                      {h.class?.name ?? "—"}{h.subject ? ` · ${h.subject.name}` : ""}
                    </CardDescription>
                  </div>
                  {h.due_date && <Badge variant="warning"><Calendar className="h-3 w-3 mr-1" />{formatDate(h.due_date)}</Badge>}
                </div>
              </CardHeader>
              {h.description && <CardContent><p className="text-sm text-gray-600">{h.description}</p></CardContent>}
              <CardFooter className="text-xs text-gray-500">
                Views: {h.homework_views?.[0]?.count ?? 0} · Assigned {formatDate(h.created_at)}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Assign Homework</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowDialog(false)}><X className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Algebra Chapter 5 exercises" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              {subjects.length > 0 && (
                <div className="space-y-2">
                  <Label>Subject (optional)</Label>
                  <Select value={form.subject_id || "none"} onValueChange={(v) => setForm({ ...form, subject_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No subject</SelectItem>
                      {subjects.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving}>{saving ? "Saving..." : "Assign"}</Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
