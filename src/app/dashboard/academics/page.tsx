"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { BookOpen, FileText, BarChart3, Printer, Wand2, Loader2 } from "lucide-react";
import { printReportCard, type ReportCardData } from "./print-report";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Scheme {
  id: string;
  title?: string | null;
  week_number: number | null;
  status: string | null;
  class?: { id: string; name: string } | null;
  subject?: { id: string; name: string } | null;
  term?: { id: string; name: string } | null;
  lesson_notes?: Array<{ count: number }>;
}

interface Assessment {
  id: string;
  name: string;
  type: string | null;
  max_score: number;
  date: string | null;
  class?: { id: string; name: string } | null;
  subject?: { id: string; name: string } | null;
  term?: { id: string; name: string } | null;
  assessment_scores?: Array<{ count: number }>;
}

interface ReportCard {
  id: string;
  generated_at: string;
  overall_position: number | null;
  average_score: number | null;
  teacher_comments: string | null;
  headteacher_remarks: string | null;
  data: ReportCardData | null;
  student?: { id: string; first_name: string; last_name: string; class?: { name: string } | null } | null;
  term?: { id: string; name: string; academic_year?: { name: string } | null } | null;
}

interface ClassOption { id: string; name: string }
interface TermOption { id: string; name: string; is_current?: boolean | null }

