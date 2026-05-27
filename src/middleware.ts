import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge middleware that protects routes based on authentication status.
 *
 * Protected route groups (must be authenticated):
 *   - /dashboard/*   → School proprietors and admins
 *   - /admin/*       → School administrators
 *   - /teacher/*     → Teachers
 *   - /parent/*      → Parents
 *
 * Public routes (no auth required):
 *   - /              → Landing / home
 *   - /auth/*        → Login, register, forgot password
 *   - /api/public/*  → Public API endpoints
 *   - /api/auth/*    → Auth API endpoints (login, register, logout)
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ─── Public paths that bypass auth check ───
  const publicPaths = ["/", "/auth/login", "/auth/register", "/auth/forgot-password"];
  const isPublicPath =
    publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/api/public/") ||
    pathname.startsWith("/api/auth/");

  if (isPublicPath) {
    // If user is authenticated and visits auth pages, redirect to dashboard
    if (user && pathname.startsWith("/auth/")) {
      const destination = getDefaultRedirect(user.user_metadata?.role as string | undefined);
      const url = request.nextUrl.clone();
      url.pathname = destination;
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // ─── Protected routes ───
  const protectedPrefixes = ["/dashboard", "/admin", "/teacher", "/parent"];
  const isProtectedRoute = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (isProtectedRoute && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ─── Role-based route access control ───
  if (user && isProtectedRoute) {
    const role = user.user_metadata?.role as string | undefined;
    const hasAccess = hasRouteAccess(pathname, role);

    if (!hasAccess) {
      const destination = getDefaultRedirect(role);
      const url = request.nextUrl.clone();
      url.pathname = destination;
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

/**
 * Get the default dashboard redirect for a given user role.
 */
function getDefaultRedirect(role: string | undefined): string {
  switch (role) {
    case "proprietor":
    case "admin":
      return "/dashboard";
    case "teacher":
      return "/teacher";
    case "parent":
      return "/parent";
    default:
      return "/dashboard";
  }
}

/**
 * Check whether a user role is allowed to access a given route path.
 */
function hasRouteAccess(pathname: string, role: string | undefined): boolean {
  if (!role) return false;

  // Proprietors and admins can access dashboard and admin routes
  if (role === "proprietor" || role === "admin") {
    return pathname.startsWith("/dashboard") || pathname.startsWith("/admin");
  }

  // Teachers can access teacher routes
  if (role === "teacher") {
    return pathname.startsWith("/teacher");
  }

  // Parents can access parent routes
  if (role === "parent") {
    return pathname.startsWith("/parent");
  }

  return false;
}

/**
 * Match all routes except static assets, Next.js internals, and common file types.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
