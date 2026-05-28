"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
interface Term { id: string; name: string; is_current?: boolean }

interface Scheme {
  id: string;
  title: string | null;
  week_number: number | null;
  status: string | null;
  objectives: string | null;
  class?: ClassOption | null;
  subject?: SubjectOption | null;
  term?: Term | null;
  lesson_notes?: Array<{ count: number }>;
}

export default function TeacherSchemesPage() {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    class_id: "",
    subject_id: "",
    term_id: "",
    week_number: "1",
    objectives: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const meRes = await fetch("/api/teachers/me");
      const meJson = await meRes.json();
      if (!meRes.ok) { toast.error(meJson.error || "Failed"); return; }
      const me = meJson.data;

      const classMap = new Map<string, ClassOption>();
      const subjectMap = new Map<string, SubjectOption>();
      me.owned_classes.forEach((c: ClassOption) => classMap.set(c.id, c));
      me.subject_assignments.forEach((a: { class?: ClassOption | null; subject?: SubjectOption | null }) => {
        if (a.class) classMap.set(a.class.id, a.class);
        if (a.subject) subjectMap.set(a.subject.id, a.subject);
      });
      setClasses(Array.from(classMap.values()));
      setSubjects(Array.from(subjectMap.values()));

      const [sRes, tRes] = await Promise.all([
        fetch("/api/academics/schemes"),
        fetch("/api/terms"),
      ]);
      const [sJson, tJson] = await Promise.all([sRes.json(), tRes.json()]);
      if (sRes.ok) {
        const all = (sJson.data ?? []) as Scheme[];
        setSchemes(all.filter((s) => s.class && classMap.has(s.class.id)));
      }
      if (tRes.ok) {
        setTerms(tJson.data ?? []);
        const current = (tJson.data ?? []).find((t: Term) => t.is_current);
        if (current) setForm((prev) => ({ ...prev, term_id: current.id }));
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = async () => {
    if (!form.class_id) { toast.error("Class is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/academics/schemes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim() || null,
          class_id: form.class_id,
          subject_id: form.subject_id || null,
          term_id: form.term_id || null,
          week_number: form.week_number ? Number(form.week_number) : null,
          objectives: form.objectives.trim() || null,
          status: "draft",
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to create"); return; }
      toast.success("Scheme created");
      setShowDialog(false);
      setForm({ ...form, title: "", week_number: "1", objectives: "" });
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
          <h1 className="text-2xl font-bold text-gray-900">Schemes of Work</h1>
          <p className="text-sm text-gray-500 mt-1">Weekly teaching plans</p>
        </div>
        <Button onClick={() => setShowDialog(true)} disabled={classes.length === 0}>
          <Plus className="h-4 w-4 mr-2" />New Scheme
        </Button>
      </div>

      {schemes.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No schemes of work yet.</p></CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {schemes.map((s) => (
            <Card key={s.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{s.title ?? `Week ${s.week_number ?? "—"}`}</CardTitle>
                    <CardDescription className="text-xs">{s.class?.name ?? "—"} · {s.subject?.name ?? "—"} · {s.term?.name ?? "—"}</CardDescription>
                  </div>
                  <Badge variant={s.status === "completed" ? "success" : "secondary"}>{s.status ?? "draft"}</Badge>
                </div>
              </CardHeader>
              {s.objectives && (
                <CardContent>
                  <p className="text-sm text-gray-600 line-clamp-3">{s.objectives}</p>
                </CardContent>
              )}
              <CardFooter className="text-xs text-gray-500">
                Week {s.week_number ?? "—"} · {s.lesson_notes?.[0]?.count ?? 0} lesson notes
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
                <CardTitle>New Scheme of Work</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowDialog(false)}><X className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Week 3: Fractions" /></div>
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>{classes.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              {subjects.length > 0 && (
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={form.subject_id || "none"} onValueChange={(v) => setForm({ ...form, subject_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No subject</SelectItem>
                      {subjects.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Term</Label>
                  <Select value={form.term_id} onValueChange={(v) => setForm({ ...form, term_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{terms.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Week #</Label><Input type="number" min="1" max="14" value={form.week_number} onChange={(e) => setForm({ ...form, week_number: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Objectives</Label><Input value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })} placeholder="What will students learn?" /></div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving}>{saving ? "Creating..." : "Create"}</Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
