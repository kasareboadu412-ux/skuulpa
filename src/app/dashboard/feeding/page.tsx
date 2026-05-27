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
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  UtensilsCrossed,
  Plus,
  Edit,
  X,
  Users,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Types ───

interface FeedingPlan {
  id: string;
  name: string;
  description: string;
  dailyRate: number;
  isActive: boolean;
}

interface FeedingSub {
  id: string;
  studentName: string;
  className: string;
  planName: string;
  daysPerWeek: number;
  isActive: boolean;
}

// ─── Sample data ───

const samplePlans: FeedingPlan[] = [
  {
    id: "fp1",
    name: "Standard Meal Plan",
    description: "Breakfast + Lunch + Snack",
    dailyRate: 12,
    isActive: true,
  },
  {
    id: "fp2",
    name: "Basic Meal Plan",
    description: "Lunch only",
    dailyRate: 8,
    isActive: true,
  },
  {
    id: "fp3",
    name: "Premium Meal Plan",
    description: "Breakfast + Lunch + Snack + Fruit",
    dailyRate: 15,
    isActive: true,
  },
  {
    id: "fp4",
    name: "Special Diet Plan",
    description: "Custom meals for allergies/dietary needs",
    dailyRate: 18,
    isActive: false,
  },
];

const sampleFeedingSubs: FeedingSub[] = [
  { id: "fs1", studentName: "Adwoa Mensah", className: "JHS 2", planName: "Standard Meal Plan", daysPerWeek: 5, isActive: true },
  { id: "fs2", studentName: "Yaw Boateng", className: "Class 4", planName: "Basic Meal Plan", daysPerWeek: 3, isActive: true },
  { id: "fs3", studentName: "Akua Serwaa", className: "Class 1", planName: "Standard Meal Plan", daysPerWeek: 5, isActive: true },
  { id: "fs4", studentName: "Kofi Adom", className: "JHS 1", planName: "Premium Meal Plan", daysPerWeek: 5, isActive: true },
  { id: "fs5", studentName: "Esi Nyarko", className: "Nursery 2", planName: "Standard Meal Plan", daysPerWeek: 5, isActive: true },
  { id: "fs6", studentName: "Nana Amoako", className: "Class 3", planName: "Basic Meal Plan", daysPerWeek: 4, isActive: true },
];

const revenueVsCostData = [
  { month: "Sep", revenue: 4200, cost: 3100 },
  { month: "Oct", revenue: 4800, cost: 3400 },
  { month: "Nov", revenue: 4500, cost: 3200 },
  { month: "Dec", revenue: 5100, cost: 3800 },
  { month: "Jan", revenue: 5400, cost: 3900 },
  { month: "Feb", revenue: 5600, cost: 4100 },
];

// ─── Today's dummy feeding attendance ───

interface FeedingAttendance {
  studentName: string;
  className: string;
  wasFed: boolean;
}

const todaysAttendance: FeedingAttendance[] = [
  { studentName: "Adwoa Mensah", className: "JHS 2", wasFed: true },
  { studentName: "Yaw Boateng", className: "Class 4", wasFed: true },
  { studentName: "Akua Serwaa", className: "Class 1", wasFed: false },
  { studentName: "Kofi Adom", className: "JHS 1", wasFed: true },
  { studentName: "Esi Nyarko", className: "Nursery 2", wasFed: true },
  { studentName: "Nana Amoako", className: "Class 3", wasFed: true },
  { studentName: "Kwame Asante", className: "Class 2", wasFed: false },
];

// ─── Plan Modal ───

