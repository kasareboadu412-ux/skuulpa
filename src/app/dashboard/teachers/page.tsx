"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { Search, Plus, MoreHorizontal } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  employee_id: string | null;
  status: "active" | "suspended" | "terminated";
  created_at: string;
  classes?: Array<{ id: string; name: string }>;
  teacher_subject_assignments?: Array<{ subject?: { name: string } | null }>;
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addForm, setAddForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    employee_id: "",
  });

  const loadTeachers = useCallback(async () => {
    try {
      const res = await fetch("/api/teachers");
      const data = await res.json();
      if (res.ok) setTeachers(data.data ?? []);
      else toast.error(data.error || "Failed to load teachers");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadTeachers(); }, [loadTeachers]);

  const handleAdd = async () => {
    if (!addForm.first_name.trim() || !addForm.last_name.trim() || !addForm.phone.trim()) {
      toast.error("First name, last name, and phone are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: addForm.first_name.trim(),
          last_name: addForm.last_name.trim(),
          phone: addForm.phone.trim().replace(/\s+/g, ""),
          email: addForm.email.trim() || null,
          employee_id: addForm.employee_id.trim() || null,
          status: "active",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to add teacher");
        return;
      }
      toast.success("Teacher added");
      setShowAddDialog(false);
      setAddForm({ first_name: "", last_name: "", phone: "", email: "", employee_id: "" });
      void loadTeachers();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const filtered = teachers.filter((t) =>
    `${t.first_name} ${t.last_name} ${t.phone} ${t.employee_id ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-8 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    );
  }

  const activeCount = teachers.filter((t) => t.status === "active").length;
  const subjectCount = new Set(
    teachers.flatMap((t) => (t.teacher_subject_assignments ?? []).map((tsa) => tsa.subject?.name).filter(Boolean))
  ).size;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Teachers</h1>
          <p className="text-gray-500 mt-1">Manage teaching staff, attendance, and performance</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Teacher</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Teacher</DialogTitle>
              <DialogDescription>Enter the teacher&apos;s details to add them to the system</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input value={addForm.first_name} onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input value={addForm.last_name} onChange={(e) => setAddForm({ ...addForm, last_name: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input type="tel" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Employee ID</Label>
                <Input value={addForm.employee_id} onChange={(e) => setAddForm({ ...addForm, employee_id: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleAdd} disabled={saving}>{saving ? "Adding..." : "Add Teacher"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <Input placeholder="Search teachers..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Total Teachers</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{teachers.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Active</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-green-600">{activeCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Subjects Taught</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{subjectCount}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">All Teachers ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Classes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">No teachers yet. Click &ldquo;Add Teacher&rdquo; to get started.</TableCell>
                </TableRow>
              ) : (
                filtered.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-700">
                          {teacher.first_name[0]}{teacher.last_name[0]}
                        </div>
                        {teacher.first_name} {teacher.last_name}
                      </div>
                    </TableCell>
                    <TableCell>{teacher.employee_id ?? "—"}</TableCell>
                    <TableCell>{teacher.phone}</TableCell>
                    <TableCell>{teacher.email ?? "—"}</TableCell>
                    <TableCell>{(teacher.classes ?? []).map((c) => c.name).join(", ") || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={teacher.status === "active" ? "success" : teacher.status === "suspended" ? "warning" : "danger"}>
                        {teacher.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(teacher.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
