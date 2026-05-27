"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Building2,
  CheckCircle2,
  DollarSign,
  Clock,
  Users,
  AlertTriangle,
  Shield,
  Plus,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  ArrowUpRight,
  CreditCard,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

// ─── Types ───

type SchoolGrowth = {
  month: string;
  schools: number;
};

type RecentSchool = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  created_at: string;
};

type DashboardStats = {
  totalSchools: number;
  activeSchools: number;
  pendingSchools: number;
  suspendedSchools: number;
  trialSchools: number;
  totalStudents: number;
  monthlyRevenue: number;
  totalPlans: number;
  schoolGrowth: SchoolGrowth[];
  recentRegistrations: RecentSchool[];
};

// ─── Skeleton ───

function StatSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-7 w-32 bg-gray-200 rounded animate-pulse mb-1" />
        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return <div className="h-[300px] bg-gray-100 rounded-xl animate-pulse" />;
}

// ─── Status Badge ───

function SchoolStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" }> = {
    active: { label: "Active", variant: "success" },
    pending_approval: { label: "Pending", variant: "warning" },
    suspended: { label: "Suspended", variant: "danger" },
    disabled: { label: "Disabled", variant: "info" },
  };
  const s = map[status] || { label: status, variant: "info" as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

// ─── Main Page ───

export default function SuperAdminOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetch("/api/super-admin/stats");
      if (!res.ok) throw new Error("Failed to load stats");
      const json = await res.json();
      setStats(json.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatSkeleton key={i} />
          ))}
        </div>
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  const s = stats || {
    totalSchools: 0,
    activeSchools: 0,
    pendingSchools: 0,
    suspendedSchools: 0,
    trialSchools: 0,
    totalStudents: 0,
    monthlyRevenue: 0,
    totalPlans: 0,
    schoolGrowth: [],
    recentRegistrations: [],
  };

  const approvalRate =
    s.totalSchools > 0
      ? Math.round((s.activeSchools / s.totalSchools) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Super Admin</h1>
          <p className="text-sm text-gray-500 mt-1">
            Platform-wide overview and management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadStats(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/super-admin/schools">
            <Button size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Manage Schools
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Schools
            </CardTitle>
            <Building2 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s.totalSchools}</div>
            <p className="text-xs text-gray-500 mt-1">
              {s.activeSchools} active &middot; {s.pendingSchools} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Approval Rate
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvalRate}%</div>
            <p className="text-xs text-green-600 mt-1">
              &middot; {s.suspendedSchools} suspended
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Monthly Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(s.monthlyRevenue)}
            </div>
            <p className="text-xs text-gray-500 mt-1">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Trial Schools
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s.trialSchools}</div>
            <p className="text-xs text-gray-500 mt-1">
              {s.totalStudents.toLocaleString()} total students
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* School growth chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              School Growth
            </CardTitle>
            <CardDescription>Cumulative school registrations over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {s.schoolGrowth.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={s.schoolGrowth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value) => [value, "Schools"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="schools"
                      stroke="#7c3aed"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#7c3aed" }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-gray-400">
                  No school growth data yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Revenue overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              Revenue Overview
            </CardTitle>
            <CardDescription>Subscription revenue breakdown</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Monthly Revenue</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(s.monthlyRevenue)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-sm text-blue-600 font-medium">{s.totalPlans}</p>
                <p className="text-xs text-blue-500">Active Plans</p>
              </div>
              <div className="rounded-lg bg-green-50 p-4">
                <p className="text-sm text-green-600 font-medium">{s.activeSchools}</p>
                <p className="text-xs text-green-500">Paying Schools</p>
              </div>
            </div>

            <div className="pt-2">
              <Link href="/super-admin/plans">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Plus className="h-4 w-4" />
                  Manage Subscription Plans
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent registrations table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Registrations</CardTitle>
          <CardDescription>Latest schools to sign up on the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {s.recentRegistrations.length > 0 ? (
            <div className="space-y-3">
              {s.recentRegistrations.map((school) => (
                <div
                  key={school.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {school.name}
                      </p>
                      <SchoolStatusBadge status={school.status} />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {school.email || school.phone || "No contact"} &middot;{" "}
                      {formatDate(school.created_at)}
                    </p>
                  </div>
                  <Link href={`/super-admin/schools`}>
                    <Button variant="ghost" size="sm">
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-sm text-gray-400">
              <Building2 className="h-8 w-8 mb-2" />
              No schools registered yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-purple-100 p-2">
                <Shield className="h-5 w-5 text-purple-700" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">
                  Approve Schools
                </h3>
                <p className="text-xs text-gray-600 mt-1">
                  {s.pendingSchools} school{s.pendingSchools !== 1 ? "s" : ""}{" "}
                  awaiting approval
                </p>
                <Link href="/super-admin/schools?status=pending_approval">
                  <Button size="sm" variant="outline" className="mt-2 bg-white">
                    Review Now
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <CreditCard className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">
                  Manage Plans
                </h3>
                <p className="text-xs text-gray-600 mt-1">
                  {s.totalPlans} subscription plan{s.totalPlans !== 1 ? "s" : ""}{" "}
                  configured
                </p>
                <Link href="/super-admin/plans">
                  <Button size="sm" variant="outline" className="mt-2 bg-white">
                    Edit Plans
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-amber-100 p-2">
                <AlertTriangle className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">
                  Suspended Schools
                </h3>
                <p className="text-xs text-gray-600 mt-1">
                  {s.suspendedSchools} school{s.suspendedSchools !== 1 ? "s" : ""}{" "}
                  currently suspended
                </p>
                <Link href="/super-admin/schools?status=suspended">
                  <Button size="sm" variant="outline" className="mt-2 bg-white">
                    View All
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
