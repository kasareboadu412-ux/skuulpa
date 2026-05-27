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
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  FileBarChart,
  Download,
  FileText,
  TrendingUp,
  Bus,
  Users,
  DollarSign,
  BarChart3,
  PieChart,
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

// ─── Sample data ───

const feeCollectionReport = {
  totalExpected: 128500,
  totalCollected: 112200,
  collectionRate: 87.3,
  overdue: 16300,
  byClass: [
    { className: "Nursery 1", expected: 12400, collected: 11200 },
    { className: "Nursery 2", expected: 13800, collected: 12500 },
    { className: "Class 1", expected: 14500, collected: 14000 },
    { className: "Class 2", expected: 15200, collected: 12800 },
    { className: "Class 3", expected: 11800, collected: 10200 },
    { className: "Class 4", expected: 16800, collected: 15500 },
    { className: "JHS 1", expected: 18500, collected: 16200 },
    { className: "JHS 2", expected: 15500, collected: 10800 },
    { className: "JHS 3", expected: 17900, collected: 14500 },
  ],
};

const classPerformanceData = [
  { subject: "English", avgScore: 72, passRate: 85 },
  { subject: "Math", avgScore: 65, passRate: 72 },
  { subject: "Science", avgScore: 70, passRate: 80 },
  { subject: "Social Studies", avgScore: 68, passRate: 78 },
  { subject: "ICT", avgScore: 78, passRate: 90 },
  { subject: "Religious Studies", avgScore: 75, passRate: 88 },
];

const enrollmentSourceData = [
  { name: "Referral", value: 45, color: "#2563eb" },
  { name: "Online Ad", value: 22, color: "#16a34a" },
  { name: "Signpost", value: 15, color: "#eab308" },
  { name: "Walk-in", value: 10, color: "#f97316" },
  { name: "Social Media", value: 5, color: "#8b5cf6" },
  { name: "Other", value: 3, color: "#6b7280" },
];

const incomeVsExpenseData = [
  { month: "Sep", income: 38500, expense: 28200 },
  { month: "Oct", income: 42200, expense: 30500 },
  { month: "Nov", income: 39800, expense: 29800 },
  { month: "Dec", income: 45100, expense: 33500 },
  { month: "Jan", income: 51800, expense: 34800 },
  { month: "Feb", income: 54500, expense: 36200 },
];

const busUtilizationData = [
  { route: "Madina Route", capacity: 45, utilized: 38 },
  { route: "Adenta Route", capacity: 40, utilized: 22 },
  { route: "Legon Route", capacity: 35, utilized: 0 },
];

// ─── Report Card Component ───

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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              {icon}
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-1" onClick={onDownload}>
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ─── Main Page ───

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const handleDownload = (reportName: string) => {
    toast.success(`${reportName} report downloaded as PDF`);
  };

  const handlePrint = () => {
    toast.success("Print dialog opened");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const COLORS = enrollmentSourceData.map((d) => d.color);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">
            Download and view school performance reports
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handlePrint}>
          <Printer className="h-4 w-4" />
          Print All
        </Button>
      </div>

      {/* 1. Fee Collection Report */}
      <ReportCard
        title="Fee Collection Report"
        description="Overview of fee collections this term"
        icon={<DollarSign className="h-5 w-5 text-blue-600" />}
        onDownload={() => handleDownload("Fee Collection")}
      >
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-gray-500">Expected</p>
            <p className="text-lg font-bold">
              {formatCurrency(feeCollectionReport.totalExpected)}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-gray-500">Collected</p>
            <p className="text-lg font-bold text-green-600">
              {formatCurrency(feeCollectionReport.totalCollected)}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-gray-500">Collection Rate</p>
            <p className="text-lg font-bold">{feeCollectionReport.collectionRate}%</p>
          </div>
        </div>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={feeCollectionReport.byClass} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="className"
                tick={{ fontSize: 10 }}
                angle={-30}
                textAnchor="end"
                height={50}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
              />
              <Legend />
              <Bar
                dataKey="expected"
                fill="#93c5fd"
                name="Expected"
                radius={[2, 2, 0, 0]}
              />
              <Bar
                dataKey="collected"
                fill="#2563eb"
                name="Collected"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ReportCard>

      {/* 2. Class Performance Report */}
      <ReportCard
        title="Class Performance Report"
        description="Average scores and pass rates by subject"
        icon={<TrendingUp className="h-5 w-5 text-green-600" />}
        onDownload={() => handleDownload("Class Performance")}
      >
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={classPerformanceData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
              <Tooltip formatter={(value) => [`${Number(value)}%`, ""]} />
              <Legend />
              <Bar
                dataKey="avgScore"
                fill="#2563eb"
                name="Avg Score (%)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="passRate"
                fill="#16a34a"
                name="Pass Rate (%)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ReportCard>

      {/* Two-column: Bus + Enrollment */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 3. Bus Utilization Report */}
        <ReportCard
          title="Bus Utilization Report"
          description="Capacity vs actual usage by route"
          icon={<Bus className="h-5 w-5 text-orange-600" />}
          onDownload={() => handleDownload("Bus Utilization")}
        >
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={busUtilizationData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="route" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar
                  dataKey="capacity"
                  fill="#93c5fd"
                  name="Capacity"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="utilized"
                  fill="#f97316"
                  name="Utilized"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ReportCard>

        {/* 4. Enrollment Source Report */}
        <ReportCard
          title="Enrollment Sources"
          description="How students found your school"
          icon={<Users className="h-5 w-5 text-purple-600" />}
          onDownload={() => handleDownload("Enrollment Sources")}
        >
          <div className="flex items-center h-[220px]">
            <div className="w-1/2">
              <ResponsiveContainer width="100%" height={200}>
                <RePieChart>
                  <Pie
                    data={enrollmentSourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    dataKey="value"
                    label={(entry: { name?: string; percent?: number }) => `${entry.name} ${entry.percent ? (entry.percent * 100).toFixed(0) : 0}%`
                    }
                    labelLine={false}
                  >
                    {enrollmentSourceData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-1.5">
              {enrollmentSourceData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-gray-600">{d.name}</span>
                  <span className="ml-auto font-medium">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </ReportCard>
      </div>

      {/* 5. Income vs Expense Report */}
      <ReportCard
        title="Income vs Expense Report"
        description="Monthly financial performance"
        icon={<BarChart3 className="h-5 w-5 text-blue-600" />}
        onDownload={() => handleDownload("Income vs Expense")}
      >
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={incomeVsExpenseData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `GH₵${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
              />
              <Legend />
              <Bar
                dataKey="income"
                fill="#16a34a"
                name="Income"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="expense"
                fill="#dc2626"
                name="Expense"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-gray-500">Total Income (YTD)</p>
            <p className="text-lg font-bold text-green-600">
              {formatCurrency(
                incomeVsExpenseData.reduce((s, d) => s + d.income, 0)
              )}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-gray-500">Total Expense (YTD)</p>
            <p className="text-lg font-bold text-red-600">
              {formatCurrency(
                incomeVsExpenseData.reduce((s, d) => s + d.expense, 0)
              )}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-gray-500">Net Margin</p>
            <p className="text-lg font-bold text-blue-600">
              {formatCurrency(
                incomeVsExpenseData.reduce((s, d) => s + d.income - d.expense, 0)
              )}
            </p>
          </div>
        </div>
      </ReportCard>
    </div>
  );
}
