"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardCheck, Calendar, CheckCircle2, XCircle, Clock, FileWarning, MapPin, LogIn, LogOut, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// ── GPS Clock-in Widget ──────────────────────────────────────────

type ClockState = "idle" | "locating" | "clocking" | "done_in" | "done_out" | "error";

function GpsClockWidget() {
  const [state, setState] = useState<ClockState>("idle");
  const [message, setMessage] = useState<string>("");
  const [todayRecord, setTodayRecord] = useState<{
    clock_in_time: string | null;
    clock_out_time: string | null;
    is_late: boolean;
  } | null>(null);

  // Load today's record on mount.
  useEffect(() => {
    (async () => {
      try {
        const today = new Date().toISOString().split("T")[0];
        const res = await fetch(`/api/teachers/attendance?date=${today}`);
        const data = await res.json();
        const rec = (data.data ?? [])[0];
        if (rec) setTodayRecord({ clock_in_time: rec.clock_in_time, clock_out_time: rec.clock_out_time, is_late: rec.is_late });
      } catch { /* ignore */ }
    })();
  }, []);

  const handleClock = async (type: "in" | "out") => {
    setState("locating");
    setMessage("Getting your location…");

    if (!navigator.geolocation) {
      setState("error");
      setMessage("Your browser does not support GPS. Please update your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setState("clocking");
        setMessage("Verifying location with school…");
        try {
          const res = await fetch("/api/teachers/clockin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type, lat: pos.coords.latitude, lng: pos.coords.longitude }),
          });
          const data = await res.json();
          if (!res.ok) {
            setState("error");
            setMessage(data.error ?? "Failed to clock in.");
            toast.error(data.error ?? "Failed to clock in.");
            return;
          }
          setState(type === "in" ? "done_in" : "done_out");
          const msg = type === "in"
            ? `Clocked in at ${data.time}${data.data?.is_late ? " (Late)" : ""}`
            : `Clocked out at ${data.time}`;
          setMessage(msg);
          toast.success(msg);
          setTodayRecord({
            clock_in_time: data.data?.clock_in_time ?? null,
            clock_out_time: data.data?.clock_out_time ?? null,
            is_late: data.data?.is_late ?? false,
          });
        } catch {
          setState("error");
          setMessage("Network error. Please try again.");
          toast.error("Network error. Please try again.");
        }
      },
      (err) => {
        setState("error");
        const msg =
          err.code === 1 ? "Location permission denied. Please allow location access and try again." :
          err.code === 2 ? "Unable to determine location. Move to an open area and try again." :
          "Location timed out. Please try again.";
        setMessage(msg);
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const isBusy = state === "locating" || state === "clocking";
  const hasClockedIn = !!todayRecord?.clock_in_time;
  const hasClockedOut = !!todayRecord?.clock_out_time;

  return (
    <Card className="border-2" style={{ borderColor: "hsl(150 80% 24%)" }}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "hsl(150 30% 95%)" }}>
            <MapPin className="h-4 w-4" style={{ color: "hsl(150 80% 24%)" }} />
          </div>
          <div>
            <CardTitle className="text-base">My Attendance — Today</CardTitle>
            <CardDescription className="text-xs">
              {new Date().toLocaleDateString("en-GH", { weekday: "long", day: "numeric", month: "long" })}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status chips */}
        <div className="flex flex-wrap gap-3">
          <div className="rounded-lg border px-4 py-2.5 flex items-center gap-2">
            <LogIn className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-400">Clock In</p>
              <p className="text-sm font-semibold text-gray-900">
                {hasClockedIn ? todayRecord!.clock_in_time! : "—"}
                {todayRecord?.is_late && hasClockedIn && (
                  <span className="ml-1.5 text-xs font-medium text-amber-600">Late</span>
                )}
              </p>
            </div>
          </div>
          <div className="rounded-lg border px-4 py-2.5 flex items-center gap-2">
            <LogOut className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-400">Clock Out</p>
              <p className="text-sm font-semibold text-gray-900">{hasClockedOut ? todayRecord!.clock_out_time! : "—"}</p>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isBusy || hasClockedIn}
            onClick={() => handleClock("in")}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
            style={{ background: "hsl(150 80% 24%)" }}
          >
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            {hasClockedIn ? "Clocked In ✓" : "Clock In"}
          </button>
          <button
            type="button"
            disabled={isBusy || !hasClockedIn || hasClockedOut}
            onClick={() => handleClock("out")}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-2"
            style={{ borderColor: "hsl(150 80% 24%)", color: "hsl(150 80% 24%)" }}
          >
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            {hasClockedOut ? "Clocked Out ✓" : "Clock Out"}
          </button>
        </div>

        {/* Status message */}
        {message && (
          <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
            state === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
          }`}>
            {state === "error" ? <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /> : <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />}
            {message}
          </div>
        )}

        <p className="text-xs text-gray-400 text-center">
          Your GPS location is verified against the school premises. Location is not stored.
        </p>
      </CardContent>
    </Card>
  );
}

type AttendanceStatus = "present" | "absent" | "late" | "excused";

interface ClassOption { id: string; name: string }

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string | null;
}

export default function TeacherAttendancePage() {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/teachers/me");
        const json = await res.json();
        if (!res.ok) { setError(json.error || "Failed"); return; }
        const owned = json.data.owned_classes as ClassOption[];
        const subj = json.data.subject_assignments as Array<{ class?: ClassOption | null }>;
        const map = new Map<string, ClassOption>();
        owned.forEach((c) => map.set(c.id, c));
        subj.forEach((a) => a.class && map.set(a.class.id, a.class));
        const list = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
        setClasses(list);
        if (list.length > 0) setSelectedClass(list[0].id);
      } catch {
        toast.error("Network error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadRoster = useCallback(async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      const [sRes, aRes] = await Promise.all([
        fetch(`/api/students?class_id=${selectedClass}&status=active`),
        fetch(`/api/attendance?class_id=${selectedClass}&date=${date}&limit=1000`),
      ]);
      const [sJson, aJson] = await Promise.all([sRes.json(), aRes.json()]);
      const studentsList: Student[] = sJson.data ?? [];
      setStudents(studentsList);

      const existing: Record<string, AttendanceStatus> = {};
      for (const r of (aJson.data ?? []) as Array<{ student_id: string; status: AttendanceStatus }>) {
        existing[r.student_id] = r.status;
      }
      for (const s of studentsList) {
        if (!existing[s.id]) existing[s.id] = "present";
      }
      setRecords(existing);
    } catch {
      toast.error("Failed to load roster");
    } finally {
      setLoading(false);
    }
  }, [selectedClass, date]);

  useEffect(() => { void loadRoster(); }, [loadRoster]);

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setRecords((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleSave = async () => {
    if (!selectedClass || students.length === 0) return;
    setSaving(true);
    try {
      const payload = {
        class_id: selectedClass,
        date,
        records: students.map((s) => ({ student_id: s.id, status: records[s.id] ?? "present" })),
      };
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to save"); return; }
      toast.success(`Attendance saved (${data.count ?? students.length} students)`);
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return <div className="p-8"><Card><CardContent className="py-12 text-center text-gray-500">{error}</CardContent></Card></div>;
  }

  const counts = {
    present: Object.values(records).filter((v) => v === "present").length,
    absent: Object.values(records).filter((v) => v === "absent").length,
    late: Object.values(records).filter((v) => v === "late").length,
    excused: Object.values(records).filter((v) => v === "excused").length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* GPS Clock-in widget */}
      <GpsClockWidget />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Take Student Attendance</h1>
          <p className="text-sm text-gray-500 mt-1">Mark present, absent, late, or excused for each student</p>
        </div>
        <Button onClick={handleSave} disabled={saving || students.length === 0}>
          <ClipboardCheck className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Attendance"}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Class</label>
              <Select value={selectedClass} onValueChange={setSelectedClass} disabled={classes.length === 0}>
                <SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input type="date" className="pl-9" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {classes.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-gray-500">No classes assigned to you.</CardContent></Card>
      ) : loading ? (
        <Card><CardContent className="py-12 text-center text-gray-500">Loading roster...</CardContent></Card>
      ) : students.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-gray-500">No active students in this class.</CardContent></Card>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Present</p><p className="text-2xl font-bold text-green-600">{counts.present}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Absent</p><p className="text-2xl font-bold text-red-600">{counts.absent}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Late</p><p className="text-2xl font-bold text-yellow-600">{counts.late}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Excused</p><p className="text-2xl font-bold text-blue-600">{counts.excused}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Roster ({students.length})</CardTitle>
              <CardDescription>Tap a status for each student</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {students.map((s) => {
                const status = records[s.id] ?? "present";
                return (
                  <div key={s.id} className="flex items-center justify-between rounded-md border p-3 gap-2 flex-wrap">
                    <div>
                      <p className="font-medium text-sm">{s.first_name} {s.last_name}</p>
                      <p className="text-xs text-gray-500">{s.admission_number ?? "—"}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant={status === "present" ? "default" : "outline"} className={status === "present" ? "bg-green-600 hover:bg-green-700" : ""} onClick={() => setStatus(s.id, "present")}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Present
                      </Button>
                      <Button size="sm" variant={status === "late" ? "default" : "outline"} className={status === "late" ? "bg-yellow-600 hover:bg-yellow-700" : ""} onClick={() => setStatus(s.id, "late")}>
                        <Clock className="h-3 w-3 mr-1" /> Late
                      </Button>
                      <Button size="sm" variant={status === "absent" ? "default" : "outline"} className={status === "absent" ? "bg-red-600 hover:bg-red-700" : ""} onClick={() => setStatus(s.id, "absent")}>
                        <XCircle className="h-3 w-3 mr-1" /> Absent
                      </Button>
                      <Button size="sm" variant={status === "excused" ? "default" : "outline"} className={status === "excused" ? "bg-blue-600 hover:bg-blue-700" : ""} onClick={() => setStatus(s.id, "excused")}>
                        <FileWarning className="h-3 w-3 mr-1" /> Excused
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
