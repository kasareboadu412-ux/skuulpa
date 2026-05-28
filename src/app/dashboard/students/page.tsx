"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Edit,
  X,
  Eye,
  ChevronLeft,
} from "lucide-react";

interface ClassRow {
  id: string;
  name: string;
}

interface Student {
  id: string;
  admission_number: string | null;
  first_name: string;
  last_name: string;
  class_id: string | null;
  parent_primary_phone: string;
  parent_secondary_phone: string | null;
  parent_email: string | null;
  dob: string | null;
  enrollment_date: string | null;
  status: "active" | "transferred" | "graduated" | "withdrawn";
  class?: ClassRow | null;
}

interface StudentDetail extends Student {
  fee_assignments?: Array<{
    id: string;
    amount_after_discount: number;
    fee_structure?: { name: string; category: string } | null;
    term?: { name: string } | null;
    fee_payments?: { amount_paid: number; status: string }[];
  }>;
  attendance?: Array<{ date: string; status: string }>;
  grades?: Array<{
    score: number | null;
    assessment?: { name: string; max_score: number; type: string | null; subject_id?: string } | null;
  }>;
}

function FeeStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "success" | "warning" | "danger" }> = {
    paid: { label: "Paid", variant: "success" },
    partial: { label: "Partial", variant: "warning" },
    overdue: { label: "Outstanding", variant: "danger" },
  };
  const s = map[status] || { label: status, variant: "warning" as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active") return <Badge variant="success">Active</Badge>;
  if (status === "graduated") return <Badge variant="info">Graduated</Badge>;
  if (status === "withdrawn") return <Badge variant="danger">Withdrawn</Badge>;
  if (status === "transferred") return <Badge variant="secondary">Transferred</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

function StudentForm({
  open,
  onClose,
  onSaved,
  editStudent,
  classes,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editStudent: Student | null;
  classes: ClassRow[];
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [classId, setClassId] = useState("");
  const [phone, setPhone] = useState("");
  const [secondaryPhone, setSecondaryPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFirstName(editStudent?.first_name ?? "");
      setLastName(editStudent?.last_name ?? "");
      setAdmissionNumber(editStudent?.admission_number ?? "");
      setClassId(editStudent?.class_id ?? "");
      setPhone(editStudent?.parent_primary_phone ?? "");
      setSecondaryPhone(editStudent?.parent_secondary_phone ?? "");
      setEmail(editStudent?.parent_email ?? "");
      setDob(editStudent?.dob ?? "");
    }
  }, [open, editStudent]);

  if (!open) return null;

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      toast.error("First name, last name, and parent phone are required");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        parent_primary_phone: phone.trim().replace(/\s+/g, ""),
        parent_secondary_phone: secondaryPhone.trim() ? secondaryPhone.trim().replace(/\s+/g, "") : null,
        parent_email: email.trim() || null,
        class_id: classId || null,
        admission_number: admissionNumber.trim() || null,
        dob: dob || null,
      };
      const url = editStudent ? `/api/students/${editStudent.id}` : "/api/students";
      const res = await fetch(url, {
        method: editStudent ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save student");
        return;
      }
      toast.success(editStudent ? "Student updated" : "Student added");
      onSaved();
      onClose();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{editStudent ? "Edit Student" : "Add New Student"}</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
          <CardDescription>
            {editStudent ? "Update student details" : "Register a new student"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="s-first-name">First Name *</Label>
              <Input id="s-first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-last-name">Last Name *</Label>
              <Input id="s-last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="s-admission">Admission Number</Label>
              <Input id="s-admission" value={admissionNumber} onChange={(e) => setAdmissionNumber(e.target.value)} placeholder="auto if blank" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-dob">Date of Birth</Label>
              <Input id="s-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-class">Class</Label>
            <Select value={classId || "none"} onValueChange={(v) => setClassId(v === "none" ? "" : v)}>
              <SelectTrigger id="s-class"><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-phone">Parent Primary Phone *</Label>
            <Input id="s-phone" placeholder="0244 123 456" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-phone2">Parent Secondary Phone</Label>
            <Input id="s-phone2" placeholder="optional" value={secondaryPhone} onChange={(e) => setSecondaryPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-email">Parent Email</Label>
            <Input id="s-email" type="email" placeholder="parent@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : editStudent ? "Update Student" : "Add Student"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function StudentDetailView({
  student,
  onBack,
}: {
  student: Student;
  onBack: () => void;
}) {
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "fees" | "attendance" | "academics">("profile");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/students/${student.id}`);
        const data = await res.json();
        if (res.ok) setDetail(data.data);
      } catch {
        toast.error("Failed to load student details");
      }
    })();
  }, [student.id]);

  const feeSummary = useMemo(() => {
    let total = 0, paid = 0;
    for (const fa of detail?.fee_assignments ?? []) {
      total += Number(fa.amount_after_discount ?? 0);
      paid += (fa.fee_payments ?? [])
        .filter((p) => p.status === "confirmed")
        .reduce((s, p) => s + Number(p.amount_paid), 0);
    }
    const balance = Math.max(0, total - paid);
    const status: "paid" | "partial" | "overdue" =
      balance <= 0 ? "paid" : paid > 0 ? "partial" : "overdue";
    return { total, paid, balance, status };
  }, [detail]);

  const attendanceStats = useMemo(() => {
    const records = detail?.attendance ?? [];
    const total = records.length;
    const present = records.filter((r) => r.status === "present" || r.status === "late").length;
    const absent = records.filter((r) => r.status === "absent").length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, rate };
  }, [detail]);

  const tabs = [
    { key: "profile", label: "Profile" },
    { key: "fees", label: "Fees" },
    { key: "attendance", label: "Attendance" },
    { key: "academics", label: "Academics" },
  ] as const;

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
        <ChevronLeft className="h-4 w-4" /> Back to students
      </button>

      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
          <span className="text-xl font-bold text-blue-700">
            {student.first_name[0]}{student.last_name[0]}
          </span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{student.first_name} {student.last_name}</h2>
          <p className="text-sm text-gray-500">
            {student.class?.name ?? "Unassigned"} · {student.admission_number ?? "no admission #"}
          </p>
        </div>
        <div className="ml-auto"><StatusBadge status={student.status} /></div>
      </div>

      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "profile" && (
        <Card>
          <CardHeader><CardTitle>Student Information</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><dt className="text-xs text-gray-500">Admission Number</dt><dd className="text-sm font-medium">{student.admission_number ?? "—"}</dd></div>
              <div><dt className="text-xs text-gray-500">Full Name</dt><dd className="text-sm font-medium">{student.first_name} {student.last_name}</dd></div>
              <div><dt className="text-xs text-gray-500">Date of Birth</dt><dd className="text-sm font-medium">{student.dob ? formatDate(student.dob) : "—"}</dd></div>
              <div><dt className="text-xs text-gray-500">Class</dt><dd className="text-sm font-medium">{student.class?.name ?? "Unassigned"}</dd></div>
              <div><dt className="text-xs text-gray-500">Enrollment Date</dt><dd className="text-sm font-medium">{student.enrollment_date ? formatDate(student.enrollment_date) : "—"}</dd></div>
              <div><dt className="text-xs text-gray-500">Parent Phone</dt><dd className="text-sm font-medium">{student.parent_primary_phone}</dd></div>
              <div><dt className="text-xs text-gray-500">Secondary Phone</dt><dd className="text-sm font-medium">{student.parent_secondary_phone ?? "—"}</dd></div>
              <div><dt className="text-xs text-gray-500">Parent Email</dt><dd className="text-sm font-medium">{student.parent_email ?? "—"}</dd></div>
            </dl>
          </CardContent>
        </Card>
      )}

      {activeTab === "fees" && (
        <Card>
          <CardHeader><CardTitle>Fee Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="rounded-lg border p-3"><p className="text-xs text-gray-500">Total Fee</p><p className="text-lg font-bold">{formatCurrency(feeSummary.total)}</p></div>
              <div className="rounded-lg border p-3"><p className="text-xs text-gray-500">Paid</p><p className="text-lg font-bold text-green-600">{formatCurrency(feeSummary.paid)}</p></div>
              <div className="rounded-lg border p-3"><p className="text-xs text-gray-500">Balance</p><p className="text-lg font-bold text-red-600">{formatCurrency(feeSummary.balance)}</p></div>
            </div>
            <FeeStatusBadge status={feeSummary.status} />
            {detail?.fee_assignments && detail.fee_assignments.length > 0 && (
              <table className="w-full text-sm mt-6">
                <thead><tr className="border-b text-left text-gray-500"><th className="pb-2 font-medium">Fee</th><th className="pb-2 font-medium">Term</th><th className="pb-2 font-medium">Amount</th><th className="pb-2 font-medium">Paid</th></tr></thead>
                <tbody>
                  {detail.fee_assignments.map((fa) => {
                    const paid = (fa.fee_payments ?? []).filter((p) => p.status === "confirmed").reduce((s, p) => s + Number(p.amount_paid), 0);
                    return (
                      <tr key={fa.id} className="border-b last:border-0">
                        <td className="py-2">{fa.fee_structure?.name ?? "—"}</td>
                        <td className="py-2">{fa.term?.name ?? "—"}</td>
                        <td className="py-2">{formatCurrency(Number(fa.amount_after_discount))}</td>
                        <td className="py-2">{formatCurrency(paid)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "attendance" && (
        <Card>
          <CardHeader><CardTitle>Attendance Records</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="rounded-lg border p-3"><p className="text-xs text-gray-500">Rate</p><p className="text-lg font-bold">{attendanceStats.rate}%</p></div>
              <div className="rounded-lg border p-3"><p className="text-xs text-gray-500">Present</p><p className="text-lg font-bold text-green-600">{attendanceStats.present}</p></div>
              <div className="rounded-lg border p-3"><p className="text-xs text-gray-500">Absent</p><p className="text-lg font-bold text-red-600">{attendanceStats.absent}</p></div>
            </div>
            {detail?.attendance && detail.attendance.length > 0 ? (
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-gray-500"><th className="pb-2 font-medium">Date</th><th className="pb-2 font-medium">Status</th></tr></thead>
                <tbody>
                  {detail.attendance.slice(0, 30).map((r, i) => (
                    <tr key={i} className="border-b last:border-0"><td className="py-2">{formatDate(r.date)}</td><td className="py-2 capitalize">{r.status}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-gray-500">No attendance recorded yet.</p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "academics" && (
        <Card>
          <CardHeader><CardTitle>Assessment Scores</CardTitle></CardHeader>
          <CardContent>
            {detail?.grades && detail.grades.length > 0 ? (
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-gray-500"><th className="pb-2 font-medium">Assessment</th><th className="pb-2 font-medium">Type</th><th className="pb-2 font-medium">Score</th></tr></thead>
                <tbody>
                  {detail.grades.map((g, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2">{g.assessment?.name ?? "—"}</td>
                      <td className="py-2 capitalize">{g.assessment?.type ?? "—"}</td>
                      <td className="py-2 font-semibold">{g.score ?? "—"} / {g.assessment?.max_score ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-gray-500">No assessment scores recorded yet.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function StudentsPage() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, cRes] = await Promise.all([
        fetch("/api/students"),
        fetch("/api/classes"),
      ]);
      const [sData, cData] = await Promise.all([sRes.json(), cRes.json()]);
      if (sRes.ok) setStudents(sData.data ?? []);
      if (cRes.ok) setClasses((cData.data ?? []).map((c: ClassRow) => ({ id: c.id, name: c.name })));
    } catch {
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const filtered = students.filter((s) => {
    const q = searchQuery.toLowerCase();
    const name = `${s.first_name} ${s.last_name}`.toLowerCase();
    const matchesSearch = !q || name.includes(q) || (s.admission_number ?? "").toLowerCase().includes(q) || s.parent_primary_phone.includes(q);
    const matchesClass = classFilter === "all" || s.class_id === classFilter;
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesClass && matchesStatus;
  });

  if (selectedStudent) {
    return <StudentDetailView student={selectedStudent} onBack={() => setSelectedStudent(null)} />;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-full bg-gray-100 rounded animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  const activeCount = students.filter((s) => s.status === "active").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Management</h1>
          <p className="text-sm text-gray-500 mt-1">{activeCount} active students</p>
        </div>
        <Button onClick={() => { setEditStudent(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1" />
          Add Student
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search by name, admission #, or phone..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Classes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="graduated">Graduated</SelectItem>
                <SelectItem value="withdrawn">Withdrawn</SelectItem>
                <SelectItem value="transferred">Transferred</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500 bg-gray-50">
                  <th className="p-4 font-medium">Admission #</th>
                  <th className="p-4 font-medium">Student Name</th>
                  <th className="p-4 font-medium">Class</th>
                  <th className="p-4 font-medium">Parent Phone</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedStudent(s)}>
                    <td className="p-4 text-gray-600 font-mono text-xs">{s.admission_number ?? "—"}</td>
                    <td className="p-4 font-medium text-gray-900">{s.first_name} {s.last_name}</td>
                    <td className="p-4 text-gray-600">{s.class?.name ?? "Unassigned"}</td>
                    <td className="p-4 text-gray-600">{s.parent_primary_phone}</td>
                    <td className="p-4"><StatusBadge status={s.status} /></td>
                    <td className="p-4">
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedStudent(s)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => { setEditStudent(s); setShowForm(true); }}><Edit className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="text-center text-gray-500 py-8">No students match your filters.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <StudentForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditStudent(null); }}
        onSaved={() => void loadAll()}
        editStudent={editStudent}
        classes={classes}
      />
    </div>
  );
}
