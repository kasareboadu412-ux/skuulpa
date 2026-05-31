import { getServiceClient } from "./supabase-server";

/**
 * Result of ensuring a parent login account exists.
 *
 * - `userId`  — the Supabase Auth user id for the parent (null if it could not
 *               be resolved or the phone was invalid).
 * - `pin`     — the parent's login PIN, ONLY returned when a brand-new account
 *               was just created. For reused/existing accounts it is null
 *               because we never store or reset the PIN.
 * - `created` — true when a new auth account was provisioned this call.
 */
export interface ParentProvisionResult {
  userId: string | null;
  pin: string | null;
  created: boolean;
  error?: string;
}

/**
 * Normalize a phone number to a digits-only-ish key used for the parent's
 * synthetic auth email. Strips whitespace; keeps a leading "+" if present.
 */
export function normalizeParentPhone(phone: string): string {
  return phone.trim().replace(/\s+/g, "");
}

/**
 * Ensure a parent login account exists for the given phone number.
 *
 * Parents log in with phone + PIN. Under the hood each parent is a Supabase
 * Auth user keyed by a synthetic email `parent_<phone>@skuulr.parent`, with the
 * PIN stored as their password and `{ role: "parent" }` in user metadata.
 *
 * This is idempotent:
 *  - If another student already references a parent account for this phone, we
 *    reuse that account (multi-child families share one login).
 *  - Otherwise a new account is created with a default PIN (last 4 phone digits),
 *    which is returned so staff can share it with the parent.
 */
export async function ensureParentAccount(
  phone: string | null | undefined,
  name: string
): Promise<ParentProvisionResult> {
  const normalized = phone ? normalizeParentPhone(phone) : "";
  // A valid Ghana mobile number has at least 10 digits; skip junk/empty values.
  if (normalized.replace(/\D/g, "").length < 10) {
    return { userId: null, pin: null, created: false };
  }

  const db = getServiceClient();

  // ── Reuse an existing parent account for this phone (e.g. siblings) ──
  const { data: sibling } = await db
    .from("students")
    .select("parent_user_id")
    .or(`parent_primary_phone.eq.${normalized},parent_secondary_phone.eq.${normalized}`)
    .not("parent_user_id", "is", null)
    .limit(1)
    .maybeSingle();

  const existingUserId = (sibling as { parent_user_id: string | null } | null)?.parent_user_id ?? null;
  if (existingUserId) {
    return { userId: existingUserId, pin: null, created: false };
  }

  // ── Create a fresh parent auth account ──
  const email = `parent_${normalized}@skuulr.parent`;
  const digits = normalized.replace(/\D/g, "");
  const pin = digits.slice(-4);

  const { data, error } = await db.auth.admin.createUser({
    email,
    password: pin,
    email_confirm: true,
    user_metadata: { role: "parent", name, phone: normalized },
  });

  if (error || !data?.user) {
    // Most likely the auth user already exists but no student referenced it yet.
    // We can't recover the PIN here; surface the situation without failing the
    // caller's primary operation (creating the student).
    const alreadyExists = (error?.message ?? "").toLowerCase().includes("already");
    return {
      userId: null,
      pin: null,
      created: false,
      error: alreadyExists ? "Parent login already exists for this phone." : error?.message,
    };
  }

  return { userId: data.user.id, pin, created: true };
}
