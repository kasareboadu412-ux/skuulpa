"use client";

import { useCallback, useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  UtensilsCrossed,
  Plus,
  Edit,
  X,
  DollarSign,
  CheckCircle2,
  XCircle,
  Trash2,
} from "lucide-react";

interface FeedingPlan {
  id: string;
  name: string;
  description: string | null;
  daily_rate: number;
  is_active: boolean;
}

interface FeedingSubscription {
  id: string;
  days_per_week: number;
  is_active: boolean;
  student?: { id: string; first_name: string; last_name: string } | null;
  feeding_plan?: { id: string; name: string; daily_rate: number } | null;
}

interface FeedingAttendance {
  id: string;
  date: string;
  was_fed: boolean;
  student?: { id: string; first_name: string; last_name: string; class?: { name: string } | null } | null;
}

interface StudentSearchRow {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string | null;
  class?: { name: string } | null;
}

const BILLING_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "termly", label: "Termly" },
] as const;

function SubscriptionModal({
  open,
  onClose,
  onSaved,
  plans,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  plans: FeedingPlan[];
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<StudentSearchRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [student, setStudent] = useState<StudentSearchRow | null>(null);
  const [planId, setPlanId] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState("5");
  const [frequency, setFrequency] = useState("termly");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setSearch(""); setResults([]); setStudent(null); setPlanId(""); setDaysPerWeek("5");
      setFrequency("termly"); setEndDate(""); setStartDate(new Date().toISOString().split("T")[0]);
    }
  }, [open]);

  useEffect(() => {
    if (!open || student || !search.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/students?search=${encodeURIComponent(search.trim())}&status=active`);
        const data = await res.json();
        if (res.ok) setResults((data.data ?? []).slice(0, 8));
      } catch { /* ignore */ } finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [search, open, student]);

  if (!open) return null;

  const selectedPlan = plans.find((p) => p.id === planId);
  const termPreview = selectedPlan
    ? Math.round(Number(selectedPlan.daily_rate) * (Number(daysPerWeek) || 0) * 13 * 100) / 100
    : 0;

  const handleSave = async () => {
    if (!student) { toast.error("Select a student"); return; }
    if (!planId) { toast.error("Select a feeding plan"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/feeding/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: student.id,
          feeding_plan_id: planId,
          days_per_week: Number(daysPerWeek) || 5,
          billing_frequency: frequency,
          start_date: startDate,
          end_date: endDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to subscribe"); return; }
      if (data.fee?.assigned) {
        toast.success(
          `Subscribed. ${formatCurrency(data.fee.per_period)}/${data.fee.billing_frequency} — term total ${formatCurrency(data.fee.term_total)} billed to ${student.first_name}.`,
          { duration: 9000 }
        );
      } else {
        toast.success(`Subscribed. ${data.fee?.reason ?? "Fee not billed."}`, { duration: 9000 });
      }
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
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><UtensilsCrossed className="h-5 w-5" /> Add Subscription</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
          <CardDescription>Enroll a student on a feeding plan. The fee is billed to their account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!student ? (
            <div className="space-y-2">
              <Label htmlFor="feed-student">Student</Label>
              <Input id="feed-student" placeholder="Search name, admission # or phone..." value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
              {searching && <p className="text-xs text-gray-500">Searching...</p>}
              {results.length > 0 && (
                <div className="rounded-lg border divide-y max-h-52 overflow-y-auto">
                  {results.map((s) => (
                    <button key={s.id} type="button" onClick={() => setStudent(s)} className="w-full text-left p-2 hover:bg-gray-50">
                      <p className="text-sm font-medium">{s.first_name} {s.last_name}</p>
                      <p className="text-xs text-gray-500">{s.class?.name ?? "—"} · {s.admission_number ?? "no adm #"}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-lg border bg-gray-50 p-3 flex items-center justify-between">
                <p className="text-sm font-medium">{student.first_name} {student.last_name}</p>
                <Button variant="ghost" size="sm" onClick={() => setStudent(null)}>Change</Button>
              </div>
              <div className="space-y-2">
                <Label>Feeding Plan</Label>
                <Select value={planId} onValueChange={setPlanId}>
                  <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                  <SelectContent>
                    {plans.filter((p) => p.is_active).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} · {formatCurrency(Number(p.daily_rate))}/day</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Days / Week</Label>
                  <Input type="number" min="1" max="7" value={daysPerWeek} onChange={(e) => setDaysPerWeek(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Billing</Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BILLING_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>End Date (optional)</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
              {termPreview > 0 && (
                <p className="text-xs text-gray-500">Estimated term charge: <span className="font-semibold">{formatCurrency(termPreview)}</span></p>
              )}
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !student || !planId}>{saving ? "Saving..." : "Subscribe"}</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function PlanModal({
  open,
  onClose,
  onSaved,
  editPlan,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editPlan: FeedingPlan | null;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editPlan?.name ?? "");
      setDescription(editPlan?.description ?? "");
      setDailyRate(editPlan?.daily_rate?.toString() ?? "");
    }
  }, [open, editPlan]);

  if (!open) return null;

  const handleSave = async () => {
    const rate = Number(dailyRate);
    if (!name.trim() || !rate || rate <= 0) { toast.error("Name and daily rate are required"); return; }
    setSaving(true);
    try {
      const res = await fetch(
        editPlan ? `/api/feeding/plans/${editPlan.id}` : "/api/feeding/plans",
        {
          method: editPlan ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
            daily_rate: rate,
            is_active: true,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to save plan"); return; }
      toast.success(editPlan ? "Plan updated" : "Plan created");
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
            <CardTitle className="flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5" />
              {editPlan ? "Edit Plan" : "Add Feeding Plan"}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
          <CardDescription>Define a meal plan and its daily cost</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plan-name">Plan Name</Label>
            <Input id="plan-name" placeholder="e.g. Standard Meal Plan" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-desc">Description</Label>
            <Input id="plan-desc" placeholder="e.g. Breakfast + Lunch + Snack" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-rate">Daily Rate (GH₵)</Label>
            <Input id="plan-rate" type="number" placeholder="0.00" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editPlan ? "Update Plan" : "Create Plan"}</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function FeedingPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"plans" | "attendance" | "subs">("plans");
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [removeSub, setRemoveSub] = useState<FeedingSubscription | null>(null);
  const [removing, setRemoving] = useState(false);
  const [editPlan, setEditPlan] = useState<FeedingPlan | null>(null);
  const [plans, setPlans] = useState<FeedingPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<FeedingSubscription[]>([]);
  const [attendance, setAttendance] = useState<FeedingAttendance[]>([]);

  const today = new Date().toISOString().split("T")[0];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, sRes, aRes] = await Promise.all([
        fetch("/api/feeding/plans"),
        fetch("/api/feeding/subscriptions"),
        fetch(`/api/feeding/attendance?date=${today}&limit=1000`),
      ]);
      const [pData, sData, aData] = await Promise.all([pRes.json(), sRes.json(), aRes.json()]);
      if (pRes.ok) setPlans(pData.data ?? []);
      if (sRes.ok) setSubscriptions(sData.data ?? []);
      if (aRes.ok) setAttendance(aData.data ?? []);
    } catch {
      toast.error("Failed to load feeding data");
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => { void load(); }, [load]);

  const handleRemoveSub = async () => {
    if (!removeSub) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/feeding/subscriptions/${removeSub.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to remove subscription"); return; }
      toast.success(data.fees_removed > 0 ? "Subscription removed and unpaid fee cleared" : "Subscription removed");
      setRemoveSub(null);
      void load();
    } catch {
      toast.error("Network error");
    } finally {
      setRemoving(false);
    }
  };

  const toggleFed = async (studentId: string, currentlyFed: boolean) => {
    try {
      const res = await fetch("/api/feeding/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId, date: today, was_fed: !currentlyFed }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to update"); return; }
      toast.success(!currentlyFed ? "Marked fed" : "Marked unfed");
      void load();
    } catch {
      toast.error("Network error");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (<div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />))}
        </div>
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  const activePlans = plans.filter((p) => p.is_active).length;
  const activeSubs = subscriptions.filter((s) => s.is_active);
  const fedTodayCount = attendance.filter((a) => a.was_fed).length;
  const dailyRevenue = activeSubs.reduce((sum, s) => sum + Number(s.feeding_plan?.daily_rate ?? 0), 0);

  const todayDate = new Date().toLocaleDateString("en-GH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feeding Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage meal plans, daily feeding attendance, and subscriptions</p>
        </div>
        <Button onClick={() => { setEditPlan(null); setShowPlanModal(true); }}>
          <Plus className="h-4 w-4 mr-1" />Add Plan
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-500">Active Plans</CardTitle>
            <UtensilsCrossed className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{activePlans}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-500">Fed Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fedTodayCount}/{activeSubs.length}</div>
            <p className="text-xs text-gray-500 mt-1">{todayDate}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-500">Daily Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(dailyRevenue)}</div></CardContent>
        </Card>
      </div>

      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {[
          { key: "plans", label: "Feeding Plans" },
          { key: "attendance", label: "Today's Attendance" },
          { key: "subs", label: "Subscriptions" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "plans" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.length === 0 ? (
            <Card className="col-span-full"><CardContent className="py-12 text-center text-gray-500">No feeding plans yet.</CardContent></Card>
          ) : plans.map((plan) => (
            <Card key={plan.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UtensilsCrossed className="h-5 w-5 text-orange-600" />{plan.name}
                  </CardTitle>
                  <Badge variant={plan.is_active ? "success" : "secondary"}>
                    {plan.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <CardDescription>{plan.description ?? "—"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(Number(plan.daily_rate))}
                  <span className="text-sm text-gray-500 font-normal"> / day</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => { setEditPlan(plan); setShowPlanModal(true); }}>
                  <Edit className="h-3 w-3" /> Edit
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "attendance" && (
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Feeding Attendance</CardTitle>
            <CardDescription>{todayDate}</CardDescription>
          </CardHeader>
          <CardContent>
            {attendance.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">No feeding attendance recorded today yet.</p>
            ) : (
              <div className="space-y-2">
                {attendance.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">{a.student ? `${a.student.first_name} ${a.student.last_name}` : "—"}</p>
                      <p className="text-xs text-gray-500">{a.student?.class?.name ?? "—"}</p>
                    </div>
                    <Button
                      variant={a.was_fed ? "outline" : "default"}
                      size="sm"
                      className="gap-1"
                      onClick={() => a.student && toggleFed(a.student.id, a.was_fed)}
                    >
                      {a.was_fed ? <><CheckCircle2 className="h-3 w-3 text-green-600" /> Fed</> : <><XCircle className="h-3 w-3" /> Not yet</>}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "subs" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Student Subscriptions</CardTitle>
                <CardDescription>Active feeding subscriptions by student</CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowSubModal(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Subscription
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 font-medium">Student</th>
                    <th className="pb-3 font-medium">Plan</th>
                    <th className="pb-3 font-medium">Days/Week</th>
                    <th className="pb-3 font-medium">Daily Rate</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-500">No subscriptions yet.</td></tr>
                  ) : subscriptions.map((s) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-900">{s.student ? `${s.student.first_name} ${s.student.last_name}` : "—"}</td>
                      <td className="py-3 text-gray-600">{s.feeding_plan?.name ?? "—"}</td>
                      <td className="py-3">{s.days_per_week}</td>
                      <td className="py-3 font-semibold">{formatCurrency(Number(s.feeding_plan?.daily_rate ?? 0))}</td>
                      <td className="py-3"><Badge variant={s.is_active ? "success" : "secondary"}>{s.is_active ? "Active" : "Inactive"}</Badge></td>
                      <td className="py-3 text-right">
                        <Button variant="ghost" size="icon" onClick={() => setRemoveSub(s)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <PlanModal
        open={showPlanModal}
        onClose={() => { setShowPlanModal(false); setEditPlan(null); }}
        onSaved={() => void load()}
        editPlan={editPlan}
      />

      <SubscriptionModal
        open={showSubModal}
        onClose={() => setShowSubModal(false)}
        onSaved={() => void load()}
        plans={plans}
      />

      {removeSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Remove subscription?</CardTitle>
              <CardDescription>
                {removeSub.student ? `${removeSub.student.first_name} ${removeSub.student.last_name}` : "This student"} will be unsubscribed from {removeSub.feeding_plan?.name ?? "the plan"}. Any unpaid feeding fee for the current term will be removed; payments already made are kept.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRemoveSub(null)} disabled={removing}>Cancel</Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={handleRemoveSub} disabled={removing}>
                {removing ? "Removing..." : "Remove"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
