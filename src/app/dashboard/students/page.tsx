"use client";

import { useState, useEffect } from "react";
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
  Trash2,
  User,
  Phone,
  BookOpen,
  DollarSign,
  ClipboardCheck,
  AlertTriangle,
  Star,
  X,
  Eye,
  ChevronLeft,
} from "lucide-react";

// ─── Types ───

interface Student {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  className: string;
  parentPhone: string;
  parentEmail: string | null;
  feeStatus: "paid" | "partial" | "overdue";
  attendanceRate: number;
  status: "active" | "transferred" | "graduated" | "withdrawn";
  enrollmentDate: string;
}

// ─── Sample data ───

const sampleStudents: Student[] = [
  { id: "s1", admissionNumber: "SKL/26/0001", firstName: "Adwoa", lastName: "Mensah", className: "JHS 2", parentPhone: "0244123456", parentEmail: "parent@email.com", feeStatus: "paid", attendanceRate: 97, status: "active", enrollmentDate: "2025-09-01" },
  { id: "s2", admissionNumber: "SKL/26/0002", firstName: "Yaw", lastName: "Boateng", className: "Class 4", parentPhone: "0544987654", parentEmail: null, feeStatus: "partial", attendanceRate: 88, status: "active", enrollmentDate: "2024-09-01" },
  { id: "s3", admissionNumber: "SKL/26/0003", firstName: "Akua", lastName: "Serwaa", className: "Class 1", parentPhone: "0204112233", parentEmail: "akua.parent@mail.com", feeStatus: "paid", attendanceRate: 95, status: "active", enrollmentDate: "2026-01-10" },
  { id: "s4", admissionNumber: "SKL/26/0004", firstName: "Kofi", lastName: "Adom", className: "JHS 1", parentPhone: "0266123456", parentEmail: null, feeStatus: "overdue", attendanceRate: 72, status: "active", enrollmentDate: "2023-09-01" },
  { id: "s5", admissionNumber: "SKL/26/0005", firstName: "Esi", lastName: "Nyarko", className: "Nursery 2", parentPhone: "0244789012", parentEmail: "esi.mum@mail.com", feeStatus: "partial", attendanceRate: 91, status: "active", enrollmentDate: "2026-01-15" },
  { id: "s6", admissionNumber: "SKL/26/0006", firstName: "Nana", lastName: "Amoako", className: "Class 3", parentPhone: "0544345678", parentEmail: null, feeStatus: "paid", attendanceRate: 99, status: "active", enrollmentDate: "2025-09-01" },
  { id: "s7", admissionNumber: "SKL/26/0007", firstName: "Afua", lastName: "Donkor", className: "JHS 3", parentPhone: "0204987612", parentEmail: "afua.d@mail.com", feeStatus: "overdue", attendanceRate: 65, status: "active", enrollmentDate: "2022-09-01" },
  { id: "s8", admissionNumber: "SKL/26/0008", firstName: "Kwame", lastName: "Asante", className: "Class 2", parentPhone: "0266543210", parentEmail: null, feeStatus: "paid", attendanceRate: 93, status: "active", enrollmentDate: "2025-09-01" },
  { id: "s9", admissionNumber: "SKL/26/0009", firstName: "Mansa", lastName: "Osei", className: "JHS 2", parentPhone: "0244987612", parentEmail: "mansa.p@mail.com", feeStatus: "paid", attendanceRate: 96, status: "active", enrollmentDate: "2023-09-01" },
  { id: "s10", admissionNumber: "SKL/26/0010", firstName: "Kojo", lastName: "Frimpong", className: "Class 4", parentPhone: "0544112233", parentEmail: null, feeStatus: "partial", attendanceRate: 84, status: "active", enrollmentDate: "2024-09-01" },
  { id: "s11", admissionNumber: "SKL/26/0011", firstName: "Akosua", lastName: "Amponsah", className: "JHS 1", parentPhone: "0204567890", parentEmail: "akosua.a@mail.com", feeStatus: "paid", attendanceRate: 78, status: "active", enrollmentDate: "2023-09-01" },
  { id: "s12", admissionNumber: "SKL/26/0012", firstName: "Kweku", lastName: "Sarpong", className: "Nursery 1", parentPhone: "0266789012", parentEmail: null, feeStatus: "paid", attendanceRate: 100, status: "active", enrollmentDate: "2026-01-20" },
];

function FeeStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "success" | "warning" | "danger" }> = {
    paid: { label: "Paid", variant: "success" },
    partial: { label: "Partial", variant: "warning" },
    overdue: { label: "Overdue", variant: "danger" },
  };
  const s = map[status] || { label: status, variant: "warning" as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active") return <Badge variant="success">Active</Badge>;
  if (status === "graduated") return <Badge variant="info">Graduated</Badge>;
  if (status === "withdrawn") return <Badge variant="danger">Withdrawn</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

// ─── Add/Edit Student Form ───

function StudentForm({
  open,
  onClose,
  editStudent,
}: {
  open: boolean;
  onClose: () => void;
  editStudent: Student | null;
}) {
  const [firstName, setFirstName] = useState(editStudent?.firstName || "");
  const [lastName, setLastName] = useState(editStudent?.lastName || "");
  const [classVal, setClassVal] = useState(editStudent?.className || "");
  const [phone, setPhone] = useState(editStudent?.parentPhone || "");
  const [email, setEmail] = useState(editStudent?.parentEmail || "");

  useEffect(() => {
    if (editStudent) {
      setFirstName(editStudent.firstName);
      setLastName(editStudent.lastName);
      setClassVal(editStudent.className);
      setPhone(editStudent.parentPhone);
      setEmail(editStudent.parentEmail || "");
    }
  }, [editStudent]);

  if (!open) return null;

  const handleSave = () => {
    if (!firstName || !lastName || !phone) {
      toast.error("First name, last name, and parent phone are required");
      return;
    }
    toast.success(editStudent ? "Student updated" : "Student added successfully");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {editStudent ? "Edit Student" : "Add New Student"}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            {editStudent
              ? "Update student details"
              : "Register a new student in the system"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="s-first-name">First Name</Label>
              <Input
                id="s-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-last-name">Last Name</Label>
              <Input
                id="s-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-class">Class</Label>
            <Select value={classVal} onValueChange={setClassVal}>
              <SelectTrigger id="s-class">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Nursery 1">Nursery 1</SelectItem>
                <SelectItem value="Nursery 2">Nursery 2</SelectItem>
                <SelectItem value="Class 1">Class 1</SelectItem>
                <SelectItem value="Class 2">Class 2</SelectItem>
                <SelectItem value="Class 3">Class 3</SelectItem>
                <SelectItem value="Class 4">Class 4</SelectItem>
                <SelectItem value="JHS 1">JHS 1</SelectItem>
                <SelectItem value="JHS 2">JHS 2</SelectItem>
                <SelectItem value="JHS 3">JHS 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-phone">Parent Primary Phone</Label>
            <Input
              id="s-phone"
              placeholder="0244 123 456"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-email">Parent Email (optional)</Label>
            <Input
              id="s-email"
              type="email"
              placeholder="parent@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>
            {editStudent ? "Update Student" : "Add Student"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// ─── Student Detail View ───

function StudentDetailView({
  student,
  onBack,
}: {
  student: Student;
  onBack: () => void;
}) {
  const [activeTab, setActiveTab] = useState<
    "profile" | "fees" | "attendance" | "academics" | "behavior"
  >("profile");

  const tabs = [
    { key: "profile", label: "Profile" },
    { key: "fees", label: "Fees" },
    { key: "attendance", label: "Attendance" },
    { key: "academics", label: "Academics" },
    { key: "behavior", label: "Behavior" },
  ] as const;

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
      >
        <ChevronLeft className="h-4 w-4" /> Back to students
      </button>

      {/* Student header */}
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
          <span className="text-xl font-bold text-blue-700">
            {student.firstName[0]}
            {student.lastName[0]}
          </span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {student.firstName} {student.lastName}
          </h2>
          <p className="text-sm text-gray-500">
            {student.className} · {student.admissionNumber}
          </p>
        </div>
        <div className="ml-auto">
          <StatusBadge status={student.status} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <Card>
          <CardHeader>
            <CardTitle>Student Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-gray-500">Admission Number</dt>
                <dd className="text-sm font-medium">{student.admissionNumber}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Full Name</dt>
                <dd className="text-sm font-medium">
                  {student.firstName} {student.lastName}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Class</dt>
                <dd className="text-sm font-medium">{student.className}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Enrollment Date</dt>
                <dd className="text-sm font-medium">
                  {formatDate(student.enrollmentDate)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Parent Phone</dt>
                <dd className="text-sm font-medium">{student.parentPhone}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Parent Email</dt>
                <dd className="text-sm font-medium">
                  {student.parentEmail || "—"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Fees Tab */}
      {activeTab === "fees" && (
        <Card>
          <CardHeader>
            <CardTitle>Fee Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-gray-500">Total Fee</p>
                <p className="text-lg font-bold">{formatCurrency(3800)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-gray-500">Paid</p>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(3800)}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-gray-500">Balance</p>
                <p className="text-lg font-bold text-red-600">
                  {formatCurrency(0)}
                </p>
              </div>
            </div>
            <FeeStatusBadge status={student.feeStatus} />
          </CardContent>
        </Card>
      )}

      {/* Attendance Tab */}
      {activeTab === "attendance" && (
        <Card>
          <CardHeader>
            <CardTitle>Attendance Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-gray-500">This Term</p>
                <p className="text-lg font-bold">{student.attendanceRate}%</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-gray-500">Present Days</p>
                <p className="text-lg font-bold text-green-600">84</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-gray-500">Absent Days</p>
                <p className="text-lg font-bold text-red-600">6</p>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Last absence: 2 days ago
            </p>
          </CardContent>
        </Card>
      )}

      {/* Academics Tab */}
      {activeTab === "academics" && (
        <Card>
          <CardHeader>
            <CardTitle>Academic Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">Subject</th>
                  <th className="pb-2 font-medium">CA Score</th>
                  <th className="pb-2 font-medium">Exam Score</th>
                  <th className="pb-2 font-medium">Total</th>
                  <th className="pb-2 font-medium">Grade</th>
                </tr>
              </thead>
              <tbody>
                {["English", "Math", "Science", "Social Studies", "ICT"].map((subj) => (
                  <tr key={subj} className="border-b last:border-0">
                    <td className="py-2 font-medium">{subj}</td>
                    <td className="py-2">28/30</td>
                    <td className="py-2">62/70</td>
                    <td className="py-2 font-semibold">90</td>
                    <td className="py-2">
                      <Badge variant="success">A</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Behavior Tab */}
      {activeTab === "behavior" && (
        <Card>
          <CardHeader>
            <CardTitle>Behavior Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg border border-green-100 bg-green-50 p-3">
                <Star className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-900">
                    Star Achievement
                  </p>
                  <p className="text-xs text-green-700">
                    Won class quiz competition · 15 May 2026
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-yellow-100 bg-yellow-50 p-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-900">
                    Warning — Late to class
                  </p>
                  <p className="text-xs text-yellow-700">
                    Arrived 15 min late 3 times this week · Shared with parent
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Main Page ───

export default function StudentsPage() {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const filtered = sampleStudents.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      s.admissionNumber.toLowerCase().includes(q);
    const matchesClass = classFilter === "all" || s.className === classFilter;
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesClass && matchesStatus;
  });

  const classes = [...new Set(sampleStudents.map((s) => s.className))].sort();

  if (selectedStudent) {
    return (
      <StudentDetailView
        student={selectedStudent}
        onBack={() => setSelectedStudent(null)}
      />
    );
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            {sampleStudents.filter((s) => s.status === "active").length} active students
          </p>
        </div>
        <Button onClick={() => { setEditStudent(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1" />
          Add Student
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or admission #..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="graduated">Graduated</SelectItem>
                <SelectItem value="withdrawn">Withdrawn</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Student table */}
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
                  <th className="p-4 font-medium">Fee Status</th>
                  <th className="p-4 font-medium">Attendance</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedStudent(s)}
                  >
                    <td className="p-4 text-gray-600 font-mono text-xs">
                      {s.admissionNumber}
                    </td>
                    <td className="p-4 font-medium text-gray-900">
                      {s.firstName} {s.lastName}
                    </td>
                    <td className="p-4 text-gray-600">{s.className}</td>
                    <td className="p-4 text-gray-600">{s.parentPhone}</td>
                    <td className="p-4">
                      <FeeStatusBadge status={s.feeStatus} />
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-sm font-semibold ${
                          s.attendanceRate >= 90
                            ? "text-green-600"
                            : s.attendanceRate >= 75
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {s.attendanceRate}%
                      </span>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedStudent(s)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditStudent(s); setShowForm(true); }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                No students found matching your filters.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Form Modal */}
      <StudentForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditStudent(null); }}
        editStudent={editStudent}
      />
    </div>
  );
}
