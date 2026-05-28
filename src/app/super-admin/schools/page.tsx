"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Building2,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  PauseCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Users,
  Mail,
  Phone,
  Calendar,
  Shield,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

// ─── Types ───

type SchoolSubscription = {
  id: string;
  school_id: string;
  plan_id: string;
  status: string;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  auto_renew: boolean;
  subscription_plans: {
    name: string;
    code: string;
  } | null;
};

type School = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  short_code: string | null;
  status: string;
  approved_at: string | null;
  created_at: string;
  student_count: number;
  school_subscriptions: SchoolSubscription[];
};

type PaginationInfo = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// ─── Helpers ───

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

function SubStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" | "secondary" }> = {
    active: { label: "Active", variant: "success" },
    trial: { label: "Trial", variant: "secondary" },
    past_due: { label: "Past Due", variant: "warning" },
    canceled: { label: "Canceled", variant: "danger" },
    expired: { label: "Expired", variant: "info" },
  };
  const s = map[status] || { label: status, variant: "info" as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

const ALL_VALUE = "__all__";

const statusOptions = [
  { value: ALL_VALUE, label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "pending_approval", label: "Pending" },
  { value: "suspended", label: "Suspended" },
  { value: "disabled", label: "Disabled" },
];

const planOptions = [
  { value: ALL_VALUE, label: "All Plans" },
  { value: "free", label: "Free" },
  { value: "basic", label: "Basic" },
  { value: "premium", label: "Premium" },
  { value: "enterprise", label: "Enterprise" },
];

// ─── Edit Status Dialog ───

function EditStatusDialog({
  school,
  open,
  onOpenChange,
  onSaved,
}: {
  school: School | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [newStatus, setNewStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (school) setNewStatus(school.status);
  }, [school]);

  const handleSave = async () => {
    if (!school || !newStatus || newStatus === school.status) {
      onOpenChange(false);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/super-admin/schools", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: school.id, status: newStatus }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update status");
      }

      toast.success(
        `${school.name} is now ${newStatus.replace("_", " ")}`
      );
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit School Status</DialogTitle>
          <DialogDescription>
            Change the platform status for <strong>{school?.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Select value={newStatus} onValueChange={setNewStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending_approval">Pending Approval</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>

          {newStatus === "suspended" && (
            <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Suspending this school will prevent all users from accessing
                  their dashboard until reactivated.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || newStatus === school?.status}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── School Detail Row ───

function SchoolDetailRow({ school }: { school: School }) {
  const sub = school.school_subscriptions?.[0];

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-gray-500 font-medium">Short Code</p>
          <p className="text-sm text-gray-900 mt-0.5">
            {school.short_code || "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium">Address</p>
          <p className="text-sm text-gray-900 mt-0.5">
            {school.address || "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium">Approved At</p>
          <p className="text-sm text-gray-900 mt-0.5">
            {school.approved_at ? formatDate(school.approved_at) : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium">Registered</p>
          <p className="text-sm text-gray-900 mt-0.5">
            {formatDate(school.created_at)}
          </p>
        </div>
      </div>

      {sub && (
        <div className="border-t border-gray-200 pt-3">
          <p className="text-xs text-gray-500 font-medium mb-2">
            Subscription Details
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500">Plan</p>
              <p className="text-sm font-medium text-gray-900">
                {sub.subscription_plans?.name || "Unknown"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <div className="mt-0.5">
                <SubStatusBadge status={sub.status} />
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500">Period End</p>
              <p className="text-sm text-gray-900">
                {sub.current_period_end
                  ? formatDate(sub.current_period_end)
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Auto Renew</p>
              <p className="text-sm text-gray-900">
                {sub.auto_renew ? "Yes" : "No"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Schools Page ───

export default function SuperAdminSchools() {
  const [schools, setSchools] = useState<School[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL_VALUE);
  const [planFilter, setPlanFilter] = useState(ALL_VALUE);
  const [expandedSchool, setExpandedSchool] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadSchools = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter && statusFilter !== ALL_VALUE) params.set("status", statusFilter);
      if (planFilter && planFilter !== ALL_VALUE) params.set("plan", planFilter);
      params.set("page", String(pagination.page));

      const res = await fetch(`/api/super-admin/schools?${params}`);
      if (!res.ok) throw new Error("Failed to load schools");
      const json = await res.json();

      setSchools(json.data || []);
      setPagination((prev) => ({
        ...prev,
        total: json.total || 0,
        totalPages: json.totalPages || 0,
      }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load schools");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, planFilter, pagination.page]);

  useEffect(() => {
    loadSchools();
  }, [loadSchools]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [debouncedSearch, statusFilter, planFilter]);

  const handleEditStatus = (school: School) => {
    setEditingSchool(school);
    setEditDialogOpen(true);
  };

  const handleQuickAction = async (
    school: School,
    newStatus: string
  ) => {
    try {
      const res = await fetch("/api/super-admin/schools", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: school.id, status: newStatus }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }

      toast.success(
        `${school.name} is now ${newStatus.replace("_", " ")}`
      );
      loadSchools();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Schools</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage all schools on the platform
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or phone..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="All Plans" />
              </SelectTrigger>
              <SelectContent>
                {planOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={loadSchools}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Schools table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>
            All Schools
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({pagination.total})
            </span>
          </CardTitle>
          <CardDescription>
            View, filter, and manage school accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 bg-gray-100 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : schools.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-sm text-gray-400">
              <Building2 className="h-10 w-10 mb-3" />
              <p className="font-medium text-gray-500">No schools found</p>
              <p className="mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>School</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schools.map((school) => (
                      <Fragment key={school.id}>
                        <TableRow
                          className="cursor-pointer"
                          onClick={() =>
                            setExpandedSchool(
                              expandedSchool === school.id ? null : school.id
                            )
                          }
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                                <Building2 className="h-4 w-4 text-purple-700" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {school.name}
                                </p>
                                {school.short_code && (
                                  <p className="text-xs text-gray-400">
                                    {school.short_code}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              {school.email && (
                                <p className="text-sm text-gray-600 flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {school.email}
                                </p>
                              )}
                              {school.phone && (
                                <p className="text-sm text-gray-600 flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {school.phone}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Users className="h-3.5 w-3.5 text-gray-400" />
                              {school.student_count}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium">
                              {school.school_subscriptions?.[0]?.subscription_plans
                                ?.name || "Free"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <SchoolStatusBadge status={school.status} />
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(school.created_at)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {school.status === "pending_approval" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickAction(school, "active");
                                  }}
                                  title="Approve"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                              {school.status === "active" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickAction(school, "suspended");
                                  }}
                                  title="Suspend"
                                >
                                  <PauseCircle className="h-4 w-4" />
                                </Button>
                              )}
                              {school.status === "suspended" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickAction(school, "active");
                                  }}
                                  title="Reactivate"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditStatus(school);
                                }}
                              >
                                <Shield className="h-4 w-4 mr-1" />
                                Status
                              </Button>
                              {expandedSchool === school.id ? (
                                <ChevronUp className="h-4 w-4 text-gray-400" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        {expandedSchool === school.id && (
                          <TableRow>
                            <TableCell colSpan={7} className="p-4">
                              <SchoolDetailRow school={school} />
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {schools.map((school) => (
                  <div key={school.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-purple-700" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {school.name}
                          </p>
                          {school.short_code && (
                            <p className="text-xs text-gray-400">
                              {school.short_code}
                            </p>
                          )}
                        </div>
                      </div>
                      <SchoolStatusBadge status={school.status} />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {school.email || "—"}
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {school.phone || "—"}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {school.student_count} students
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(school.created_at)}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">
                        {school.school_subscriptions?.[0]?.subscription_plans
                          ?.name || "Free"}
                      </span>
                      <div className="flex gap-1">
                        {school.status === "pending_approval" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-green-600 text-xs"
                            onClick={() => handleQuickAction(school, "active")}
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                            Approve
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs"
                          onClick={() => handleEditStatus(school)}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>

                    {expandedSchool === school.id && (
                      <div className="mt-3">
                        <SchoolDetailRow school={school} />
                      </div>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2 text-xs text-gray-500"
                      onClick={() =>
                        setExpandedSchool(
                          expandedSchool === school.id ? null : school.id
                        )
                      }
                    >
                      {expandedSchool === school.id ? (
                        <>
                          <ChevronUp className="h-3.5 w-3.5 mr-1" />
                          Less Details
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3.5 w-3.5 mr-1" />
                          More Details
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-4">
                  <p className="text-sm text-gray-500">
                    Showing page {pagination.page} of {pagination.totalPages}
                    &nbsp;({pagination.total} total)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          page: prev.page - 1,
                        }))
                      }
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          page: prev.page + 1,
                        }))
                      }
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit status dialog */}
      <EditStatusDialog
        school={editingSchool}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSaved={loadSchools}
      />
    </div>
  );
}
