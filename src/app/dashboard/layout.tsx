"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  CreditCard,
  Users,
  Bus,
  UtensilsCrossed,
  BookOpen,
  GraduationCap,
  ClipboardCheck,
  FileBarChart,
  Settings,
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  X,
  School,
  UserPlus,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@radix-ui/react-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import { toast } from "sonner";

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Admissions", href: "/dashboard/admissions", icon: UserPlus, module: "admissions" },
  { name: "Students", href: "/dashboard/students", icon: Users },
  { name: "Fees", href: "/dashboard/fees", icon: CreditCard },
  { name: "Accounting", href: "/dashboard/expenses", icon: Wallet, module: "accounting" },
  { name: "Bus", href: "/dashboard/bus", icon: Bus, module: "bus" },
  { name: "Feeding", href: "/dashboard/feeding", icon: UtensilsCrossed, module: "feeding" },
  { name: "Academics", href: "/dashboard/academics", icon: BookOpen, module: "academics" },
  { name: "Classes", href: "/dashboard/classes", icon: BookOpen, module: "academics" },
  { name: "Teachers", href: "/dashboard/teachers", icon: GraduationCap },
  { name: "Attendance", href: "/dashboard/attendance", icon: ClipboardCheck },
  { name: "Reports", href: "/dashboard/reports", icon: FileBarChart, module: "reports" },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

interface ProfileInfo {
  schoolName: string;
  userName: string;
  initials: string;
}

function deriveInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2) || "US";
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileInfo>({
    schoolName: "Skuulr",
    userName: "Administrator",
    initials: "AD",
  });
  const [loggingOut, setLoggingOut] = useState(false);
  const [enabledModules, setEnabledModules] = useState<string[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/schools/modules");
        if (res.ok) {
          const data = await res.json();
          setEnabledModules(data.modules ?? []);
        } else {
          setEnabledModules([]);
        }
      } catch {
        setEnabledModules([]);
      }
    })();
  }, []);

  const visibleNav = navigation.filter(
    (item) => !item.module || enabledModules === null || enabledModules.includes(item.module)
  );

  useEffect(() => {
    (async () => {
      try {
        const [schoolRes, teacherRes] = await Promise.all([
          fetch("/api/schools/me"),
          fetch("/api/teachers/me"),
        ]);
        const updates: Partial<ProfileInfo> = {};
        if (schoolRes.ok) {
          const data = await schoolRes.json();
          if (data.data?.name) updates.schoolName = data.data.name;
        }
        if (teacherRes.ok) {
          const data = await teacherRes.json();
          const t = data.data?.teacher;
          if (t) {
            const name = `${t.first_name ?? ""} ${t.last_name ?? ""}`.trim();
            if (name) {
              updates.userName = name;
              updates.initials = deriveInitials(name);
            }
          }
        }
        if (Object.keys(updates).length > 0) {
          setProfile((prev) => ({ ...prev, ...updates }));
        }
      } catch {
        // Defaults are fine
      }
    })();
  }, []);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to log out");
        setLoggingOut(false);
        return;
      }
      router.push("/auth/login");
      router.refresh();
    } catch {
      toast.error("Network error");
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(40_20%_98%)] flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ background: "hsl(150 60% 14%)" }}
      >
        {/* Logo + school name */}
        <div className="flex h-16 items-center gap-3 px-5 border-b border-white/10">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 flex-shrink-0">
            <School className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-white/50 leading-none mb-0.5">Skuulr</p>
            <p className="text-sm font-semibold text-white truncate leading-none">{profile.schoolName}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {visibleNav.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "sidebar-link",
                  isActive && "active"
                )}
              >
                <item.icon className="h-4.5 w-4.5 flex-shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="px-5 py-4 border-t border-white/10">
          <p className="text-[11px] text-white/30 font-medium tracking-wide">SKUULR · v0.2.0</p>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0 lg:min-h-screen">
        {/* Top header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-gray-200 bg-white/90 backdrop-blur-sm px-4 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-9 w-9"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>

          <div className="flex-1" />

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2 h-9 rounded-full hover:bg-gray-100 cursor-pointer">
                <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white flex-shrink-0"
                  style={{ background: "hsl(150 80% 24%)" }}>
                  {profile.initials}
                </div>
                <span className="hidden sm:inline text-sm font-medium text-gray-700 max-w-[120px] truncate">
                  {profile.userName}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl border border-gray-200 bg-white shadow-xl p-1.5 mt-2">
              <DropdownMenuLabel className="px-2.5 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Account
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1 h-px bg-gray-100" />
              <DropdownMenuItem
                className="flex items-center gap-2.5 px-2.5 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer outline-none"
                onSelect={() => router.push("/dashboard/settings")}
              >
                <Settings className="h-4 w-4 text-gray-400" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 h-px bg-gray-100" />
              <DropdownMenuItem
                className="flex items-center gap-2.5 px-2.5 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg cursor-pointer outline-none"
                disabled={loggingOut}
                onSelect={(e) => { e.preventDefault(); void handleLogout(); }}
              >
                <LogOut className="h-4 w-4" />
                {loggingOut ? "Signing out…" : "Sign out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
