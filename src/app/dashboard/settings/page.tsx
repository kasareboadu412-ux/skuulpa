"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Save, School, CreditCard, BookOpen, GraduationCap, Plus, Edit, Trash2, X } from "lucide-react";

interface SchoolSettings {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  short_code: string | null;
  logo_url: string | null;
  settings: Record<string, unknown> | null;
}

interface AcademicYear {
  id: string;
  name: string;
  is_current: boolean | null;
}

interface ClassRow {
  id: string;
  name: string;
  academic_year_id: string | null;
  sort_order: number | null;
  teacher_id?: string | null;
  academic_year?: AcademicYear | null;
  teacher?: { id: string; first_name: string; last_name: string } | null;
  students?: Array<{ count: number }>;
}

interface TeacherOption {
  id: string;
  first_name: string;
  last_name: string;
}

export default function SettingsPage() {
  const [school, setSchool] = useState<SchoolSettings | null>(null);
  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Classes tab state
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRow | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/schools/me");
        const data = await res.json();
        if (res.ok) setSchool(data.data);
        else toast.error(data.error || "Failed to load settings");
      } catch {
        toast.error("Network error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadClasses = useCallback(async (schoolId: string) => {
    setClassesLoading(true);
    try {
      const [schoolRes, classRes] = await Promise.all([
        fetch(`/api/schools?id=${schoolId}`),
        fetch("/api/classes"),
      ]);
      const [schoolData, classData] = await Promise.all([schoolRes.json(), classRes.json()]);
      if (schoolRes.ok) setAcademicYears(schoolData.data?.academic_years ?? []);
      if (classRes.ok) setClasses(classData.data ?? []);
    } catch {
      toast.error("Failed to load classes");
    } finally {
      setClassesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "classes" && school?.id) void loadClasses(school.id);
  }, [activeTab, school?.id, loadClasses]);

  const handleSave = async () => {
    if (!school) return;
    setSaving(true);
    try {
      const res = await fetch("/api/schools", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: school.id,
          name: school.name,
          phone: school.phone,
          email: school.email,
          address: school.address,
          settings: school.settings,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save");
        return;
      }
      toast.success("Settings saved");
      setSchool(data.data);
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: unknown) => {
    setSchool((prev) => prev ? { ...prev, settings: { ...(prev.settings ?? {}), [key]: value } } : prev);
  };

  const getSetting = (key: string, fallback: unknown = "") => {
    return school?.settings?.[key] ?? fallback;
  };

  const handleDeleteClass = async (id: string, name: string) => {
    if (!confirm(`Delete class "${name}"?`)) return;
    try {
      const res = await fetch(`/api/classes/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete class");
        return;
      }
      toast.success("Class deleted");
      if (school?.id) void loadClasses(school.id);
    } catch {
      toast.error("Network error");
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

  if (!school) {
    return <div className="p-8"><Card><CardContent className="py-12 text-center text-gray-500">Unable to load school settings.</CardContent></Card></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your school configuration</p>
        </div>
        {activeTab !== "classes" && (
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="general"><School className="w-4 h-4 mr-2" />General</TabsTrigger>
          <TabsTrigger value="classes"><GraduationCap className="w-4 h-4 mr-2" />Classes</TabsTrigger>
          <TabsTrigger value="fees"><CreditCard className="w-4 h-4 mr-2" />Fee Settings</TabsTrigger>
          <TabsTrigger value="academics"><BookOpen className="w-4 h-4 mr-2" />Academics</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>School Information</CardTitle>
              <CardDescription>Basic information about your school</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="schoolName">School Name</Label>
                <Input id="schoolName" value={school.name ?? ""} onChange={(e) => setSchool((p) => p ? { ...p, name: e.target.value } : p)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="schoolPhone">Phone</Label>
                  <Input id="schoolPhone" value={school.phone ?? ""} onChange={(e) => setSchool((p) => p ? { ...p, phone: e.target.value } : p)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schoolEmail">Email</Label>
                  <Input id="schoolEmail" type="email" value={school.email ?? ""} onChange={(e) => setSchool((p) => p ? { ...p, email: e.target.value } : p)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="schoolAddress">Address</Label>
                <Input id="schoolAddress" value={school.address ?? ""} onChange={(e) => setSchool((p) => p ? { ...p, address: e.target.value } : p)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Short Code</Label>
                  <Input value={school.short_code ?? ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Input value={String(getSetting("currency", "GHS"))} onChange={(e) => updateSetting("currency", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classes" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Classes</CardTitle>
                <CardDescription>Manage the classes your school offers</CardDescription>
              </div>
              <Button onClick={() => { setEditingClass(null); setShowClassModal(true); }}>
                <Plus className="w-4 h-4 mr-1" />Add Class
              </Button>
            </CardHeader>
            <CardContent>
              {classesLoading ? (
                <p className="text-sm text-gray-500 py-6 text-center">Loading classes...</p>
              ) : classes.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">No classes yet. Click &ldquo;Add Class&rdquo; to create one.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="pb-3 font-medium">Name</th>
                        <th className="pb-3 font-medium">Academic Year</th>
                        <th className="pb-3 font-medium">Class Teacher</th>
                        <th className="pb-3 font-medium">Students</th>
                        <th className="pb-3 font-medium">Sort Order</th>
                        <th className="pb-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classes.map((c) => (
                        <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="py-3 font-medium text-gray-900">{c.name}</td>
                          <td className="py-3 text-gray-600">{c.academic_year?.name ?? "—"}</td>
                          <td className="py-3 text-gray-600">{c.teacher ? `${c.teacher.first_name} ${c.teacher.last_name}` : "—"}</td>
                          <td className="py-3 text-gray-600">{c.students?.[0]?.count ?? 0}</td>
                          <td className="py-3 text-gray-600">{c.sort_order ?? 0}</td>
                          <td className="py-3">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => { setEditingClass(c); setShowClassModal(true); }}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteClass(c.id, c.name)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Fee Configuration</CardTitle>
              <CardDescription>Default fee structure settings (saved with school)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="siblingDiscount">Sibling Discount (%)</Label>
                  <Input
                    id="siblingDiscount"
                    type="number"
                    value={Number(getSetting("sibling_discount_pct", 10))}
                    onChange={(e) => updateSetting("sibling_discount_pct", Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="earlyPaymentDiscount">Early Payment Discount (%)</Label>
                  <Input
                    id="earlyPaymentDiscount"
                    type="number"
                    value={Number(getSetting("early_payment_discount_pct", 5))}
                    onChange={(e) => updateSetting("early_payment_discount_pct", Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lateFee">Late Fee Amount (GH₵)</Label>
                <Input
                  id="lateFee"
                  type="number"
                  value={Number(getSetting("late_fee_amount", 20))}
                  onChange={(e) => updateSetting("late_fee_amount", Number(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="academics" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Academic Configuration</CardTitle>
              <CardDescription>Grading and assessment weight settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Continuous Assessment Weight (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={Number(getSetting("ca_weight_pct", 30))}
                    onChange={(e) => {
                      const ca = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                      updateSetting("ca_weight_pct", ca);
                      updateSetting("exam_weight_pct", 100 - ca);
                    }}
                  />
                  <p className="text-xs text-gray-500">Class score (non-exam assessments). Ghana default is 30%.</p>
                </div>
                <div className="space-y-2">
                  <Label>Exam Weight (%)</Label>
                  <Input type="number" value={100 - Number(getSetting("ca_weight_pct", 30))} disabled />
                  <p className="text-xs text-gray-500">Automatically the remainder. CA + Exam always equal 100%.</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Report-card subject marks are calculated as
                <span className="font-medium"> CA% × {Number(getSetting("ca_weight_pct", 30))}% + Exam% × {100 - Number(getSetting("ca_weight_pct", 30))}%</span>.
                Assessments of type <span className="font-medium">Exam</span> count toward the exam component; all others count as continuous assessment.
              </p>
              <div className="space-y-2">
                <Label>Grading Scale (read-only)</Label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 border rounded flex justify-between"><span>A (Excellent)</span><span className="font-mono">80-100%</span></div>
                  <div className="p-2 border rounded flex justify-between"><span>B (Very Good)</span><span className="font-mono">70-79%</span></div>
                  <div className="p-2 border rounded flex justify-between"><span>C (Good)</span><span className="font-mono">60-69%</span></div>
                  <div className="p-2 border rounded flex justify-between"><span>D (Credit)</span><span className="font-mono">50-59%</span></div>
                  <div className="p-2 border rounded flex justify-between"><span>E (Pass)</span><span className="font-mono">40-49%</span></div>
                  <div className="p-2 border rounded flex justify-between"><span>F (Fail)</span><span className="font-mono">&lt;40%</span></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ClassModal
        open={showClassModal}
        onClose={() => { setShowClassModal(false); setEditingClass(null); }}
        editingClass={editingClass}
        academicYears={academicYears}
        onSaved={() => { if (school?.id) void loadClasses(school.id); }}
      />
    </div>
  );
}

function ClassModal({
  open,
  onClose,
  onSaved,
  editingClass,
  academicYears,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingClass: ClassRow | null;
  academicYears: AcademicYear[];
}) {
  const [name, setName] = useState("");
  const [academicYearId, setAcademicYearId] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<string>("0");
  const [teacherId, setTeacherId] = useState<string>("none");
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingClass) {
      setName(editingClass.name);
      setAcademicYearId(editingClass.academic_year_id ?? "");
      setSortOrder(String(editingClass.sort_order ?? 0));
      setTeacherId(editingClass.teacher_id ?? "none");
    } else {
      setName("");
      const current = academicYears.find((y) => y.is_current) ?? academicYears[0];
      setAcademicYearId(current?.id ?? "");
      setSortOrder("0");
      setTeacherId("none");
    }
  }, [open, editingClass, academicYears]);

  // Load the school's teachers for the class-teacher selector.
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await fetch("/api/teachers?status=active");
        const data = await res.json();
        if (res.ok) setTeachers((data.data ?? []).map((t: TeacherOption) => ({ id: t.id, first_name: t.first_name, last_name: t.last_name })));
      } catch { /* ignore */ }
    })();
  }, [open]);

  if (!open) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Class name is required");
      return;
    }
    if (!academicYearId) {
      toast.error("Pick an academic year");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        academic_year_id: academicYearId,
        sort_order: Number(sortOrder) || 0,
        teacher_id: teacherId === "none" ? null : teacherId,
      };
      const res = await fetch(
        editingClass ? `/api/classes/${editingClass.id}` : "/api/classes",
        {
          method: editingClass ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save class");
        return;
      }
      toast.success(editingClass ? "Class updated" : "Class created");
      onSaved();
      onClose();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{editingClass ? "Edit Class" : "Add Class"}</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
          <CardDescription>{editingClass ? "Update class details" : "Create a new class"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="class-name">Name</Label>
            <Input id="class-name" placeholder="e.g. Class 4, JHS 1" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="class-year">Academic Year</Label>
            <Select value={academicYearId} onValueChange={setAcademicYearId}>
              <SelectTrigger id="class-year"><SelectValue placeholder="Select year" /></SelectTrigger>
              <SelectContent>
                {academicYears.map((y) => (
                  <SelectItem key={y.id} value={y.id}>
                    {y.name}{y.is_current ? " (current)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="class-teacher">Class Teacher</Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger id="class-teacher"><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="class-sort">Sort Order</Label>
            <Input id="class-sort" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            <p className="text-xs text-gray-500">Lower numbers appear first.</p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : editingClass ? "Update Class" : "Create Class"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