function PlanModal({
  open,
  onClose,
  editPlan,
}: {
  open: boolean;
  onClose: () => void;
  editPlan: FeedingPlan | null;
}) {
  const [name, setName] = useState(editPlan?.name || "");
  const [description, setDescription] = useState(editPlan?.description || "");
  const [dailyRate, setDailyRate] = useState(editPlan?.dailyRate.toString() || "");

  useEffect(() => {
    if (editPlan) {
      setName(editPlan.name);
      setDescription(editPlan.description);
      setDailyRate(editPlan.dailyRate.toString());
    }
  }, [editPlan]);

  if (!open) return null;

  const handleSave = () => {
    if (!name || !dailyRate) {
      toast.error("Name and daily rate are required");
      return;
    }
    toast.success(editPlan ? "Plan updated" : "Plan created");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5" />
              {editPlan ? "Edit Plan" : "Add Feeding Plan"}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>Define a meal plan and its daily cost</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plan-name">Plan Name</Label>
            <Input
              id="plan-name"
              placeholder="e.g. Standard Meal Plan"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-desc">Description</Label>
            <Input
              id="plan-desc"
              placeholder="e.g. Breakfast + Lunch + Snack"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-rate">Daily Rate (GH₵)</Label>
            <Input
              id="plan-rate"
              type="number"
              placeholder="0.00"
              value={dailyRate}
              onChange={(e) => setDailyRate(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>
            {editPlan ? "Update Plan" : "Create Plan"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// ─── Main Page ───

export default function FeedingPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"plans" | "attendance" | "subs" | "reports">("plans");
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editPlan, setEditPlan] = useState<FeedingPlan | null>(null);
  const [feedingAttendance, setFeedingAttendance] = useState(todaysAttendance);
  const [todayDate] = useState(() => {
    const d = new Date();
    return d.toLocaleDateString("en-GH", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  });

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const totalSubscribers = sampleFeedingSubs.filter((s) => s.isActive).length;
  const fedToday = feedingAttendance.filter((a) => a.wasFed).length;
  const dailyRevenue = sampleFeedingSubs
    .filter((s) => s.isActive)
    .reduce((sum, s) => {
      const plan = samplePlans.find((p) => p.name === s.planName);
      return sum + (plan?.dailyRate || 0);
    }, 0);

  const toggleFed = (studentName: string) => {
    setFeedingAttendance((prev) =>
      prev.map((a) =>
        a.studentName === studentName ? { ...a, wasFed: !a.wasFed } : a
      )
    );
    toast.success("Attendance toggled");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feeding Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage meal plans, daily feeding attendance, and subscriptions
          </p>
        </div>
        <Button onClick={() => { setEditPlan(null); setShowPlanModal(true); }}>
          <Plus className="h-4 w-4 mr-1" />
          Add Plan
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-500">Active Plans</CardTitle>
            <UtensilsCrossed className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {samplePlans.filter((p) => p.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-500">Fed Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fedToday}/{feedingAttendance.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">{todayDate}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-500">Daily Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dailyRevenue)}</div>
            <p className="text-xs text-gray-500 mt-1">From subscriptions</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {[
          { key: "plans", label: "Feeding Plans" },
          { key: "attendance", label: "Daily Attendance" },
          { key: "subs", label: "Subscriptions" },
          { key: "reports", label: "Revenue vs Cost" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
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

      {/* Plans Tab */}
      {activeTab === "plans" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {samplePlans.map((plan) => (
            <Card key={plan.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UtensilsCrossed className="h-5 w-5 text-orange-600" />
                    {plan.name}
                  </CardTitle>
                  <Badge variant={plan.isActive ? "success" : "secondary"}>
                    {plan.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(plan.dailyRate)}
                  <span className="text-sm text-gray-500 font-normal"> / day</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={() => { setEditPlan(plan); setShowPlanModal(true); }}
                >
                  <Edit className="h-3 w-3" /> Edit
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Daily Attendance Tab */}
      {activeTab === "attendance" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Daily Feeding Attendance
            </CardTitle>
            <CardDescription>
              {todayDate} — Tap to toggle whether a student was fed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {feedingAttendance.map((a) => (
                <div
                  key={a.studentName}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => toggleFed(a.studentName)}
                >
                  <div className="flex items-center gap-3">
                    {a.wasFed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-300" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {a.studentName}
                      </p>
                      <p className="text-xs text-gray-500">{a.className}</p>
                    </div>
                  </div>
                  <Badge variant={a.wasFed ? "success" : "secondary"}>
                    {a.wasFed ? "Fed" : "Not Fed"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscriptions Tab */}
      {activeTab === "subs" && (
        <Card>
          <CardHeader>
            <CardTitle>Feeding Subscriptions</CardTitle>
            <CardDescription>Students subscribed to feeding plans</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 font-medium">Student</th>
                    <th className="pb-3 font-medium">Class</th>
                    <th className="pb-3 font-medium">Plan</th>
                    <th className="pb-3 font-medium">Days/Week</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleFeedingSubs.map((sub) => (
                    <tr key={sub.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-900">
                        {sub.studentName}
                      </td>
                      <td className="py-3 text-gray-600">{sub.className}</td>
                      <td className="py-3 text-gray-600">{sub.planName}</td>
                      <td className="py-3 text-gray-600">{sub.daysPerWeek}</td>
                      <td className="py-3">
                        {sub.isActive ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revenue vs Cost Report */}
      {activeTab === "reports" && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue vs Cost</CardTitle>
            <CardDescription>
              Feeding program financial performance this academic year
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueVsCostData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `GH₵${v}`} />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), ""]}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#16a34a"
                    strokeWidth={2}
                    name="Revenue"
                    dot={{ r: 4, fill: "#16a34a" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cost"
                    stroke="#dc2626"
                    strokeWidth={2}
                    name="Cost"
                    dot={{ r: 4, fill: "#dc2626" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-gray-500">Total Revenue (YTD)</p>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(
                    revenueVsCostData.reduce((s, d) => s + d.revenue, 0)
                  )}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-gray-500">Total Cost (YTD)</p>
                <p className="text-lg font-bold text-red-600">
                  {formatCurrency(
                    revenueVsCostData.reduce((s, d) => s + d.cost, 0)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <PlanModal
        open={showPlanModal}
        onClose={() => { setShowPlanModal(false); setEditPlan(null); }}
        editPlan={editPlan}
      />
    </div>
  );
}
