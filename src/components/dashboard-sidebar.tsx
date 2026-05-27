"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  DollarSign,
  Users,
  Bus,
  UtensilsCrossed,
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  UserCheck,
  FileText,
  Settings,
  Menu,
  X,
  LogOut,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: "Admissions", href: "/dashboard/admissions", icon: <UserPlus className="w-5 h-5" /> },
  { label: "Students", href: "/dashboard/students", icon: <Users className="w-5 h-5" /> },
  { label: "Fees", href: "/dashboard/fees", icon: <DollarSign className="w-5 h-5" /> },
  { label: "Bus", href: "/dashboard/bus", icon: <Bus className="w-5 h-5" /> },
  { label: "Feeding", href: "/dashboard/feeding", icon: <UtensilsCrossed className="w-5 h-5" /> },
  { label: "Attendance", href: "/dashboard/attendance", icon: <ClipboardCheck className="w-5 h-5" /> },
  { label: "Academics", href: "/dashboard/academics", icon: <BookOpen className="w-5 h-5" /> },
  { label: "Teachers", href: "/dashboard/teachers", icon: <UserCheck className="w-5 h-5" /> },
  { label: "Reports", href: "/dashboard/reports", icon: <FileText className="w-5 h-5" /> },
  { label: "Settings", href: "/dashboard/settings", icon: <Settings className="w-5 h-5" /> },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-4 left-4 z-50"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r transform transition-transform lg:transform-none",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="text-2xl font-bold text-blue-600">Skooly</span>
            </Link>
            <p className="text-xs text-gray-500 mt-1">School Management</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t">
            <Link
              href="/"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <GraduationCap className="w-5 h-5" />
              Public Site
            </Link>
            <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors w-full mt-1">
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
