"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GraduationCap, Users, BookOpen, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface ClassSummary {
  id: string;
  name: string;
  student_count: number;
  subjects: string[];
}

interface TeacherMe {
  teacher: { id: string; first_name: string };
  owned_classes: Array<{ id: string; name: string; students?: Array<{ count: number }> }>;
  subject_assignments: Array<{ class_id: string; subject_id: string; class?: { id: string; name: string } | null; subject?: { id: string; name: string; code: string | null } | null }>;
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/teachers/me");
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || "Failed to load");
          return;
        }
        const me: TeacherMe = json.data;

        // Merge owned classes + classes from subject assignments
        const map = new Map<string, ClassSummary>();
        for (const c of me.owned_classes) {
          map.set(c.id, {
            id: c.id,
            name: c.name,
            student_count: c.students?.[0]?.count ?? 0,
            subjects: [],
          });
        }
        for (const a of me.subject_assignments) {
          if (!a.class || !a.subject) continue;
          if (!map.has(a.class.id)) {
            map.set(a.class.id, {
              id: a.class.id,
              name: a.class.name,
              student_count: 0,
              subjects: [],
            });
          }
          map.get(a.class.id)!.subjects.push(a.subject.name);
        }
        setClasses(Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)));
      } catch {
        toast.error("Network error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (<div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Card><CardContent className="py-12 text-center text-gray-500">{error}</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Classes</h1>
        <p className="text-sm text-gray-500 mt-1">Classes you teach or are responsible for</p>
      </div>

      {classes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 mb-1">No classes assigned yet</p>
            <p className="text-sm text-gray-500">Ask your school admin to assign you as form teacher or to subjects.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <GraduationCap className="h-5 w-5 text-blue-600" />
                  {c.name}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 text-xs">
                  <Users className="h-3 w-3" /> {c.student_count} student{c.student_count === 1 ? "" : "s"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {c.subjects.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {c.subjects.map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs"><BookOpen className="h-3 w-3 mr-1" />{s}</Badge>
                    ))}
                  </div>
                )}
                <Link href={`/teacher/classes/${c.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    View Class <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
