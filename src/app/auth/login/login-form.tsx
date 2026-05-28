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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary shadow-lg mb-4">
            <School className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Skooly</h1>
          <p className="text-muted-foreground mt-1">School Management System</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex rounded-lg border p-1 bg-muted/50 mb-4">
              <button
                type="button"
                onClick={() => { setMode("staff"); setError(null); }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all",
                  mode === "staff"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <UserCheck className="w-4 h-4" />
                Staff Login
              </button>
              <button
                type="button"
                onClick={() => { setMode("parent"); setError(null); }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all",
                  mode === "parent"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Phone className="w-4 h-4" />
                Parent Login
              </button>
            </div>
            <CardTitle className="text-xl">
              {mode === "staff" ? "Staff Sign In" : "Parent Sign In"}
            </CardTitle>
            <CardDescription>
              {mode === "staff"
                ? "Sign in with your school email and password."
                : "Sign in with your registered phone number and PIN."}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {mode === "staff" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="email" type="email" placeholder="you@school.edu.gh"
                        value={email} onChange={(e) => setEmail(e.target.value)}
                        className="pl-10" autoComplete="email" disabled={isLoading} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="password" type={showPassword ? "text" : "password"}
                        placeholder="Enter your password" value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10" autoComplete="current-password" disabled={isLoading} required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}
                        aria-label={showPassword ? "Hide password" : "Show password"}>
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="phone" type="tel" placeholder="024 123 4567"
                        value={phone} onChange={(e) => setPhone(e.target.value)}
                        className="pl-10" autoComplete="tel" disabled={isLoading} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pin">PIN</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="pin" type={showPin ? "text" : "password"}
                        placeholder="Enter your PIN" value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        className="pl-10 pr-10" autoComplete="off"
                        maxLength={8} inputMode="numeric" pattern="[0-9]*" disabled={isLoading} required />
                      <button type="button" onClick={() => setShowPin(!showPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}
                        aria-label={showPin ? "Hide PIN" : "Show PIN"}>
                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-4 pt-0">
              <Button type="submit" className="w-full gap-2" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <><span className="inline-block w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" /> Signing in...</>
                ) : (
                  <><LogIn className="w-4 h-4" /> Sign In</>
                )}
              </Button>
              {mode === "staff" && (
                <p className="text-xs text-muted-foreground">
                  Forgot your password? Contact your school administrator.
                </p>
              )}
            </CardFooter>
          </form>
        </Card>

        <p className="text-center mt-6 text-sm text-muted-foreground">
          {mode === "staff" ? (
            <>Don&apos;t have an account?{" "}
              <Link href="/auth/register" className="text-primary font-medium hover:underline">Create a school account</Link></>
          ) : (
            <>Don&apos;t have a parent account?{" "}
              <Link href="/" className="text-primary font-medium hover:underline">Contact your school</Link></>
          )}
        </p>
      </div>
    </div>
  );
}
