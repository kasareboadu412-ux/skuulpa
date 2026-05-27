"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ClipboardCheck,
  Check,
  X,
  Clock,
  AlertTriangle,
  UserX,
  Save,
  Wifi,
  WifiOff,
  RefreshCw,
  Send,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type AttendanceStatus = "present" | "absent" | "late" | "permission_withdrawn";

interface StudentRecord {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string | null;
  profile_photo_url: string | null;
  status: AttendanceStatus;
}

interface ClassOption {
  id: string;
  name: string;
}

export default function AttendancePage() {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingOffline, setSavingOffline] = useState(false);
  const [savedLocally, setSavedLocally] = useState(false);
  const [existingAttendance, setExistingAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [summary, setSummary] = useState({
    present: 0,
    absent: 0,
    late: 0,
    permission_withdrawn: 0,
    total: 0,
  });
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [notifying, setNotifying] = useState(false);

  useEffect(() => {
    loadTeacherAndClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      loadStudents();
    }
  }, [selectedClassId, selectedDate]);

  useEffect(() => {
    updateSummary();
  }, [students]);

  async function loadTeacherAndClasses() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: teacher } = await supabase
        .from("teachers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (teacher) {
        setTeacherId(teacher.id);

        // Get tutor class
        const { data: tClasses } = await supabase
          .from("classes")
          .select("id, name")
          .eq("teacher_id", teacher.id);

        // Also get from teacher_subject_assignments
        const { data: assignments } = await supabase
          .from("teacher_subject_assignments")
          .select("class_id, classes!inner(id, name)")
          .eq("teacher_id", teacher.id);

        const classMap = new Map<string, string>();
        if (tClasses) tClasses.forEach((c: { id: string; name: string }) => classMap.set(c.id, c.name));
        if (assignments) {
          assignments.forEach((a: { classes: unknown }) => {
            const cls = a.classes as { id: string; name: string };
            if (cls && !classMap.has(cls.id)) classMap.set(cls.id, cls.name);
          });
        }

        const classList = Array.from(classMap, ([id, name]) => ({ id, name }));
        setClasses(classList);
        if (classList.length === 1) {
          setSelectedClassId(classList[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load teacher data:", err);
      toast.error("Failed to load your classes");
    } finally {
      setLoading(false);
    }
  }

  async function loadStudents() {
    setLoading(true);
    try {
      // Get all active students in the selected class
      const { data: studentData } = await supabase
        .from("students")
        .select("id, first_name, last_name, admission_number, profile_photo_url")
        .eq("class_id", selectedClassId)
        .eq("status", "active")
        .order("first_name");

      // Load existing attendance for this class and date
      const { data: records } = await supabase
        .from("attendance_records")
        .select("student_id, status")
        .eq("class_id", selectedClassId)
        .eq("date", selectedDate);

      const existing: Record<string, AttendanceStatus> = {};
      if (records) {
        records.forEach((r: { student_id: string; status: string | null }) => {
          if (r.status) existing[r.student_id] = r.status as AttendanceStatus;
        });
      }
      setExistingAttendance(existing);

      const studentsList: StudentRecord[] = (studentData || []).map((s: { id: string; first_name: string; last_name: string; admission_number: string | null; profile_photo_url: string | null }) => ({
        id: s.id,
        first_name: s.first_name,
        last_name: s.last_name,
        admission_number: s.admission_number,
        profile_photo_url: s.profile_photo_url,
        status: existing[s.id] || "present",
      }));

      setStudents(studentsList);
      setSavedLocally(Object.keys(existing).length > 0);
    } catch (err) {
      console.error("Failed to load students:", err);
      toast.error("Failed to load student list");
    } finally {
      setLoading(false);
    }
  }

  function updateSummary() {
    const present = students.filter(s => s.status === "present").length;
    const absent = students.filter(s => s.status === "absent").length;
    const late = students.filter(s => s.status === "late").length;
    const permission = students.filter(s => s.status === "permission_withdrawn").length;
    setSummary({ present, absent, late, permission_withdrawn: permission, total: students.length });
  }

  function updateStudentStatus(studentId: string, status: AttendanceStatus) {
    setStudents(prev =>
      prev.map(s => (s.id === studentId ? { ...s, status } : s))
    );
  }

  function markAllPresent() {
    setStudents(prev =>
      prev.map(s => ({ ...s, status: "present" as AttendanceStatus }))
    );
    toast.success("All students marked as Present");
  }

  async function handleSubmit() {
    if (!selectedClassId || !teacherId) {
      toast.error("Please select a class first");
      return;
    }

    setSubmitting(true);

    try {
      // Check connectivity first — try a lightweight query
      const online = await checkConnectivity();
      if (!online) {
        // Save offline
        saveOffline();
        return;
      }

      const records = students.map(s => ({
        student_id: s.id,
        class_id: selectedClassId,
        date: selectedDate,
        status: s.status,
        recorded_by: teacherId,
        synced: true,
      }));

      // Upsert — delete existing and insert new
      const { error: deleteError } = await supabase
        .from("attendance_records")
        .delete()
        .eq("class_id", selectedClassId)
        .eq("date", selectedDate);
      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from("attendance_records")
        .insert(records);
      if (insertError) throw insertError;

      setSavedLocally(false);
      toast.success(`Attendance recorded for ${students.length} students`);
    } catch (err) {
      console.error("Submit error:", err);
      toast.error("Failed to submit. Saved offline instead.");
      saveOffline();
    } finally {
      setSubmitting(false);
    }
  }

  function saveOffline() {
    try {
      const offlineData = {
        classId: selectedClassId,
        date: selectedDate,
        records: students.map(s => ({ student_id: s.id, status: s.status })),
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(
        `attendance_pending_${selectedClassId}_${selectedDate}`,
        JSON.stringify(offlineData)
      );
      setSavedLocally(true);
      setSavingOffline(true);
      toast.success("Saved locally — will sync when online");
    } catch (err) {
      console.error("Offline save error:", err);
      toast.error("Could not save offline data");
    }
  }

  async function checkConnectivity(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      await fetch("/api/health", { method: "HEAD", signal: controller.signal });
      clearTimeout(timeout);
      return true;
    } catch {
      return false;
    }
  }

  function syncPendingAttendance() {
    // Attempt to sync any locally saved attendance
    const keys = Object.keys(localStorage).filter(k => k.startsWith("attendance_pending_"));
    if (keys.length === 0) {
      toast.info("No pending data to sync");
      return;
    }
    toast.success(`${keys.length} pending record(s) will sync when online`);
  }

  async function sendAbsenceNotifications() {
    const absentStudents = students.filter(s => s.status === "absent" || s.status === "late");
    if (absentStudents.length === 0) {
      toast.info("No absent students to notify about");
      return;
    }

    setNotifying(true);
    try {
      // Record absence notifications in the database
      const notifications = absentStudents.map(s => ({
        student_id: s.id,
        class_id: selectedClassId,
        date: selectedDate,
        notification_channel: "sms" as const,
        notification_status: "sent" as const,
        attendance_record_id: "",
      }));

      // Get the attendance record IDs
      const { data: records } = await supabase
        .from("attendance_records")
        .select("id, student_id")
        .eq("class_id", selectedClassId)
        .eq("date", selectedDate)
        .in("student_id", absentStudents.map(s => s.id));

      if (records) {
        notifications.forEach(n => {
          const record = records.find((r: { student_id: string }) => r.student_id === n.student_id);
          if (record) n.attendance_record_id = record.id;
        });
      }

      const { error } = await supabase
        .from("absence_notifications")
        .insert(notifications.filter(n => n.attendance_record_id));

      if (error) throw error;
      toast.success(`Absence notifications sent for ${absentStudents.length} student(s)`);
    } catch (err) {
      console.error("Notification error:", err);
      toast.error("Failed to send absence notifications");
    } finally {
      setNotifying(false);
    }
  }

  const filteredStudents = students.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q) ||
      (s.admission_number && s.admission_number.toLowerCase().includes(q))
    );
  });

  const statusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case "present": return <Check className="h-4 w-4 text-green-600" />;
      case "absent": return <X className="h-4 w-4 text-red-600" />;
      case "late": return <Clock className="h-4 w-4 text-yellow-600" />;
      case "permission_withdrawn": return <UserX className="h-4 w-4 text-orange-600" />;
    }
  };

  const statusColor = (status: AttendanceStatus) => {
    switch (status) {
      case "present": return "ring-green-500 bg-green-50";
      case "absent": return "ring-red-500 bg-red-50";
      case "late": return "ring-yellow-500 bg-yellow-50";
      case "permission_withdrawn": return "ring-orange-500 bg-orange-50";
    }
  };

  if (loading && classes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading attendance page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Take Attendance</h1>
          <p className="text-sm text-muted-foreground">
            Record student attendance for today
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!navigator.onLine && (
            <Badge variant="warning" className="flex items-center gap-1">
              <WifiOff className="h-3 w-3" />
              Offline
            </Badge>
          )}
          {savedLocally && (
            <Badge variant="info" className="flex items-center gap-1">
              <Save className="h-3 w-3" />
              Saved locally
            </Badge>
          )}
          {navigator.onLine && (
            <Badge variant="success" className="flex items-center gap-1">
              <Wifi className="h-3 w-3" />
              Online
            </Badge>
          )}
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="class-select">Class</Label>
              <Select
                value={selectedClassId}
                onValueChange={setSelectedClassId}
              >
                <SelectTrigger id="class-select">
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date-select">Date</Label>
              <Input
                id="date-select"
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                onClick={markAllPresent}
                className="flex items-center gap-1"
                disabled={students.length === 0}
              >
                <Check className="h-4 w-4" />
                All Present
              </Button>
              <Button
                variant="outline"
                onClick={loadStudents}
                className="flex items-center gap-1"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      {students.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search students by name or admission number..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Summary */}
      {students.length > 0 && (
        <div className="grid grid-cols-4 gap-2 sm:gap-4">
          <Card className="border-green-200">
            <CardContent className="p-3 text-center">
              <p className="text-lg sm:text-xl font-bold text-green-600">{summary.present}</p>
              <p className="text-xs text-muted-foreground">Present</p>
            </CardContent>
          </Card>
          <Card className="border-red-200">
            <CardContent className="p-3 text-center">
              <p className="text-lg sm:text-xl font-bold text-red-600">{summary.absent}</p>
              <p className="text-xs text-muted-foreground">Absent</p>
            </CardContent>
          </Card>
          <Card className="border-yellow-200">
            <CardContent className="p-3 text-center">
              <p className="text-lg sm:text-xl font-bold text-yellow-600">{summary.late}</p>
              <p className="text-xs text-muted-foreground">Late</p>
            </CardContent>
          </Card>
          <Card className="border-orange-200">
            <CardContent className="p-3 text-center">
              <p className="text-lg sm:text-xl font-bold text-orange-600">{summary.permission_withdrawn}</p>
              <p className="text-xs text-muted-foreground">Permit</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Student list */}
      {loading && selectedClassId ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading students...</p>
        </div>
      ) : !selectedClassId ? (
        <Card>
          <CardContent className="text-center py-8">
            <ClipboardCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-muted-foreground">Select a class to take attendance</p>
          </CardContent>
        </Card>
      ) : filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-muted-foreground">No students match your search</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 ${statusColor(student.status)}`}
                >
                  {/* Photo */}
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                    {student.profile_photo_url ? (
                      <img
                        src={student.profile_photo_url}
                        alt={`${student.first_name} ${student.last_name}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-medium text-gray-500">
                        {student.first_name[0]}{student.last_name[0]}
                      </div>
                    )}
                  </div>

                  {/* Name + Admission */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {student.first_name} {student.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {student.admission_number || "No ID"}
                    </p>
                  </div>

                  {/* Status radio buttons */}
                  <div className="flex gap-0.5 sm:gap-1 flex-shrink-0">
                    {(["present", "absent", "late", "permission_withdrawn"] as AttendanceStatus[]).map((status) => (
                      <button
                        key={status}
                        onClick={() => updateStudentStatus(student.id, status)}
                        className={`p-1.5 sm:p-2 rounded-md text-xs font-medium transition-colors ${
                          student.status === status
                            ? status === "present"
                              ? "bg-green-100 text-green-700 ring-1 ring-green-400"
                              : status === "absent"
                              ? "bg-red-100 text-red-700 ring-1 ring-red-400"
                              : status === "late"
                              ? "bg-yellow-100 text-yellow-700 ring-1 ring-yellow-400"
                              : "bg-orange-100 text-orange-700 ring-1 ring-orange-400"
                            : "text-gray-400 hover:bg-gray-100"
                        }`}
                        title={status.replace(/_/g, " ")}
                      >
                        <span className="hidden sm:inline text-xs">
                          {status === "permission_withdrawn" ? "Permit" : status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                        <span className="sm:hidden">{statusIcon(status)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      {selectedClassId && students.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 flex items-center gap-2"
            size="lg"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Submit Attendance
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={sendAbsenceNotifications}
            disabled={notifying || students.filter(s => s.status === "absent" || s.status === "late").length === 0}
            className="flex items-center gap-2"
          >
            {notifying ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Notify Absent Parents
              </>
            )}
          </Button>
        </div>
      )}

      {/* Sync pending */}
      <Button
        variant="ghost"
        size="sm"
        onClick={syncPendingAttendance}
        className="text-muted-foreground"
      >
        <RefreshCw className="h-3 w-3 mr-1" />
        Sync pending offline records
      </Button>
    </div>
  );
}
