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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Plus,
  Pencil,
  Loader2,
  Users,
  DollarSign,
  ArrowUpDown,
  GripVertical,
  RefreshCw,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { GATED_MODULES, splitFeatures, combineFeatures } from "@/lib/modules-shared";
import { toast } from "sonner";

// ─── Types ───

type PlanFeature = string;

type SubscriptionPlan = {
  id: string;
  name: string;
  code: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  max_students: number;
  max_teachers: number;
  features: PlanFeature[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

// ─── Plan Form ───

type PlanFormData = {
  name: string;
  code: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  max_students: number;
  max_teachers: number;
  features: PlanFeature[];
  modules: string[];
  is_active: boolean;
  sort_order: number;
};

const emptyForm: PlanFormData = {
  name: "",
  code: "",
  description: "",
  price_monthly: 0,
  price_yearly: 0,
  max_students: 50,
  max_teachers: 10,
  features: [],
  modules: GATED_MODULES.map((m) => m.key),
  is_active: true,
  sort_order: 0,
};

// ─── Plan Form Dialog ───

function PlanFormDialog({
  plan,
  open,
  onOpenChange,
  onSaved,
}: {
  plan: SubscriptionPlan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const isEditing = !!plan;
  const [form, setForm] = useState<PlanFormData>(emptyForm);
  const [featureInput, setFeatureInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (plan) {
      const { modules, marketing } = splitFeatures(plan.features || []);
      setForm({
        name: plan.name,
        code: plan.code,
        description: plan.description || "",
        price_monthly: plan.price_monthly,
        price_yearly: plan.price_yearly,
        max_students: plan.max_students,
        max_teachers: plan.max_teachers,
        features: marketing,
        modules,
        is_active: plan.is_active,
        sort_order: plan.sort_order,
      });
    } else {
      setForm(emptyForm);
    }
    setFeatureInput("");
  }, [plan, open]);

  const addFeature = () => {
    const trimmed = featureInput.trim();
    if (trimmed && !form.features.includes(trimmed)) {
      setForm((prev) => ({ ...prev, features: [...prev.features, trimmed] }));
      setFeatureInput("");
    }
  };

  const removeFeature = (feature: string) => {
    setForm((prev) => ({
      ...prev,
      features: prev.features.filter((f) => f !== feature),
    }));
  };

  const handleSave = async () => {
    if (!form.name || !form.code) {
      toast.error("Name and code are required");
      return;
    }

    setSaving(true);
    try {
      const url = "/api/super-admin/plans";
      const method = isEditing ? "PATCH" : "POST";
      const { modules, features, ...rest } = form;
      const payload = { ...rest, features: combineFeatures(modules, features) };
      const body = isEditing ? { id: plan!.id, ...payload } : payload;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save plan");
      }

      toast.success(
        isEditing ? "Plan updated successfully" : "Plan created successfully"
      );
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Plan" : "Create Plan"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the subscription plan details"
              : "Add a new subscription plan for schools"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="planName">Plan Name *</Label>
              <Input
                id="planName"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Premium"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="planCode">Code *</Label>
              <Input
                id="planCode"
                value={form.code}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, code: e.target.value }))
                }
                placeholder="e.g. premium"
                disabled={isEditing}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="planDescription">Description</Label>
            <Input
              id="planDescription"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Brief description of the plan"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priceMonthly">Monthly Price (GHS)</Label>
              <Input
                id="priceMonthly"
                type="number"
                min="0"
                step="0.01"
                value={form.price_monthly}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    price_monthly: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priceYearly">Yearly Price (GHS)</Label>
              <Input
                id="priceYearly"
                type="number"
                min="0"
                step="0.01"
                value={form.price_yearly}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    price_yearly: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxStudents">
                Max Students (0 = unlimited)
              </Label>
              <Input
                id="maxStudents"
                type="number"
                min="0"
                value={form.max_students}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    max_students: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxTeachers">
                Max Teachers (0 = unlimited)
              </Label>
              <Input
                id="maxTeachers"
                type="number"
                min="0"
                value={form.max_teachers}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    max_teachers: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                min="0"
                value={form.sort_order}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    sort_order: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="space-y-2 flex items-end pb-2">
              <Label className="relative inline-flex items-center cursor-pointer gap-2">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, is_active: e.target.checked }))
                  }
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                <span className="text-sm font-medium">Active Plan</span>
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Modules included in this tier</Label>
            <p className="text-xs text-gray-500">
              Schools on this plan can access the checked modules. Unchecked modules are hidden and blocked.
              Core areas (Students, Fees, Teachers, Attendance, Settings) are always included.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {GATED_MODULES.map((m) => {
                const checked = form.modules.includes(m.key);
                return (
                  <label key={m.key} className="flex items-center gap-2 rounded-md border p-2 text-sm cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          modules: e.target.checked
                            ? [...prev.modules, m.key]
                            : prev.modules.filter((k) => k !== m.key),
                        }))
                      }
                    />
                    {m.label}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Marketing features (shown on pricing page)</Label>
            <div className="flex gap-2">
              <Input
                value={featureInput}
                onChange={(e) => setFeatureInput(e.target.value)}
                placeholder="Add a feature..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addFeature();
                  }
                }}
              />
              <Button
                variant="outline"
                type="button"
                onClick={addFeature}
                disabled={!featureInput.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {form.features.length === 0 && (
                <p className="text-xs text-gray-400">No features added yet</p>
              )}
              {form.features.map((feature, idx) => (
                <Badge
                  key={`${feature}-${idx}`}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                >
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  {feature}
                  <button
                    onClick={() => removeFeature(feature)}
                    className="ml-1 hover:text-red-500"
                  >
                    <XCircle className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : isEditing ? (
              "Update Plan"
            ) : (
              "Create Plan"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Plans Page ───

export default function SuperAdminPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/plans");
      if (!res.ok) throw new Error("Failed to load plans");
      const json = await res.json();
      setPlans(json.data || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const handleToggleActive = async (plan: SubscriptionPlan) => {
    setTogglingId(plan.id);
    try {
      const res = await fetch("/api/super-admin/plans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: plan.id,
          is_active: !plan.is_active,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update plan");
      }

      toast.success(
        `${plan.name} is now ${plan.is_active ? "inactive" : "active"}`
      );
      loadPlans();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setTogglingId(null);
    }
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Subscription Plans
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage pricing tiers and plan features
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadPlans}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingPlan(null);
              setCreateDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Plan
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-24 bg-gray-200 rounded animate-pulse mb-4" />
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div
                      key={j}
                      className="h-4 w-full bg-gray-200 rounded animate-pulse"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-sm text-gray-400">
          <CreditCard className="h-12 w-12 mb-3" />
          <p className="font-medium text-gray-500">No plans configured</p>
          <p className="mt-1">Create your first subscription plan</p>
          <Button
            className="mt-4"
            onClick={() => {
              setEditingPlan(null);
              setCreateDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Plan
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative flex flex-col ${
                !plan.is_active ? "opacity-60" : ""
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {plan.name}
                      {!plan.is_active && (
                        <Badge variant="outline" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {plan.description}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400 mr-1">
                      #{plan.sort_order}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(plan)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {/* Pricing */}
                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                    <span className="text-3xl font-bold text-gray-900">
                      {plan.price_monthly === 0
                        ? "Free"
                        : formatCurrency(plan.price_monthly)}
                    </span>
                    {plan.price_monthly > 0 && (
                      <span className="text-sm text-gray-500">/month</span>
                    )}
                  </div>
                  {plan.price_yearly > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      {formatCurrency(plan.price_yearly)} /year
                    </p>
                  )}
                </div>

                {/* Limits */}
                <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                  <div className="rounded-lg bg-gray-50 p-2 text-center">
                    <Users className="h-4 w-4 mx-auto text-gray-400 mb-1" />
                    <p className="text-xs text-gray-500">Students</p>
                    <p className="font-semibold">
                      {plan.max_students === 0
                        ? "Unlimited"
                        : plan.max_students.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-2 text-center">
                    <Users className="h-4 w-4 mx-auto text-gray-400 mb-1" />
                    <p className="text-xs text-gray-500">Teachers</p>
                    <p className="font-semibold">
                      {plan.max_teachers === 0
                        ? "Unlimited"
                        : plan.max_teachers.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Modules + Features */}
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                    Modules
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {GATED_MODULES.map((m) => {
                      const on = splitFeatures(plan.features || []).modules.includes(m.key);
                      return (
                        <Badge key={m.key} variant={on ? "secondary" : "outline"} className={on ? "" : "opacity-40 line-through"}>
                          {m.label}
                        </Badge>
                      );
                    })}
                  </div>
                  <ul className="space-y-1.5">
                    {splitFeatures(plan.features || []).marketing.map((feature, idx) => (
                      <li
                        key={`${plan.id}-feature-${idx}`}
                        className="flex items-start gap-2 text-sm text-gray-700"
                      >
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Toggle */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {plan.is_active ? "Active" : "Inactive"}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(plan)}
                      disabled={togglingId === plan.id}
                    >
                      {togglingId === plan.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      ) : plan.is_active ? (
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      )}
                      {plan.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <PlanFormDialog
        plan={editingPlan}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSaved={loadPlans}
      />

      {/* Create dialog */}
      <PlanFormDialog
        plan={null}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSaved={loadPlans}
      />
    </div>
  );
}
