"use client";

import { useCallback, useEffect, useState } from "react";
import { Star, AlertTriangle, AlertCircle, Plus, X } from "lucide-react";
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

type BehaviorType = "star" | "warning" | "incident";

interface BehaviorLog {
  id: string;
  type: BehaviorType;
  title: string | null;
  description: string | null;
  date: string;
  shared_with_parent: boolean;
  student?: { id: string; first_name: string; last_name: string; class?: { name: string } | null } | null;
}

interface Student { id: string; first_name: string; last_name: string }

export default function TeacherBehaviorPage() {
  const [logs, setLogs] = useState<BehaviorLog[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teacherId, setTeacherId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | BehaviorType>("all");
  const [form, setForm] = useState({
    student_id: "",
    type: "star" as BehaviorType,
    title: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    shared_with_parent: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const meRes = await fetch("/api/teachers/me");
      const meJson = await meRes.json();
      if (!meRes.ok) { toast.error(meJson.error || "Failed"); return; }
      const me = meJson.data;
      setTeacherId(me.teacher.id);

      const classIds = new Set<string>();
      me.owned_classes.forEach((c: { id: string }) => classIds.add(c.id));
      me.subject_assignments.forEach((a: { class?: { id: string } | null }) => a.class && classIds.add(a.class.id));

      // Load students in those classes
      const sRes = await fetch(`/api/students?status=active`);
      const sJson = await sRes.json();
      if (sRes.ok) {
        const all = (sJson.data ?? []) as Array<Student & { class?: { id: string } | null }>;
        setStudents(all.filter((s) => s.class && classIds.has(s.class.id)));
      }

      const bRes = await fetch(`/api/behavior?teacher_id=${me.teacher.id}`);
      const bJson = await bRes.json();
      if (bRes.ok) setLogs(bJson.data ?? []);
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = async () => {
    if (!form.student_id) { toast.error("Select a student"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/behavior", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: form.student_id,
          teacher_id: teacherId,
          type: form.type,
          title: form.title.trim() || null,
          description: form.description.trim() || null,
          date: form.date,
          shared_with_parent: form.shared_with_parent,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to log"); return; }
      toast.success("Behavior logged");
      setShowDialog(false);
      setForm({ student_id: "", type: "star", title: "", description: "", date: new Date().toISOString().split("T")[0], shared_with_parent: false });
      void load();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const filtered = filter === "all" ? logs : logs.filter((l) => l.type === filter);

  const Icon = ({ type }: { type: BehaviorType }) => {
    if (type === "star") return <Star className="h-4 w-4 text-green-600" />;
    if (type === "warning") return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <AlertCircle className="h-4 w-4 text-red-600" />;
  };

  if (loading) {
    return <div className="p-6 space-y-4"><div className="h-8 bg-gray-200 rounded w-48 animate-pulse" /><div className="h-64 bg-gray-100 rounded-xl animate-pulse" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Behavior Log</h1>
          <p className="text-sm text-gray-500 mt-1">Record stars, warnings, and incidents for your students</p>
        </div>
        <Button onClick={() => setShowDialog(true)} disabled={students.length === 0}>
          <Plus className="h-4 w-4 mr-2" />Log Behavior
        </Button>
      </div>

      <div className="flex gap-2">
        {(["all", "star", "warning", "incident"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-xs font-medium rounded-full capitalize transition-colors ${
              filter === f ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-gray-500">No behavior logs.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((l) => (
            <Card key={l.id}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Icon type={l.type} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">
                        {l.student ? `${l.student.first_name} ${l.student.last_name}` : "—"}
                        <span className="text-gray-500 font-normal ml-2 text-xs">{l.student?.class?.name ?? ""}</span>
                      </p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <span>{formatDate(l.date)}</span>
                        {l.shared_with_parent && <Badge variant="info" className="ml-1">Shared</Badge>}
                      </div>
                    </div>
                    {l.title && <p className="text-sm font-medium mt-1">{l.title}</p>}
                    {l.description && <p className="text-sm text-gray-600 mt-1">{l.description}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Log Behavior</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowDialog(false)}><X className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Student</Label>
                <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (<SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as BehaviorType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="star">Star (positive)</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="incident">Incident</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Helped a classmate" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.shared_with_parent}
                  onChange={(e) => setForm({ ...form, shared_with_parent: e.target.checked })}
                />
                Share with parent
              </label>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving}>{saving ? "Saving..." : "Log"}</Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
