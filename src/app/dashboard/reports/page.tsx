"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  Download,
  TrendingUp,
  Bus,
  Users,
  DollarSign,
  BarChart3,
  Printer,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface FeesReport {
  summary: { total_charged: number; total_collected: number; total_pending: number; outstanding: number; collection_rate: number; total_classes: number };
  by_class: Array<{ class_name: string; total_charged: number; total_collected: number }>;
}

interface EnrollmentReport {
  summary: { total_students: number; total_sources_tracked: number; total_marketing_cost: number; cost_per_enrollment: number };
  by_source: Array<{ source: string; count: number; cost: number }>;
  by_class: Array<{ class_name: string; count: number }>;
  by_month: Array<{ month: string; count: number }>;
}

interface BusReport {
  routes: Array<{ route_id: string; route_name: string; total_subscriptions: number; capacity: number; utilization_rate: number; total_revenue: number }>;
  summary: { total_routes: number; total_subscriptions: number; total_revenue: number; total_capacity?: number; utilization_rate: number };
}

const PIE_COLORS = ["#2563eb", "#16a34a", "#eab308", "#f97316", "#8b5cf6", "#6b7280", "#ec4899", "#06b6d4"];

function ReportCard({
  title,
  description,
  icon,
  onDownload,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onDownload: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">{icon}</div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-1" onClick={onDownload}>
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [fees, setFees] = useState<FeesReport | null>(null);
  const [enrollment, setEnrollment] = useState<EnrollmentReport | null>(null);
  const [bus, setBus] = useState<BusReport | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [fRes, eRes, bRes] = await Promise.all([
          fetch("/api/reports/fees"),
          fetch("/api/reports/enrollment"),
          fetch("/api/reports/bus-utilization"),
        ]);
        const [fData, eData, bData] = await Promise.all([fRes.json(), eRes.json(), bRes.json()]);
        if (fRes.ok) setFees(fData.data);
        if (eRes.ok) setEnrollment(eData.data);
        if (bRes.ok) setBus(bData.data);
      } catch {
        toast.error("Failed to load reports");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleExport = (reportName: string) => {
    toast.info(`${reportName} export — coming soon (PDF generation not yet implemented)`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (<div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">View school performance reports</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Print Page
        </Button>
      </div>

      {/* 1. Fee Collection */}
      <ReportCard
        title="Fee Collection Report"
        description="Overview of fee collections this term"
        icon={<DollarSign className="h-5 w-5 text-blue-600" />}
        onDownload={() => handleExport("Fee Collection")}
      >
        {!fees || fees.by_class.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">No fee data yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="rounded-lg border p-3"><p className="text-xs text-gray-500">Charged</p><p className="text-lg font-bold">{formatCurrency(fees.summary.total_charged)}</p></div>
              <div className="rounded-lg border p-3"><p className="text-xs text-gray-500">Collected</p><p className="text-lg font-bold text-green-600">{formatCurrency(fees.summary.total_collected)}</p></div>
              <div className="rounded-lg border p-3"><p className="text-xs text-gray-500">Outstanding</p><p className="text-lg font-bold text-red-600">{formatCurrency(fees.summary.outstanding)}</p></div>
              <div className="rounded-lg border p-3"><p className="text-xs text-gray-500">Rate</p><p className="text-lg font-bold">{fees.summary.collection_rate}%</p></div>
            </div>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fees.by_class} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="class_name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="total_charged" fill="#93c5fd" name="Charged" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="total_collected" fill="#2563eb" name="Collected" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </ReportCard>

      {/* 2. Enrollment */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ReportCard
          title="Enrollment by Class"
          description="Active students per class"
          icon={<Users className="h-5 w-5 text-purple-600" />}
          onDownload={() => handleExport("Enrollment by Class")}
        >
          {!enrollment || enrollment.by_class.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">No enrollment data yet.</p>
          ) : (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={enrollment.by_class}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="class_name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" name="Students" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ReportCard>

        <ReportCard
          title="Enrollment Sources"
          description="How students found your school"
          icon={<Users className="h-5 w-5 text-blue-600" />}
          onDownload={() => handleExport("Enrollment Sources")}
        >
          {!enrollment || enrollment.by_source.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">No source tracking yet.</p>
          ) : (
            <div className="flex items-center h-[220px]">
              <div className="w-1/2">
                <ResponsiveContainer width="100%" height={200}>
                  <RePieChart>
                    <Pie
                      data={enrollment.by_source}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      dataKey="count"
                      nameKey="source"
                      labelLine={false}
                    >
                      {enrollment.by_source.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-1.5">
                {enrollment.by_source.map((d, i) => (
                  <div key={d.source} className="flex items-center gap-2 text-xs">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-gray-600 capitalize">{d.source}</span>
                    <span className="ml-auto font-medium">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ReportCard>
      </div>

      {/* 3. Bus Utilization */}
      <ReportCard
        title="Bus Utilization Report"
        description="Capacity vs actual usage by route"
        icon={<Bus className="h-5 w-5 text-orange-600" />}
        onDownload={() => handleExport("Bus Utilization")}
      >
        {!bus || bus.routes.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">No bus routes configured yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="rounded-lg border p-3"><p className="text-xs text-gray-500">Active Subscriptions</p><p className="text-lg font-bold">{bus.summary.total_subscriptions}</p></div>
              <div className="rounded-lg border p-3"><p className="text-xs text-gray-500">Total Revenue</p><p className="text-lg font-bold text-green-600">{formatCurrency(bus.summary.total_revenue)}</p></div>
              <div className="rounded-lg border p-3"><p className="text-xs text-gray-500">Utilization</p><p className="text-lg font-bold">{bus.summary.utilization_rate}%</p></div>
            </div>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bus.routes} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="route_name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="capacity" fill="#93c5fd" name="Capacity" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="total_subscriptions" fill="#f97316" name="Subscribed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </ReportCard>

      {/* 4. Marketing summary */}
      {enrollment && enrollment.summary.total_sources_tracked > 0 && (
        <ReportCard
          title="Marketing Performance"
          description="Lead acquisition cost summary"
          icon={<BarChart3 className="h-5 w-5 text-green-600" />}
          onDownload={() => handleExport("Marketing")}
        >
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border p-3"><p className="text-xs text-gray-500">Sources Tracked</p><p className="text-lg font-bold">{enrollment.summary.total_sources_tracked}</p></div>
            <div className="rounded-lg border p-3"><p className="text-xs text-gray-500">Marketing Spend</p><p className="text-lg font-bold text-red-600">{formatCurrency(enrollment.summary.total_marketing_cost)}</p></div>
            <div className="rounded-lg border p-3"><p className="text-xs text-gray-500">Cost per Enrollment</p><p className="text-lg font-bold">{formatCurrency(enrollment.summary.cost_per_enrollment)}</p></div>
          </div>
        </ReportCard>
      )}
    </div>
  );
}
