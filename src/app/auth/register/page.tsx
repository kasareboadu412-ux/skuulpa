"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { School, Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle2, Phone, Building2 } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", email: "", phone: "", schoolName: "", password: "", confirmPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) { setError("Please enter your name."); return; }
    if (!form.email.trim() || !form.email.includes("@")) { setError("Please enter a valid email."); return; }
    if (!form.schoolName.trim()) { setError("Please enter your school name."); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (form.password !== form.confirmPassword) { setError("Passwords don't match."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          schoolName: form.schoolName.trim(),
          password: form.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed.");
        toast.error(data.error || "Registration failed");
        return;
      }

      setSuccess(true);
      toast.success("School created!");
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">School Created!</h2>
            <p className="text-gray-500">Redirecting to dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary shadow-lg mb-4">
            <School className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold">Skuulr</h1>
          <p className="text-muted-foreground mt-1">Register your school</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Create Your School Account</CardTitle>
            <CardDescription>Get started with Skuulr in minutes</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="schoolName">School Name *</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="schoolName" placeholder="e.g. King's Court International" className="pl-10"
                    value={form.schoolName} onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
                    disabled={loading} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Your Name *</Label>
                <Input id="name" placeholder="Full name" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={loading} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="you@school.edu.gh" className="pl-10"
                    value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    disabled={loading} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="phone" type="tel" placeholder="024 123 4567" className="pl-10"
                    value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    disabled={loading} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="Min 6 characters"
                    value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="pl-10 pr-10" disabled={loading} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input id="confirmPassword" type="password" placeholder="Repeat password"
                  value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  disabled={loading} required />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 pt-0">
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Creating..." : "Create School"}
                {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>

              <p className="text-sm text-muted-foreground text-center">
                Already have an account?{" "}
                <Link href="/auth/login" className="text-primary font-medium hover:underline">Sign in</Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
