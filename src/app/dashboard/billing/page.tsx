"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { splitFeatures, GATED_MODULES } from "@/lib/modules-shared";
import { toast } from "sonner";
import { Check, Loader2, Sparkles, AlertTriangle, CreditCard, CalendarClock } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  code: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  max_students: number;
  max_teachers: number;
  features: string[];
}

interface BillingData {
  subscription: { status?: string; plan?: { name?: string } | null } | null;
  plans: Plan[];
  days_left: number | null;
  expired: boolean;
  is_trial: boolean;
  current_plan_id: string | null;
  current_plan_code: string | null;
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="p-6"><div className="h-64 bg-gray-100 rounded-xl animate-pulse" /></div>}>
      <BillingContent />
    </Suspense>
  );
}

function BillingContent() {
  const params = useSearchParams();
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [payingPlan, setPayingPlan] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/me");
      const json = await res.json();
      if (res.ok) setData(json.data);
    } catch {
      toast.error("Failed to load billing");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Show a toast if returning from a successful Paystack payment.
  useEffect(() => {
    if (params.get("status") === "success") {
      toast.success("Payment received! Your plan is being activated.");
      // Re-poll a few times since the webhook may take a moment.
      const t = setTimeout(() => void load(), 3000);
      return () => clearTimeout(t);
    }
  }, [params, load]);

  const handleSubscribe = async (plan: Plan) => {
    const price = billing === "yearly" ? plan.price_yearly : plan.price_monthly;
    if (price <= 0) {
      toast.info("This is a free plan — contact support to switch down.");
      return;
    }
    setPayingPlan(plan.id);
    try {
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: plan.id, billing }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Could not start payment");
        return;
      }
      // Redirect to Paystack checkout.
      window.location.href = json.authorization_url;
    } catch {
      toast.error("Network error");
    } finally {
      setPayingPlan(null);
    }
  };

  if (loading) {
    return <div className="p-6 space-y-4"><div className="h-8 bg-gray-200 rounded w-48 animate-pulse" /><div className="h-64 bg-gray-100 rounded-xl animate-pulse" /></div>;
  }

  const yearlyDiscount = (p: Plan) =>
    p.price_monthly > 0 ? Math.round((1 - p.price_yearly / (p.price_monthly * 12)) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Billing & Subscription
        </h1>
        <p className="text-sm text-gray-500 mt-1">Manage your Skuulr plan and payments.</p>
      </div>

      {/* Current status banner */}
      {data && (
        <Card className={`border-2 ${data.expired ? "border-red-300" : data.is_trial ? "border-amber-300" : "border-green-300"}`}>
          <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                data.expired ? "bg-red-100" : data.is_trial ? "bg-amber-100" : "bg-green-100"
              }`}>
                {data.expired ? <AlertTriangle className="h-5 w-5 text-red-600" />
                  : data.is_trial ? <CalendarClock className="h-5 w-5 text-amber-600" />
                  : <Check className="h-5 w-5 text-green-600" />}
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {data.subscription?.plan?.name ?? "Free"} plan
                  {" · "}
                  <span className={data.expired ? "text-red-600" : data.is_trial ? "text-amber-600" : "text-green-600"}>
                    {data.expired ? "Expired" : data.is_trial ? "Trial" : "Active"}
                  </span>
                </p>
                <p className="text-sm text-gray-500">
                  {data.expired
                    ? "Your access has ended. Choose a plan below to continue."
                    : data.days_left !== null
                    ? `${data.days_left} day${data.days_left === 1 ? "" : "s"} remaining`
                    : "No expiry"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing cycle toggle */}
      <div className="flex items-center justify-center">
        <div className="inline-flex rounded-xl border border-gray-200 p-1 bg-gray-50">
          {(["monthly", "yearly"] as const).map((b) => (
            <button key={b} type="button" onClick={() => setBilling(b)}
              className={`px-5 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer ${billing === b ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}>
              {b === "monthly" ? "Monthly" : "Yearly"}
              {b === "yearly" && <span className="ml-1.5 text-xs font-semibold" style={{ color: "hsl(150 80% 24%)" }}>save up to 17%</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(data?.plans ?? []).map((plan) => {
          const isCurrent = plan.id === data?.current_plan_id;
          const price = billing === "yearly" ? plan.price_yearly : plan.price_monthly;
          const modules = splitFeatures(plan.features).modules;
          const marketing = splitFeatures(plan.features).marketing;
          const popular = plan.code === "premium";

          return (
            <div key={plan.id}
              className={`relative rounded-2xl border bg-white p-5 flex flex-col ${popular ? "border-2 shadow-lg" : "border-gray-200"}`}
              style={popular ? { borderColor: "hsl(150 80% 24%)" } : undefined}>
              {popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold text-white flex items-center gap-1"
                  style={{ background: "hsl(150 80% 24%)" }}>
                  <Sparkles className="h-3 w-3" /> Popular
                </div>
              )}
              <p className="font-bold text-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{plan.name}</p>
              <p className="text-xs text-gray-500 mb-3 min-h-[32px]">{plan.description}</p>
              <div className="mb-1">
                <span className="text-3xl font-bold">{price <= 0 ? "Free" : formatCurrency(price)}</span>
                {price > 0 && <span className="text-sm text-gray-500">/{billing === "yearly" ? "yr" : "mo"}</span>}
              </div>
              {billing === "yearly" && yearlyDiscount(plan) > 0 && (
                <p className="text-xs text-green-600 mb-3">Save {yearlyDiscount(plan)}% vs monthly</p>
              )}

              <div className="text-xs text-gray-500 mb-3 mt-2 space-y-0.5">
                <p>{plan.max_students === 0 ? "Unlimited" : `Up to ${plan.max_students}`} students</p>
                <p>{plan.max_teachers === 0 ? "Unlimited" : `Up to ${plan.max_teachers}`} teachers</p>
              </div>

              {/* Modules included */}
              <div className="space-y-1.5 flex-1 mb-4">
                {GATED_MODULES.map((m) => {
                  const on = modules.includes(m.key);
                  return (
                    <div key={m.key} className={`flex items-center gap-2 text-xs ${on ? "text-gray-700" : "text-gray-300 line-through"}`}>
                      <Check className={`h-3.5 w-3.5 flex-shrink-0 ${on ? "text-green-500" : "text-gray-300"}`} />
                      {m.label}
                    </div>
                  );
                })}
                {marketing.slice(0, 2).map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-700">
                    <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" /> {f}
                  </div>
                ))}
              </div>

              {isCurrent ? (
                <Button disabled variant="outline" className="w-full">Current Plan</Button>
              ) : (
                <Button
                  onClick={() => handleSubscribe(plan)}
                  disabled={payingPlan === plan.id}
                  className="w-full text-white"
                  style={{ background: popular ? "hsl(150 80% 24%)" : "hsl(150 40% 30%)" }}
                >
                  {payingPlan === plan.id ? <Loader2 className="h-4 w-4 animate-spin" />
                    : price <= 0 ? "Downgrade" : <><CreditCard className="h-4 w-4 mr-1" /> Subscribe</>}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-gray-400">
        Secure payments by Paystack · Pay with MTN MoMo, Telecel Cash, AirtelTigo Money, or card.
      </p>
    </div>
  );
}
