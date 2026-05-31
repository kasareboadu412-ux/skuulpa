"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Phone, LogIn, Eye, EyeOff, School, UserCheck } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type LoginMode = "staff" | "parent";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";

  const [mode, setMode] = useState<LoginMode>("staff");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "staff") {
      if (!email.trim() || !email.includes("@")) {
        setError("Please enter a valid email address.");
        return;
      }
      if (!password) {
        setError("Please enter your password.");
        return;
      }
    } else {
      const trimmedPhone = phone.trim().replace(/\s+/g, "");
      if (!trimmedPhone || trimmedPhone.length < 10) {
        setError("Please enter a valid phone number (e.g., 024XXXXXXX).");
        return;
      }
      if (!pin || pin.length < 4) {
        setError("PIN must be at least 4 digits.");
        return;
      }
    }

    setIsLoading(true);

    try {
      const payload =
        mode === "staff"
          ? { email: email.trim().toLowerCase(), password, loginAs: "staff" }
          : { phone: phone.trim().replace(/\s+/g, ""), pin, loginAs: "parent" };

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed. Please try again.");
        toast.error(data.error || "Login failed");
        return;
      }

      toast.success(
        mode === "staff"
          ? `Welcome back, ${data.user?.profile?.first_name ?? "Administrator"}!`
          : "Welcome back!"
      );

      const role = data.user?.role;
      let destination = redirectTo;

      if (data.user?.is_super_admin) {
        destination = "/super-admin";
      } else if (destination === "/dashboard" || destination.startsWith("/auth/")) {
        switch (role) {
          case "proprietor":
          case "admin":
            destination = "/dashboard";
            break;
          case "teacher":
            destination = "/teacher";
            break;
          case "parent":
            destination = "/parent";
            break;
          default:
            destination = "/dashboard";
        }
      }

      router.push(destination);
      router.refresh();
    } catch (err) {
      const message = "Unable to connect. Please check your internet and try again.";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: "hsl(40 20% 98%)" }}>
      {/* Left decorative panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-col justify-between p-12 flex-shrink-0"
        style={{ background: "hsl(150 60% 14%)" }}>
        <div>
          <div className="flex items-center gap-2.5 mb-16">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500">
              <School className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-extrabold text-white tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: "-0.04em" }}>
              Skuulr
            </span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4 leading-snug" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            The smarter way to run your school
          </h2>
          <p className="text-white/60 text-base leading-relaxed">
            Fees, admissions, academics, bus, feeding — everything your private basic school needs, built for Ghana.
          </p>
        </div>
        <div className="space-y-4">
          {[
            { num: "2,400+", label: "Students managed" },
            { num: "18 schools", label: "Active on Skuulr" },
            { num: "GH₵ 4M+", label: "Fees collected" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-4">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-amber-400 font-bold text-sm">{s.num}</span>
              <span className="text-white/50 text-xs">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: login form */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2 mb-8 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <School className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: "-0.04em", color: "hsl(150 80% 24%)" }}>
              Skuulr
            </span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {mode === "staff" ? "Welcome back" : "Parent sign in"}
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            {mode === "staff" ? "Sign in to your school dashboard." : "Enter your phone number and PIN."}
          </p>

          {/* Mode toggle */}
          <div className="flex rounded-xl border border-gray-200 p-1 mb-6 bg-gray-50">
            {(["staff", "parent"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all cursor-pointer",
                  mode === m
                    ? "bg-white shadow-sm text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {m === "staff" ? <UserCheck className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
                {m === "staff" ? "Staff" : "Parent"}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "staff" ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input id="email" type="email" placeholder="you@school.edu.gh"
                      value={email} onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-11 rounded-xl border-gray-200 bg-white focus:border-primary" autoComplete="email" disabled={isLoading} required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input id="password" type={showPassword ? "text" : "password"}
                      placeholder="Enter your password" value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-11 rounded-xl border-gray-200 bg-white focus:border-primary" autoComplete="current-password" disabled={isLoading} required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer" tabIndex={-1}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Phone number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input id="phone" type="tel" placeholder="024 123 4567"
                      value={phone} onChange={(e) => setPhone(e.target.value)}
                      className="pl-10 h-11 rounded-xl border-gray-200 bg-white focus:border-primary" autoComplete="tel" disabled={isLoading} required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pin" className="text-sm font-medium text-gray-700">PIN</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input id="pin" type={showPin ? "text" : "password"}
                      placeholder="Enter your PIN" value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="pl-10 pr-10 h-11 rounded-xl border-gray-200 bg-white focus:border-primary" autoComplete="off"
                      maxLength={8} inputMode="numeric" pattern="[0-9]*" disabled={isLoading} required />
                    <button type="button" onClick={() => setShowPin(!showPin)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer" tabIndex={-1}>
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold text-white cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: "hsl(150 80% 24%)" }}
            >
              {isLoading
                ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in…</>
                : <><LogIn className="w-4 h-4" /> Sign In</>
              }
            </button>
          </form>

          {mode === "staff" && (
            <p className="text-center mt-5 text-xs text-gray-500">
              Forgot password? Contact your school administrator.
            </p>
          )}

          <p className="text-center mt-4 text-sm text-gray-500">
            {mode === "staff" ? (
              <>New to Skuulr?{" "}
                <Link href="/auth/register" className="font-semibold hover:underline" style={{ color: "hsl(150 80% 24%)" }}>Register your school</Link></>
            ) : (
              <>No account?{" "}
                <Link href="/" className="font-semibold hover:underline" style={{ color: "hsl(150 80% 24%)" }}>Contact your school</Link></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
