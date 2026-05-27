"use client";

import { useEffect, useState } from "react";
import {
  ClipboardList,
  Download,
  TrendingUp,
  Star,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
}

interface ReportCard {
  id: string;
  generated_at: string;
  pdf_url: string | null;
  overall_position: number | null;
  total_score: number | null;
  average_score: number | null;
  teacher_comments: string | null;
  headteacher_remarks: string | null;
  data: Record<string, unknown> | null;
  term: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    academic_year: { name: string };
  } | null;
}

interface SubjectScore {
  assessmentName: string;
  type: string | null;
  score: number | null;
  maxScore: number;
  remarks: string | null;
  date: string | null;
}

interface SubjectScores {
  subject: {
    id: string;
    name: string;
    code: string | null;
    is_core: boolean;
  };
  scores: SubjectScore[];
}

function getGrade(percentage: number): { letter: string; color: string } {
  if (percentage >= 80) return { letter: "A", color: "text-green-600 bg-green-100" };
  if (percentage >= 70) return { letter: "B", color: "text-blue-600 bg-blue-100" };
  if (percentage >= 60) return { letter: "C", color: "text-yellow-600 bg-yellow-100" };
  if (percentage >= 50) return { letter: "D", color: "text-orange-600 bg-orange-100" };
  return { letter: "F", color: "text-red-600 bg-red-100" };
}

export default function ResultsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [subjectScores, setSubjectScores] = useState<SubjectScores[]>([]);
  const [selectedTermId, setSelectedTermId] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/parent/students");
        const data = await res.json();
        if (data.students?.length > 0) {
          setStudents(data.students);
          setSelectedStudentId(data.students[0].id);
        }
      } catch {
        toast.error("Failed to load students");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!selectedStudentId) return;
    async function fetchResults() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ studentId: selectedStudentId });
        if (selectedTermId !== "all") params.set("termId", selectedTermId);

        const res = await fetch(`/api/parent/results?${params}`);
        if (!res.ok) throw new Error("Failed to load results");
        const data = await res.json();
        setReportCards(data.reportCards || []);
        setSubjectScores(data.subjectScores || []);
      } catch {
        toast.error("Failed to load results");
      } finally {
        setLoading(false);
      }
    }
    fetchResults();
  }, [selectedStudentId, selectedTermId]);

  const currentReport = reportCards[0];
  const selectedTermValue = selectedTermId;

  // Build unique term list from report cards for the selector
  const terms = reportCards
    .filter((rc) => rc.term)
    .map((rc) => rc.term!)
    .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i);

  if (loading && subjectScores.length === 0 && reportCards.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ClipboardList className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-lg font-bold">Academic Results</h1>
          {students.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {students.find((s) => s.id === selectedStudentId)?.first_name}{" "}
              {students.find((s) => s.id === selectedStudentId)?.last_name}
            </p>
          )}
        </div>
      </div>

      {/* Term Selector */}
      {terms.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Button
            variant={selectedTermValue === "all" ? "default" : "outline"}
            size="sm"
            className="text-xs whitespace-nowrap"
            onClick={() => setSelectedTermId("all")}
          >
            All Terms
          </Button>
          {terms.map((term) => (
            <Button
              key={term.id}
              variant={selectedTermValue === term.id ? "default" : "outline"}
              size="sm"
              className="text-xs whitespace-nowrap"
              onClick={() => setSelectedTermId(term.id)}
            >
              {term.name}
            </Button>
          ))}
        </div>
      )}

      {/* Report Card Summary */}
      {currentReport && (
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium">
                  {currentReport.term?.name} — {currentReport.term?.academic_year?.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Generated {formatDate(currentReport.generated_at)}
                </p>
              </div>
              {currentReport.pdf_url && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => window.open(currentReport.pdf_url!, "_blank")}
                >
                  <Download className="h-4 w-4" />
                  PDF
                </Button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Average</p>
                <p className="text-lg font-bold text-blue-700">
                  {currentReport.average_score?.toFixed(1) ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold text-gray-800">
                  {currentReport.total_score?.toFixed(1) ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Position</p>
                <p className="text-lg font-bold text-purple-700">
                  {currentReport.overall_position
                    ? `${currentReport.overall_position}${getOrdinalSuffix(currentReport.overall_position)}`
                    : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subject Scores */}
      {subjectScores.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            No assessment scores available for this term
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {subjectScores.map((ss) => {
            // Calculate average percentage for the subject
            const totalPct = ss.scores.reduce(
              (acc, s) => acc + (s.score !== null ? (s.score / s.maxScore) * 100 : 0),
              0
            );
            const avgPct =
              ss.scores.length > 0
                ? Math.round(totalPct / ss.scores.length)
                : 0;
            const grade = getGrade(avgPct);

            return (
              <Card key={ss.subject.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm">
                        {ss.subject.name}
                      </CardTitle>
                      {ss.subject.is_core && (
                        <Badge variant="secondary" className="text-[10px]">
                          Core
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {avgPct}%
                      </span>
                      <span
                        className={`inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold ${grade.color}`}
                      >
                        {grade.letter}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {ss.scores.map((score, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-muted-foreground">
                          {score.assessmentName}
                        </span>
                        <span className="font-medium">
                          {score.score !== null
                            ? `${score.score}/${score.maxScore}`
                            : "-"}
                          {score.type && (
                            <Badge
                              variant="outline"
                              className="ml-2 text-[10px]"
                            >
                              {score.type}
                            </Badge>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Teacher Comments & Headteacher Remarks */}
      {currentReport?.teacher_comments && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              Teacher&apos;s Comments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 italic">
              &ldquo;{currentReport.teacher_comments}&rdquo;
            </p>
          </CardContent>
        </Card>
      )}

      {currentReport?.headteacher_remarks && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="h-4 w-4 text-purple-500" />
              Headteacher&apos;s Remarks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 italic">
              &ldquo;{currentReport.headteacher_remarks}&rdquo;
            </p>
          </CardContent>
        </Card>
      )}

      {/* Performance Trend */}
      {reportCards.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Performance Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...reportCards].reverse().map((rc) => (
                <div
                  key={rc.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">
                    {rc.term?.name || "Term"}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">
                      Avg: {rc.average_score?.toFixed(1) ?? "-"}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      Pos: {rc.overall_position ?? "-"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Simple trend indicator using div bars */}
            <div className="flex items-end gap-2 mt-4 h-24">
              {[...reportCards].reverse().map((rc, i) => {
                const height = rc.average_score
                  ? Math.min(rc.average_score, 100)
                  : 0;
                return (
                  <div key={rc.id} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">
                      {rc.average_score?.toFixed(0) ?? "-"}
                    </span>
                    <div
                      className="w-full bg-blue-500 rounded-t transition-all"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-[10px] text-muted-foreground truncate max-w-full">
                      {rc.term?.name?.split(" ")[0] || `T${i + 1}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
