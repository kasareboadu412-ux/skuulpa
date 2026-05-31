"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileSpreadsheet, Plus, X, ChevronRight, Camera, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
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
interface Term { id: string; name: string; is_current?: boolean }

interface Assessment {
  id: string;
  name: string;
  type: string | null;
  max_score: number;
  date: string | null;
  class?: ClassOption | null;
  subject?: SubjectOption | null;
  term?: Term | null;
  assessment_scores?: Array<{ count: number }>;
}

interface Student { id: string; first_name: string; last_name: string; admission_number?: string | null }

interface Score { student_id: string; score: number | null }

export default function TeacherAssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "test",
    class_id: "",
    subject_id: "",
    term_id: "",
    max_score: "100",
    date: new Date().toISOString().split("T")[0],
  });

  // Score-entry modal state
  const [scoreModal, setScoreModal] = useState<{ open: boolean; assessment: Assessment | null }>({ open: false, assessment: null });
  const [scoreTab, setScoreTab] = useState<"manual" | "scan">("manual");
  const [roster, setRoster] = useState<Student[]>([]);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [savingScores, setSavingScores] = useState(false);

  // Scan tab state
  const [scanImage, setScanImage] = useState<File | null>(null);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<Array<{ student_id: string; score: number | null; matched_name: string }> | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      const [aRes, tRes] = await Promise.all([
        fetch("/api/academics/assessments"),
        fetch("/api/terms"),
      ]);
      const [aJson, tJson] = await Promise.all([aRes.json(), tRes.json()]);
      if (aRes.ok) {
        // Filter to assessments for the teacher's classes
        const all = (aJson.data ?? []) as Assessment[];
        setAssessments(all.filter((a) => a.class && classMap.has(a.class.id)));
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
    if (!form.name.trim() || !form.class_id || !form.max_score) {
      toast.error("Name, class, and max score are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/academics/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          type: form.type,
          class_id: form.class_id,
          subject_id: form.subject_id || null,
          term_id: form.term_id || null,
          max_score: Number(form.max_score),
          date: form.date || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to create"); return; }
      toast.success("Assessment created");
      setShowCreate(false);
      setForm({ ...form, name: "", date: new Date().toISOString().split("T")[0] });
      void load();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const openScoreEntry = async (assessment: Assessment) => {
    if (!assessment.class) return;
    setScoreTab("manual");
    setScanImage(null); setScanPreview(null); setScanResults(null); setScanError(null);
    setScoreModal({ open: true, assessment });
    try {
      const [sRes, scoreRes] = await Promise.all([
        fetch(`/api/students?class_id=${assessment.class.id}&status=active`),
        fetch(`/api/academics/scores?assessment_id=${assessment.id}`),
      ]);
      const [sJson, scoreJson] = await Promise.all([sRes.json(), scoreRes.json()]);
      setRoster(sJson.data ?? []);
      const existing: Record<string, string> = {};
      for (const s of (scoreJson.data ?? []) as Score[]) {
        if (s.score !== null) existing[s.student_id] = String(s.score);
      }
      setScores(existing);
    } catch {
      toast.error("Failed to load roster");
    }
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanImage(file);
    setScanResults(null);
    setScanError(null);
    const reader = new FileReader();
    reader.onload = (ev) => setScanPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!scanImage || !scoreModal.assessment) return;
    setScanning(true);
    setScanError(null);
    try {
      const fd = new FormData();
      fd.append("image", scanImage);
      fd.append("roster", JSON.stringify(roster.map((s) => ({
        id: s.id,
        first_name: s.first_name,
        last_name: s.last_name,
        admission_number: (s as Student & { admission_number?: string | null }).admission_number ?? null,
      }))));
      fd.append("max_score", String(scoreModal.assessment.max_score));
      fd.append("assessment_name", scoreModal.assessment.name);

      const res = await fetch("/api/academics/scores/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setScanError(data.error || "Scan failed"); return; }
      setScanResults(data.scores ?? []);
      // Pre-fill manual scores so teacher can review/edit before saving.
      const merged = { ...scores };
      for (const r of data.scores ?? []) {
        if (r.score !== null) merged[r.student_id] = String(r.score);
      }
      setScores(merged);
    } catch {
      setScanError("Network error. Please try again.");
    } finally {
      setScanning(false);
    }
  };

  const handleSaveScores = async () => {
    if (!scoreModal.assessment) return;
    setSavingScores(true);
    try {
      const scoresArray = Object.entries(scores)
        .filter(([_, v]) => v !== "")
        .map(([student_id, v]) => ({ student_id, score: Number(v) }));
      const res = await fetch("/api/academics/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessment_id: scoreModal.assessment.id, scores: scoresArray }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to save"); return; }
      toast.success(`Saved ${data.count ?? 0} scores`);
      setScoreModal({ open: false, assessment: null });
      void load();
    } catch {
      toast.error("Network error");
    } finally {
      setSavingScores(false);
    }
  };

  if (loading) {
    return <div className="p-6 space-y-4"><div className="h-8 bg-gray-200 rounded w-48 animate-pulse" /><div className="h-64 bg-gray-100 rounded-xl animate-pulse" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assessments</h1>
          <p className="text-sm text-gray-500 mt-1">Create tests and enter student scores</p>
        </div>
        <Button onClick={() => setShowCreate(true)} disabled={classes.length === 0}>
          <Plus className="h-4 w-4 mr-2" />New Assessment
        </Button>
      </div>

      {assessments.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><FileSpreadsheet className="h-12 w-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No assessments yet.</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {assessments.map((a) => (
            <Card key={a.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{a.name}</p>
                      <Badge variant="secondary">{a.type ?? "—"}</Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      {a.class?.name ?? "—"}{a.subject ? ` · ${a.subject.name}` : ""} · Max {a.max_score}
                      {a.date ? ` · ${formatDate(a.date)}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{a.assessment_scores?.[0]?.count ?? 0} scores</p>
                    <Button variant="ghost" size="sm" onClick={() => openScoreEntry(a)}>
                      Enter Scores <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>New Assessment</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowCreate(false)}><X className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Midterm Exam" /></div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="test">Test</SelectItem>
                    <SelectItem value="exam">Exam</SelectItem>
                    <SelectItem value="homework">Homework</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              <div className="space-y-2">
                <Label>Term</Label>
                <Select value={form.term_id} onValueChange={(v) => setForm({ ...form, term_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
                  <SelectContent>{terms.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Max Score</Label><Input type="number" value={form.max_score} onChange={(e) => setForm({ ...form, max_score: e.target.value })} /></div>
                <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving}>{saving ? "Creating..." : "Create"}</Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {scoreModal.open && scoreModal.assessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{scoreModal.assessment.name}</CardTitle>
                  <CardDescription>Max score: {scoreModal.assessment.max_score}</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setScoreModal({ open: false, assessment: null })}><X className="h-4 w-4" /></Button>
              </div>
              {/* Manual / Scan toggle */}
              <div className="flex rounded-lg border p-1 bg-muted/50 mt-2 w-fit gap-1">
                <button
                  type="button"
                  onClick={() => setScoreTab("manual")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${scoreTab === "manual" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Enter Manually
                </button>
                <button
                  type="button"
                  onClick={() => setScoreTab("scan")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${scoreTab === "scan" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Camera className="h-3.5 w-3.5" />
                  Scan Score Sheet
                </button>
              </div>
            </CardHeader>

            <CardContent>
              {scoreTab === "manual" ? (
                <div className="space-y-2">
                  {roster.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">No students in this class.</p>
                  ) : roster.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-2 border-b pb-2">
                      <p className="text-sm">{s.first_name} {s.last_name}</p>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          max={scoreModal.assessment?.max_score}
                          value={scores[s.id] ?? ""}
                          onChange={(e) => setScores({ ...scores, [s.id]: e.target.value })}
                          className="w-24"
                        />
                        <span className="text-xs text-gray-500">/ {scoreModal.assessment?.max_score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Take a clear photo of your handwritten score sheet. Scores will be extracted automatically — you can review and correct them before saving.
                  </p>

                  {/* Image picker */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleImagePick}
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                      <Camera className="h-4 w-4 mr-1" />
                      {scanImage ? "Change Photo" : "Take / Upload Photo"}
                    </Button>
                    {scanImage && !scanning && (
                      <Button onClick={handleScan} disabled={scanning}>
                        {scanning ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Scanning...</> : "Extract Scores"}
                      </Button>
                    )}
                    {scanning && (
                      <Button disabled>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />Scanning...
                      </Button>
                    )}
                  </div>

                  {/* Preview */}
                  {scanPreview && (
                    <img src={scanPreview} alt="Score sheet preview" className="rounded-lg border max-h-48 object-contain w-full" />
                  )}

                  {/* Error */}
                  {scanError && (
                    <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      {scanError}
                    </div>
                  )}

                  {/* Results review */}
                  {scanResults !== null && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                        <CheckCircle2 className="h-4 w-4" />
                        {scanResults.length} scores detected — review and edit below, then Save Scores.
                      </div>
                      <div className="space-y-2">
                        {roster.map((s) => {
                          const hit = scanResults.find((r) => r.student_id === s.id);
                          return (
                            <div key={s.id} className={`flex items-center justify-between gap-2 border-b pb-2 ${hit ? "" : "opacity-50"}`}>
                              <div>
                                <p className="text-sm">{s.first_name} {s.last_name}</p>
                                {hit?.matched_name && hit.matched_name.toLowerCase() !== `${s.first_name} ${s.last_name}`.toLowerCase() && (
                                  <p className="text-xs text-gray-400">Read as: {hit.matched_name}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min="0"
                                  max={scoreModal.assessment?.max_score}
                                  value={scores[s.id] ?? ""}
                                  onChange={(e) => setScores({ ...scores, [s.id]: e.target.value })}
                                  className={`w-24 ${hit && scores[s.id] ? "border-green-400" : ""}`}
                                  placeholder="—"
                                />
                                <span className="text-xs text-gray-500">/ {scoreModal.assessment?.max_score}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>

            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setScoreModal({ open: false, assessment: null })} disabled={savingScores}>Cancel</Button>
              <Button onClick={handleSaveScores} disabled={savingScores || roster.length === 0}>
                {savingScores ? "Saving..." : "Save Scores"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
