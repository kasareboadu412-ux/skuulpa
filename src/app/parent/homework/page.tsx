"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Download,
  Eye,
  EyeOff,
  Calendar,
  Clock,
  FileText,
  Filter,
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

interface Subject {
  id: string;
  name: string;
  code: string | null;
}

interface HomeworkItem {
  id: string;
  title: string;
  description: string | null;
  attachments: { name?: string; url?: string }[] | string[];
  due_date: string | null;
  created_at: string;
  viewed: boolean;
  subject: { id: string; name: string; code: string | null } | null;
  teacher: { id: string; first_name: string; last_name: string } | null;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
}

export default function HomeworkPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [homework, setHomework] = useState<HomeworkItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectFilter, setSubjectFilter] = useState("all");
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
    async function fetchHomework() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ studentId: selectedStudentId });
        if (subjectFilter !== "all") params.set("subjectId", subjectFilter);

        const res = await fetch(`/api/parent/homework?${params}`);
        if (!res.ok) throw new Error("Failed to load homework");
        const data = await res.json();
        setHomework(data.homework || []);
        setSubjects(data.subjects || []);
      } catch {
        toast.error("Failed to load homework");
      } finally {
        setLoading(false);
      }
    }
    fetchHomework();
  }, [selectedStudentId, subjectFilter]);

  async function markAsSeen(homeworkId: string) {
    try {
      const res = await fetch("/api/parent/homework/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeworkId }),
      });
      if (!res.ok) throw new Error("Failed to mark as seen");
      setHomework((prev) =>
        prev.map((h) => (h.id === homeworkId ? { ...h, viewed: true } : h))
      );
      toast.success("Marked as seen");
    } catch {
      toast.error("Failed to update");
    }
  }

  function getDaysUntilDue(dueDate: string | null): number | null {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const now = new Date();
    const diff = due.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  function getDueDateBadge(days: number | null) {
    if (days === null) return null;
    if (days < 0)
      return <Badge variant="danger">{Math.abs(days)} days overdue</Badge>;
    if (days === 0) return <Badge variant="warning">Due today</Badge>;
    if (days === 1) return <Badge variant="warning">Due tomorrow</Badge>;
    if (days <= 3) return <Badge variant="warning">{days} days left</Badge>;
    return <Badge variant="secondary">{days} days left</Badge>;
  }

  const isAttachmentsArray = (
    attachments: unknown
  ): attachments is { name?: string; url?: string }[] => {
    return Array.isArray(attachments) && attachments.length > 0 && typeof attachments[0] === "object";
  };

  if (loading && homework.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const filteredHomework =
    subjectFilter === "all"
      ? homework
      : homework.filter((h) => h.subject?.id === subjectFilter);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BookOpen className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-lg font-bold">Homework & Assignments</h1>
          {students.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {students.find((s) => s.id === selectedStudentId)?.first_name}{" "}
              {students.find((s) => s.id === selectedStudentId)?.last_name}
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        {students.length > 1 && (
          <Select
            value={selectedStudentId}
            onValueChange={setSelectedStudentId}
          >
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue placeholder="Child" />
            </SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.first_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {subjects.length > 0 && (
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Subjects
              </SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Homework List */}
      {filteredHomework.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            <BookOpen className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            No homework assigned
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredHomework.map((hw) => {
            const daysUntilDue = getDaysUntilDue(hw.due_date);
            return (
              <Card
                key={hw.id}
                className={`${
                  !hw.viewed ? "border-blue-300 bg-blue-50/30" : ""
                }`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">{hw.title}</h3>
                        {!hw.viewed && (
                          <Badge variant="info" className="text-[10px] animate-pulse">
                            New
                          </Badge>
                        )}
                      </div>
                      {hw.subject && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {hw.subject.name}
                          {hw.teacher &&
                            ` · ${hw.teacher.first_name} ${hw.teacher.last_name}`}
                        </p>
                      )}
                    </div>
                    {getDueDateBadge(daysUntilDue)}
                  </div>

                  {hw.description && (
                    <p className="text-sm text-gray-700">{hw.description}</p>
                  )}

                  {/* Attachments */}
                  {hw.attachments && hw.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {(isAttachmentsArray(hw.attachments)
                        ? hw.attachments
                        : []
                      ).map((att, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() =>
                            att.url && window.open(att.url, "_blank")
                          }
                        >
                          <FileText className="h-3 w-3" />
                          {att.name || `Attachment ${i + 1}`}
                        </Button>
                      ))}
                      {typeof hw.attachments[0] === "string" &&
                        (hw.attachments as string[]).map((url, i) => (
                          <Button
                            key={i}
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => window.open(url, "_blank")}
                          >
                            <Download className="h-3 w-3" />
                            File {i + 1}
                          </Button>
                        ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Due: {hw.due_date ? formatDate(hw.due_date) : "No due date"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(hw.created_at)}
                    </span>
                    <Button
                      variant={hw.viewed ? "ghost" : "default"}
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => !hw.viewed && markAsSeen(hw.id)}
                      disabled={hw.viewed}
                    >
                      {hw.viewed ? (
                        <>
                          <EyeOff className="h-3 w-3" /> Seen
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3" /> Mark as Seen
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