export default function AcademicsPage() {
  const [activeTab, setActiveTab] = useState("schemes");
  const [loading, setLoading] = useState(true);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [schoolName, setSchoolName] = useState("");

  // Bulk-generation controls
  const [genClass, setGenClass] = useState("");
  const [genTerm, setGenTerm] = useState("");
  const [generating, setGenerating] = useState(false);

  const loadReportCards = useCallback(async () => {
    try {
      const res = await fetch("/api/academics/report-cards");
      const json = await res.json();
      if (res.ok) setReportCards(json.data ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [sRes, aRes, rRes, cRes, tRes, schoolRes] = await Promise.all([
          fetch("/api/academics/schemes"),
          fetch("/api/academics/assessments"),
          fetch("/api/academics/report-cards"),
          fetch("/api/classes"),
          fetch("/api/terms"),
          fetch("/api/schools/me"),
        ]);
        const [sData, aData, rData, cData, tData, schoolData] = await Promise.all([
          sRes.json(), aRes.json(), rRes.json(), cRes.json(), tRes.json(), schoolRes.json(),
        ]);
        if (sRes.ok) setSchemes(sData.data ?? []);
        if (aRes.ok) setAssessments(aData.data ?? []);
        if (rRes.ok) setReportCards(rData.data ?? []);
        if (cRes.ok) setClasses((cData.data ?? []).map((c: ClassOption) => ({ id: c.id, name: c.name })));
        if (tRes.ok) {
          const ts: TermOption[] = tData.data ?? [];
          setTerms(ts);
          const current = ts.find((t) => t.is_current);
          if (current) setGenTerm(current.id);
        }
        if (schoolRes.ok) setSchoolName(schoolData.data?.name ?? "");
      } catch {
        toast.error("Failed to load academics");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleGenerate = async () => {
    if (!genClass || !genTerm) { toast.error("Pick a class and a term"); return; }
    setGenerating(true);
    try {
      const res = await fetch("/api/academics/report-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class_id: genClass, term_id: genTerm }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Failed to generate report cards"); return; }
      toast.success(`Generated ${json.count ?? 0} report card(s)`);
      await loadReportCards();
    } catch {
      toast.error("Network error");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    );
  }

  const totalScores = assessments.reduce((s, a) => s + (a.assessment_scores?.[0]?.count ?? 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Academics</h1>
          <p className="text-gray-500 mt-1">Manage curriculum, assessments, and report cards</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="schemes"><BookOpen className="w-4 h-4 mr-2" />Schemes of Work</TabsTrigger>
          <TabsTrigger value="assessments"><BarChart3 className="w-4 h-4 mr-2" />Assessments</TabsTrigger>
          <TabsTrigger value="report-cards"><FileText className="w-4 h-4 mr-2" />Report Cards</TabsTrigger>
        </TabsList>

        <TabsContent value="schemes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Schemes of Work</CardTitle>
              <CardDescription>Termly teaching plans organized by subject and week</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Week</TableHead>
                    <TableHead>Lessons</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schemes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No schemes of work yet. Teachers can create them from the teacher portal.
                      </TableCell>
                    </TableRow>
                  ) : schemes.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.title ?? `Week ${s.week_number ?? "—"}`}</TableCell>
                      <TableCell>{s.class?.name ?? "—"}</TableCell>
                      <TableCell>{s.subject?.name ?? "—"}</TableCell>
                      <TableCell>{s.term?.name ?? "—"}</TableCell>
                      <TableCell>{s.week_number ?? "—"}</TableCell>
                      <TableCell>{s.lesson_notes?.[0]?.count ?? 0}</TableCell>
                      <TableCell><Badge variant={s.status === "completed" ? "success" : "secondary"}>{s.status ?? "draft"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assessments" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-lg">Total Assessments</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{assessments.length}</p><p className="text-sm text-gray-500">This term</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-lg">Scores Entered</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{totalScores}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-lg">Report Cards</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{reportCards.length}</p><p className="text-sm text-gray-500">Generated</p></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Assessments</CardTitle>
              <CardDescription>Quizzes, tests, homework, projects, and exams</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Max Score</TableHead>
                    <TableHead>Scores</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assessments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No assessments yet for this term. Teachers can create them from the teacher portal.
                      </TableCell>
                    </TableRow>
                  ) : assessments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell><Badge variant="secondary">{a.type ?? "—"}</Badge></TableCell>
                      <TableCell>{a.class?.name ?? "—"}</TableCell>
                      <TableCell>{a.subject?.name ?? "—"}</TableCell>
                      <TableCell>{a.date ? formatDate(a.date) : "—"}</TableCell>
                      <TableCell>{a.max_score}</TableCell>
                      <TableCell>{a.assessment_scores?.[0]?.count ?? 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report-cards" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generate Report Cards</CardTitle>
              <CardDescription>
                Pick a class and term to generate end-of-term reports for the whole class at once.
                Scores are weighted (continuous assessment vs exam) and students ranked by position.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Class</label>
                  <Select value={genClass} onValueChange={setGenClass}>
                    <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Term</label>
                  <Select value={genTerm} onValueChange={setGenTerm}>
                    <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select term" /></SelectTrigger>
                    <SelectContent>
                      {terms.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}{t.is_current ? " (current)" : ""}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleGenerate} disabled={generating}>
                  {generating ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Generating...</> : <><Wand2 className="w-4 h-4 mr-1" />Generate for Class</>}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generated Report Cards</CardTitle>
              <CardDescription>Ghana-format report cards with scores and class position</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Average</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead className="text-right">Report</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportCards.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">No report cards generated yet</TableCell>
                    </TableRow>
                  ) : reportCards.map((rc) => (
                    <TableRow key={rc.id}>
                      <TableCell className="font-medium">{rc.student ? `${rc.student.first_name} ${rc.student.last_name}` : "—"}</TableCell>
                      <TableCell>{rc.student?.class?.name ?? "—"}</TableCell>
                      <TableCell>{rc.term?.name ?? "—"}</TableCell>
                      <TableCell>{rc.average_score !== null ? `${rc.average_score}%` : "—"}</TableCell>
                      <TableCell>{rc.overall_position ?? "—"}</TableCell>
                      <TableCell>{formatDate(rc.generated_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!rc.data}
                          onClick={() => rc.data && printReportCard(rc.data, {
                            schoolName,
                            className: rc.student?.class?.name ?? "",
                            generatedAt: rc.generated_at,
                            teacherComments: rc.teacher_comments,
                            headteacherRemarks: rc.headteacher_remarks,
                          })}
                        >
                          <Printer className="w-4 h-4 mr-1" />Print
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
