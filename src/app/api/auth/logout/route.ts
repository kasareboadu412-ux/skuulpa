import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

/**
 * POST /api/auth/logout
 *
 * Sign the current user out, clear all session cookies,
 * and return a confirmation.
 *
 * Response on success:
 *   { success: true, message: "Logged out successfully." }
 */
export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();

    // Sign out from Supabase Auth — this clears the session cookie
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      // Even if Supabase logout fails, we should still clear cookies
    }

    // Create a response that clears all Supabase-related cookies
    const response = NextResponse.json(
      {
        success: true,
        message: "Logged out successfully.",
      },
      { status: 200 }
    );

    // Get all cookies from the request and clear Supabase auth cookies
    // Supabase uses cookies named like `sb-{project-ref}-auth-token`
    const allCookies = await getRequestCookies();

    for (const [name] of allCookies) {
      if (name.startsWith("sb-")) {
        response.cookies.set(name, "", {
          maxAge: 0,
          path: "/",
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
      }
    }

    // Also clear the default auth cookie (standard Supabase cookie name)
    response.cookies.set("supabase-auth-token", "", {
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Failed to log out. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * Helper to get cookies from the request in a way compatible
 * with Next.js 15+ cookie API.
 */
async function getRequestCookies(): Promise<Map<string, string>> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const entries = cookieStore.getAll();
    const map = new Map<string, string>();
    for (const c of entries) {
      map.set(c.name, c.value);
    }
    return map;
  } catch {
    // In edge cases, return empty
    return new Map();
  }
}
