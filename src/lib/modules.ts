import { getServiceClient } from "./supabase-server";
import { getPlanModules } from "./modules-shared";

export * from "./modules-shared";

const ALL_KEYS = ["admissions", "bus", "feeding", "academics", "reports", "accounting"];

/**
 * Resolve the set of gated modules a school may use, based on its current
 * subscription plan. Defaults to all modules when no plan is found.
 */
export async function getSchoolModules(schoolId: string): Promise<string[]> {
  const db = getServiceClient();
  const { data: sub } = await db
    .from("school_subscriptions")
    .select("status, created_at, plan:subscription_plans(features)")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const planRaw = (sub as { plan?: { features?: unknown } | { features?: unknown }[] } | null)?.plan;
  const plan = Array.isArray(planRaw) ? planRaw[0] : planRaw;
  if (!plan) return [...ALL_KEYS];
  return getPlanModules(plan.features);
}
