import { NextResponse } from "next/server";
import { getCurrentUser, getServiceClient } from "./supabase-server";
import { getSchoolModules, type ModuleKey } from "./modules";

export type StaffAuthContext = {
  userId: string;
  schoolId: string;
  role: string;
};

export type ParentAuthContext = {
  userId: string;
  parentPhone: string;
};

export type SuperAdminAuthContext = {
  userId: string;
};

/**
 * Require an authenticated staff user (proprietor, admin, teacher).
 * Returns context with their school_id, or a 401/403 Response.
 *
 * School_id resolution order:
 *  1. user_metadata.school_id (set on registration)
 *  2. teachers table lookup (fallback for older accounts)
 */
export async function requireStaff(): Promise<StaffAuthContext | NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (user.user_metadata?.role as string) || "";
  if (role === "parent" || !role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let schoolId = user.user_metadata?.school_id as string | undefined;

  if (!schoolId) {
    const db = getServiceClient();
    const { data: teacher } = await db
      .from("teachers")
      .select("school_id")
      .eq("user_id", user.id)
      .maybeSingle();
    schoolId = (teacher as { school_id: string } | null)?.school_id ?? undefined;
  }

  if (!schoolId) {
    return NextResponse.json({ error: "No school associated with your account" }, { status: 403 });
  }

  return { userId: user.id, schoolId, role };
}

/**
 * Require an authenticated staff user whose school's plan includes a given
 * module. Returns the staff context, or a 401/403 Response (403 with an
 * upgrade hint when the module is not in their plan).
 */
export async function requireStaffModule(
  moduleKey: ModuleKey
): Promise<StaffAuthContext | NextResponse> {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;

  const modules = await getSchoolModules(auth.schoolId);
  if (!modules.includes(moduleKey)) {
    return NextResponse.json(
      { error: "This module is not included in your subscription plan.", code: "module_not_in_plan", module: moduleKey },
      { status: 403 }
    );
  }
  return auth;
}

/**
 * Require an authenticated parent user.
 * Returns context with their phone number, or a 401/403 Response.
 */
export async function requireParent(): Promise<ParentAuthContext | NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = user.user_metadata?.role as string | undefined;
  if (role !== "parent") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parentPhone = (user.phone || (user.user_metadata?.phone as string | undefined))?.replace(
    /\s+/g,
    ""
  );
  if (!parentPhone) {
    return NextResponse.json({ error: "No phone number associated with account" }, { status: 400 });
  }

  return { userId: user.id, parentPhone };
}

/**
 * Require a super-admin user.
 * Checks the super_admins table for a matching email.
 */
export async function requireSuperAdmin(): Promise<SuperAdminAuthContext | NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = user.email?.toLowerCase().trim() ?? "";

  // Accept the hardcoded platform owner email from env (no DB lookup needed).
  const envEmail = (process.env.SUPER_ADMIN_EMAIL ?? "").toLowerCase().trim();
  if (envEmail && userEmail === envEmail) {
    return { userId: user.id };
  }

  // Also accept any row in the super_admins table.
  const db = getServiceClient();
  const { data: superAdmin } = await db
    .from("super_admins")
    .select("id")
    .eq("email", userEmail)
    .maybeSingle();

  if (!superAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { userId: user.id };
}

/**
 * Verify that a student belongs to the given parent (by user_id or phone number).
 * Used to prevent IDOR on parent API routes.
 */
export async function verifyParentOwnsStudent(
  studentId: string,
  userId: string,
  parentPhone: string
): Promise<boolean> {
  const db = getServiceClient();
  const { data } = await db
    .from("students")
    .select("id")
    .eq("id", studentId)
    .or(
      `parent_user_id.eq.${userId},parent_primary_phone.eq.${parentPhone},parent_secondary_phone.eq.${parentPhone}`
    )
    .eq("status", "active")
    .maybeSingle();
  return !!data;
}

/**
 * Verify that a student belongs to the given school.
 */
export async function verifyStudentBelongsToSchool(
  studentId: string,
  schoolId: string
): Promise<boolean> {
  const db = getServiceClient();
  const { data } = await db
    .from("students")
    .select("id")
    .eq("id", studentId)
    .eq("school_id", schoolId)
    .maybeSingle();
  return !!data;
}

/**
 * Verify that a class belongs to the given school.
 */
export async function verifyClassBelongsToSchool(
  classId: string,
  schoolId: string
): Promise<boolean> {
  const db = getServiceClient();
  const { data } = await db
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("school_id", schoolId)
    .maybeSingle();
  return !!data;
}
