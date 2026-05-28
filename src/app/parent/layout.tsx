"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  Wallet,
  ClipboardList,
  CalendarCheck,
  BookOpen,
  Ellipsis,
  LogOut,
  School,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SchoolInfo {
  id: string;
  name: string;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
}

interface ClassInfo {
  id: string;
  name: string;
  school?: SchoolInfo | SchoolInfo[] | null;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string | null;
  class: ClassInfo | ClassInfo[] | null;
}

const navItems = [
  { href: "/parent", label: "Home", icon: Home },
  { href: "/parent/fees", label: "Fees", icon: Wallet },
  { href: "/parent/results", label: "Results", icon: ClipboardList },
  { href: "/parent/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/parent/homework", label: "Homework", icon: BookOpen },
  { href: "/parent/more", label: "More", icon: Ellipsis },
];

function resolveClass(student: Student): ClassInfo | null {
  if (!student.class) return null;
  return Array.isArray(student.class) ? student.class[0] : student.class;
}

function resolveSchool(student: Student): SchoolInfo | null {
  const cls = resolveClass(student);
  if (!cls?.school) return null;
  return Array.isArray(cls.school) ? cls.school[0] : cls.school;
}

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [school, setSchool] = useState<SchoolInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStudents() {
      try {
        const res = await fetch("/api/parent/students");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (data.students && data.students.length > 0) {
          setStudents(data.students);
          setSelectedStudentId(data.students[0].id);
          setSchool(resolveSchool(data.students[0]));
        }
      } catch {
        // silently fail — empty state will render
      } finally {
        setLoading(false);
      }
    }
    fetchStudents();
  }, []);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const getClassName = (student: Student): string => {
    return resolveClass(student)?.name || "No Class";
  };

  const handleStudentChange = (val: string) => {
    setSelectedStudentId(val);
    const student = students.find((s) => s.id === val);
    if (student) {
      setSchool(resolveSchool(student));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Bar */}
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/parent" className="flex items-center gap-2">
            {school?.logo_url ? (
              <img src={school.logo_url} alt={school.name} className="h-8 w-8 rounded" />
            ) : (
              <School className="h-6 w-6 text-blue-600" />
            )}
            <span className="font-bold text-base text-gray-900 truncate max-w-[120px] sm:max-w-[200px]">
              {school?.name || "Skooly"}
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {students.length > 1 && (
              <Select
                value={selectedStudentId}
                onValueChange={handleStudentChange}
              >
                <SelectTrigger className="w-[140px] sm:w-[180px] h-8 text-xs">
                  <SelectValue placeholder="Select child" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.first_name} {s.last_name} — {getClassName(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {selectedStudent && students.length <= 1 && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-gray-800">
                  {selectedStudent.first_name} {selectedStudent.last_name}
                </span>
                <span className="text-muted-foreground text-xs">
                  {getClassName(selectedStudent)}
                </span>
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={async () => {
                try {
                  await fetch("/api/auth/logout", { method: "POST" });
                } catch {
                  // proceed anyway
                }
                router.push("/auth/login");
                router.refresh();
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 pb-24 pt-4 md:ml-56">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : (
          children
        )}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-20 md:hidden">
        <div className="max-w-5xl mx-auto flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const isActive =
              item.href === "/parent"
                ? pathname === "/parent"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
                  isActive
                    ? "text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop Side Nav */}
      <aside className="hidden md:flex fixed left-0 top-14 bottom-0 w-56 bg-white border-r flex-col py-4 z-10">
        <nav className="flex flex-col gap-1 px-3">
          {navItems.map((item) => {
            const isActive =
              item.href === "/parent"
                ? pathname === "/parent"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
