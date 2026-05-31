"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { BookOpen, FileText, ChevronDown, ChevronRight, Users, CalendarDays } from "lucide-react";

interface ClassRow { id: string; name: string }
interface TermRow { id: string; name: string; is_current?: boolean | null }
interface SubjectRow { id: string; name: string }

interface LessonNote {
  id: string;
  date: string;
  topic: string;
  content: string | null;
}

interface Scheme {
  id: string;
  title: string | null;
  week_number: number | null;
  topics_covered: string | null;
  objectives: string | null;
  status: string | null;
  subject?: SubjectRow | null;
  teacher?: { id: string; first_name: string; last_name: string } | null;
  notes: LessonNote[];
}

function SchemeCard({ scheme }: { scheme: Scheme }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-4 p-4 text-left cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0"
          style={{ background: "hsl(150 30% 95%)" }}>
          <span className="text-xs font-bold" style={{ color: "hsl(150 80% 24%)" }}>
            W{scheme.week_number ?? "?"}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">
            {scheme.title ?? `Week ${scheme.week_number}`}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {scheme.subject?.name ?? "—"}
            {scheme.teacher && ` · ${scheme.teacher.first_name} ${scheme.teacher.last_name}`}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Badge variant={scheme.status === "published" ? "success" : "secondary"} className="text-xs">
            {scheme.status ?? "draft"}
          </Badge>
          <span className="text-xs text-gray-400">{scheme.notes.length} lesson{scheme.notes.length !== 1 ? "s" : ""}</span>
          {open ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100">
          {/* Scheme details */}
          {(scheme.topics_covered || scheme.objectives) && (
            <div className="px-4 py-3 bg-gray-50 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {scheme.topics_covered && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Topics</p>
                  <p className="text-sm text-gray-700">{scheme.topics_covered}</p>
                </div>
              )}
              {scheme.objectives && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Objectives</p>
                  <p className="text-sm text-gray-700">{scheme.objectives}</p>
                </div>
              )}
            </div>
          )}

          {/* Lesson notes */}
          {scheme.notes.length === 0 ? (
            <p className="px-4 py-4 text-sm text-gray-400 text-center">No lesson notes logged yet for this week.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {scheme.notes.map((note) => (
                <div key={note.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full flex-shrink-0 mt-0.5"
                      style={{ background: "hsl(38 100% 92%)" }}>
                      <FileText className="h-3.5 w-3.5" style={{ color: "hsl(38 80% 40%)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-gray-900">{note.topic}</p>
                        <span className="text-xs text-gray-400">{formatDate(note.date)}</span>
                      </div>
                      {note.content && (
                        <p className="text-sm text-gray-600 leading-relaxed">{note.content}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [terms, setTerms] = useState<TermRow[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSchemes, setLoadingSchemes] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [cRes, tRes] = await Promise.all([
          fetch("/api/classes"),
          fetch("/api/terms"),
        ]);
        const [cData, tData] = await Promise.all([cRes.json(), tRes.json()]);
        if (cRes.ok) setClasses((cData.data ?? []).map((c: ClassRow) => ({ id: c.id, name: c.name })));
        if (tRes.ok) {
          const ts: TermRow[] = tData.data ?? [];
          setTerms(ts);
          const current = ts.find((t) => t.is_current);
          if (current) setSelectedTerm(current.id);
        }
      } catch {
        toast.error("Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadSchemes = useCallback(async () => {
    if (!selectedClass) return;
    setLoadingSchemes(true);
    try {
      const params = new URLSearchParams({ class_id: selectedClass });
      if (selectedTerm) params.set("term_id", selectedTerm);
      const [schRes, noteRes] = await Promise.all([
        fetch(`/api/academics/schemes?${params}`),
        fetch(`/api/academics/lesson-notes?${params}`),
      ]);
      const [schData, noteData] = await Promise.all([schRes.json(), noteRes.json()]);

      const notesByScheme = new Map<string, LessonNote[]>();
      for (const n of (noteData.data ?? []) as Array<{ id: string; date: string; topic: string; content: string | null; scheme_of_work_id: string }>) {
        const arr = notesByScheme.get(n.scheme_of_work_id) ?? [];
        arr.push({ id: n.id, date: n.date, topic: n.topic, content: n.content });
        notesByScheme.set(n.scheme_of_work_id, arr);
      }

      const parsed = ((schData.data ?? []) as Array<{
        id: string; title: string | null; week_number: number | null;
        topics_covered: string | null; objectives: string | null; status: string | null;
        subject?: SubjectRow | null;
        teacher?: { id: string; first_name: string; last_name: string } | null;
      }>).map((s) => ({
        ...s,
        notes: notesByScheme.get(s.id) ?? [],
      }));

      setSchemes(parsed);
    } catch {
      toast.error("Failed to load lessons");
    } finally {
      setLoadingSchemes(false);
    }
  }, [selectedClass, selectedTerm]);

  useEffect(() => { void loadSchemes(); }, [loadSchemes]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  const totalNotes = schemes.reduce((s, sc) => s + sc.notes.length, 0);

  // Group by subject
  const bySubject = new Map<string, { name: string; schemes: Scheme[] }>();
  for (const s of schemes) {
    const key = s.subject?.id ?? "other";
    const name = s.subject?.name ?? "No Subject";
    if (!bySubject.has(key)) bySubject.set(key, { name, schemes: [] });
    bySubject.get(key)!.schemes.push(s);
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Class Lessons
        </h1>
        <p className="text-sm text-gray-500 mt-1">See what each class is learning — schemes and daily lesson notes from teachers.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500">Class</p>
          <Select value={selectedClass || "none"} onValueChange={(v) => setSelectedClass(v === "none" ? "" : v)}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select a class" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Select class —</SelectItem>
              {classes.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500">Term</p>
          <Select value={selectedTerm || "all"} onValueChange={(v) => setSelectedTerm(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All terms" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All terms</SelectItem>
              {terms.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}{t.is_current ? " (current)" : ""}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats row */}
      {selectedClass && !loadingSchemes && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: BookOpen, label: "Schemes", value: schemes.length, color: "hsl(150 80% 24%)" },
            { icon: FileText, label: "Lesson Notes", value: totalNotes, color: "hsl(38 92% 50%)" },
            { icon: CalendarDays, label: "Published", value: schemes.filter((s) => s.status === "published").length, color: "hsl(210 80% 50%)" },
          ].map(({ icon: Icon, label, value, color }) => (
            <Card key={label} className="stat-card">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${color}18` }}>
                  <Icon className="h-4.5 w-4.5" style={{ color }} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Content */}
      {!selectedClass ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Select a class above to see its lessons</p>
          </CardContent>
        </Card>
      ) : loadingSchemes ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : schemes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No schemes of work yet for this class</p>
            <p className="text-xs text-gray-400 mt-1">Teachers create schemes from the Teacher Portal.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Array.from(bySubject.entries()).map(([subjectId, { name, schemes: subSchemes }]) => (
            <div key={subjectId}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <div className="h-px flex-1 bg-gray-200" />
                {name}
                <div className="h-px flex-1 bg-gray-200" />
              </h2>
              <div className="space-y-2">
                {subSchemes.sort((a, b) => (a.week_number ?? 0) - (b.week_number ?? 0)).map((scheme) => (
                  <SchemeCard key={scheme.id} scheme={scheme} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
