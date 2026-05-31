"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Settings,
  Bell,
  ChevronDown,
  LogOut,
  User,
  Shield,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";

const navigation = [
  { name: "Overview", href: "/super-admin", icon: LayoutDashboard },
  { name: "Schools", href: "/super-admin/schools", icon: Building2 },
  { name: "Plans", href: "/super-admin/plans", icon: CreditCard },
  { name: "Settings", href: "/super-admin/settings", icon: Settings },
];

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminName, setAdminName] = useState("Super Admin");
  const [adminInitials, setAdminInitials] = useState("SA");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("skuulr-super-admin-name");
      if (stored) {
        setAdminName(stored);
        setAdminInitials(
          stored
            .split(" ")
            .map((s: string) => s[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
        );
      }
    } catch {
      // localStorage not available
    }
  }, []);

  const handleSignOut = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        localStorage.removeItem("skuulr-super-admin-name");
        router.push("/auth/login");
      }
    } catch {
      router.push("/auth/login");
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
          <Shield className="h-7 w-7 text-purple-600" />
          <div>
            <span className="text-lg font-bold text-gray-900">Skuulr</span>
            <span className="ml-1.5 text-xs font-medium text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
              Admin
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive =
              item.href === "/super-admin"
                ? pathname === "/super-admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-purple-50 text-purple-700"
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
        <div className="border-t border-gray-200 p-4 space-y-2">
          <p className="text-xs text-gray-400">Skuulr v0.1.0</p>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs text-purple-600 hover:text-purple-700 font-medium"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            Switch to School View
          </Link>
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

          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5 text-gray-600" />
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              2
            </span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 px-2"
              >
                <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <Avatar className="h-8 w-8 rounded-full">
                    <AvatarImage />
                    <AvatarFallback className="text-xs font-medium text-purple-700">
                      {adminInitials}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <span className="hidden sm:inline text-sm font-medium text-gray-700">
                  {adminName}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 rounded-lg border bg-white shadow-lg p-1 mt-1"
            >
              <DropdownMenuLabel className="px-2 py-1.5 text-sm font-semibold text-gray-900">
                Super Admin
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1 h-px bg-gray-200" />
              <DropdownMenuItem className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer">
                <User className="h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer">
                <Settings className="h-4 w-4" />
                Admin Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 h-px bg-gray-200" />
              <DropdownMenuItem
                className="flex items-center gap-2 px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded cursor-pointer"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                Sign out
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
