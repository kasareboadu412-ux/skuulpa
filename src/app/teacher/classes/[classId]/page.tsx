"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Users, BookOpen, ClipboardCheck, FileSpreadsheet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string | null;
  parent_primary_phone: string;
}

interface Assessment {
  id: string;
  name: string;
  type: string | null;
  max_score: number;
  date: string | null;
}

export default function ClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.classId as string;

  const [className, setClassName] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, sRes, aRes] = await Promise.all([
        fetch(`/api/classes`),
        fetch(`/api/students?class_id=${classId}&status=active`),
        fetch(`/api/academics/assessments?class_id=${classId}`),
      ]);
      const [cJson, sJson, aJson] = await Promise.all([cRes.json(), sRes.json(), aRes.json()]);
      if (cRes.ok) {
        const cls = (cJson.data ?? []).find((c: { id: string }) => c.id === classId);
        setClassName(cls?.name ?? "Class");
      }
      if (sRes.ok) setStudents(sJson.data ?? []);
      if (aRes.ok) setAssessments(aJson.data ?? []);
    } catch {
      toast.error("Failed to load class");
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return <div className="p-6 space-y-4"><div className="h-8 bg-gray-200 rounded w-48 animate-pulse" /><div className="h-64 bg-gray-100 rounded-xl animate-pulse" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
        <ChevronLeft className="h-4 w-4" /> Back
      </button>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">{className}</h1>
        <p className="text-sm text-gray-500 mt-1">{students.length} active students · {assessments.length} assessments</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Link href="/teacher/attendance"><Button variant="outline" className="w-full justify-start"><ClipboardCheck className="h-4 w-4 mr-2" />Take Attendance</Button></Link>
        <Link href="/teacher/assessments"><Button variant="outline" className="w-full justify-start"><FileSpreadsheet className="h-4 w-4 mr-2" />Assessments</Button></Link>
        <Link href="/teacher/homework"><Button variant="outline" className="w-full justify-start"><BookOpen className="h-4 w-4 mr-2" />Homework</Button></Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Students</CardTitle>
            <CardDescription>{students.length} active</CardDescription>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No students in this class.</p>
            ) : (
              <div className="space-y-1">
                {students.map((s) => (
                  <div key={s.id} className="flex items-center justify-between border-b last:border-0 py-2">
                    <div>
                      <p className="text-sm font-medium">{s.first_name} {s.last_name}</p>
                      <p className="text-xs text-gray-500">{s.admission_number ?? "—"} · {s.parent_primary_phone}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" />Recent Assessments</CardTitle>
            <CardDescription>{assessments.length} total</CardDescription>
          </CardHeader>
          <CardContent>
            {assessments.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No assessments yet.</p>
            ) : (
              <div className="space-y-2">
                {assessments.slice(0, 10).map((a) => (
                  <div key={a.id} className="flex items-center justify-between border-b last:border-0 py-2">
                    <div>
                      <p className="text-sm font-medium">{a.name}</p>
                      <p className="text-xs text-gray-500">{a.date ?? "—"} · Max {a.max_score}</p>
                    </div>
                    <Badge variant="secondary">{a.type ?? "—"}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
