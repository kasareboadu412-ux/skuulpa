import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return `GH₵ ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-GH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function generateReceiptNumber(): string {
  const prefix = "SKL";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export function generateAdmissionNumber(schoolCode: string, year: string, seq: number): string {
  return `${schoolCode}/${year}/${seq.toString().padStart(4, "0")}`;
}

export function calculateProRatedAmount(
  monthlyAmount: number,
  schoolDaysInMonth: number,
  remainingDays: number
): number {
  if (schoolDaysInMonth <= 0) return monthlyAmount;
  const dailyRate = monthlyAmount / schoolDaysInMonth;
  return Math.round(dailyRate * remainingDays * 100) / 100;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "text-yellow-600 bg-yellow-100",
    confirmed: "text-green-600 bg-green-100",
    failed: "text-red-600 bg-red-100",
    refunded: "text-gray-600 bg-gray-100",
    active: "text-green-600 bg-green-100",
    withdrawn: "text-orange-600 bg-orange-100",
    graduated: "text-blue-600 bg-blue-100",
    present: "text-green-600 bg-green-100",
    absent: "text-red-600 bg-red-100",
    late: "text-yellow-600 bg-yellow-100",
  };
  return colors[status] || "text-gray-600 bg-gray-100";
}
