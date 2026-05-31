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
    schoolName: "Skooly",
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
    <div className="min-h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white border-r border-gray-200 transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo area */}
        <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
          <School className="h-7 w-7 text-blue-600" />
          <span className="text-lg font-bold text-gray-900 truncate">
            {profile.schoolName}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
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
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-gray-200 p-4">
          <p className="text-xs text-gray-400">Skooly v0.1.0</p>
        </div>
      </aside>

      {/* Main area */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            {sidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>

          <div className="flex-1" />

          <Button variant="ghost" size="icon" className="relative" title="Notifications">
            <Bell className="h-5 w-5 text-gray-600" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 px-2"
              >
                <Avatar className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <AvatarFallback className="text-xs font-medium text-blue-700">
                    {profile.initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm font-medium text-gray-700">
                  {profile.userName}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 rounded-lg border bg-white shadow-lg p-1 mt-1"
            >
              <DropdownMenuLabel className="px-2 py-1.5 text-sm font-semibold text-gray-900">
                My Account
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1 h-px bg-gray-200" />
              <DropdownMenuItem
                className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer outline-none"
                onSelect={() => router.push("/dashboard/settings")}
              >
                <Settings className="h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 h-px bg-gray-200" />
              <DropdownMenuItem
                className="flex items-center gap-2 px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded cursor-pointer outline-none"
                disabled={loggingOut}
                onSelect={(e) => {
                  e.preventDefault();
                  void handleLogout();
                }}
              >
                <LogOut className="h-4 w-4" />
                {loggingOut ? "Signing out..." : "Sign out"}
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
