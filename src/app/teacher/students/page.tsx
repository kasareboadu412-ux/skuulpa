"use client";

import { useEffect, useState } from "react";
import { Users, Search, Phone, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string | null;
  parent_primary_phone: string;
  parent_email: string | null;
  status: string;
  class?: { id: string; name: string } | null;
}

interface TeacherMe {
  owned_classes: Array<{ id: string; name: string }>;
  subject_assignments: Array<{ class?: { id: string; name: string } | null }>;
}

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const meRes = await fetch("/api/teachers/me");
        const meJson = await meRes.json();
        if (!meRes.ok) { setError(meJson.error || "Failed to load"); return; }
        const me: TeacherMe = meJson.data;

        const classIds = new Set<string>();
        me.owned_classes.forEach((c) => classIds.add(c.id));
        me.subject_assignments.forEach((a) => { if (a.class) classIds.add(a.class.id); });

        if (classIds.size === 0) {
          setStudents([]);
          return;
        }

        // Fetch all students once, filter client-side to the teacher's classes
        const sRes = await fetch("/api/students?status=active");
        const sJson = await sRes.json();
        if (!sRes.ok) { setError(sJson.error || "Failed to load students"); return; }
        const all: Student[] = sJson.data ?? [];
        setStudents(all.filter((s) => s.class && classIds.has(s.class.id)));
      } catch {
        toast.error("Network error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    return !q || `${s.first_name} ${s.last_name}`.toLowerCase().includes(q)
      || (s.admission_number ?? "").toLowerCase().includes(q)
      || s.parent_primary_phone.includes(q);
  });

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return <div className="p-8"><Card><CardContent className="py-12 text-center text-gray-500">{error}</CardContent></Card></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Students</h1>
        <p className="text-sm text-gray-500 mt-1">Students in classes you teach</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <Input placeholder="Search by name, admission #, or phone..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{students.length === 0 ? "No students in your classes yet." : "No students match your search."}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <Card key={s.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{s.first_name} {s.last_name}</CardTitle>
                    <CardDescription className="text-xs">{s.class?.name ?? "—"} · {s.admission_number ?? "no admission #"}</CardDescription>
                  </div>
                  <Badge variant={s.status === "active" ? "success" : "secondary"}>{s.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="h-3 w-3" />
                  {s.parent_primary_phone}
                </div>
                {s.parent_email && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{s.parent_email}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
