"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  User,
  Phone,
  Mail,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

type Step = "form" | "success";

interface ClassRow {
  id: string;
  name: string;
}

interface SchoolInfo {
  id: string;
  name: string;
  short_code: string | null;
  classes: ClassRow[];
}

const UNSELECTED_CLASS = "__none__";

export default function AdmissionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shortCode = searchParams.get("school");

  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [schoolLoading, setSchoolLoading] = useState(true);
  const [school, setSchool] = useState<SchoolInfo | null>(null);
  const [schoolError, setSchoolError] = useState<string | null>(null);
  const [form, setForm] = useState({
    childFirstName: "",
    childLastName: "",
    dob: "",
    parentFirstName: "",
    parentLastName: "",
    parentPhone: "",
    parentSecondaryPhone: "",
    parentEmail: "",
    appliedClass: UNSELECTED_CLASS,
  });

  useEffect(() => {
    if (!shortCode) {
      setSchoolError("Missing school code. Ask the school for their admission link.");
      setSchoolLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/schools/lookup?short_code=${encodeURIComponent(shortCode)}`);
        if (!res.ok) {
          setSchoolError("School not found. Check your link with the school.");
          setSchoolLoading(false);
          return;
        }
        const data = await res.json();
        const s = data.data;
        if (!s) {
          setSchoolError("School not found.");
          return;
        }
        setSchool({
          id: s.id,
          name: s.name,
          short_code: s.short_code,
          classes: (s.classes ?? []).map((c: ClassRow) => ({ id: c.id, name: c.name })),
        });
      } catch {
        setSchoolError("Network error. Please try again.");
      } finally {
        setSchoolLoading(false);
      }
    })();
  }, [shortCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school) return;
    if (
      !form.childFirstName.trim() ||
      !form.childLastName.trim() ||
      !form.parentFirstName.trim() ||
      !form.parentLastName.trim() ||
      !form.parentPhone.trim()
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_id: school.id,
          child_first_name: form.childFirstName.trim(),
          child_last_name: form.childLastName.trim(),
          dob: form.dob || null,
          parent_first_name: form.parentFirstName.trim(),
          parent_last_name: form.parentLastName.trim(),
          parent_phone: form.parentPhone.trim().replace(/\s+/g, ""),
          parent_secondary_phone: form.parentSecondaryPhone.trim()
            ? form.parentSecondaryPhone.trim().replace(/\s+/g, "")
            : null,
          parent_email: form.parentEmail.trim() || null,
          applied_class_id:
            form.appliedClass === UNSELECTED_CLASS ? null : form.appliedClass,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to submit application");
        return;
      }

      setStep("success");
      toast.success("Application submitted successfully!");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (schoolLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (schoolError || !school) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">School not found</h2>
            <p className="text-gray-600 text-sm mb-6">
              {schoolError ?? "We couldn't find the school for this application."}
            </p>
            <Button onClick={() => router.push("/")}>Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Application Submitted!</h2>
            <p className="text-gray-600 mb-2">
              Thank you, <strong>{form.parentFirstName}</strong>. Your application for{" "}
              <strong>{form.childFirstName} {form.childLastName}</strong> at{" "}
              <strong>{school.name}</strong> has been received.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              The school will contact you at <strong>{form.parentPhone}</strong> regarding next steps.
            </p>
            <div className="space-y-3">
              <Button className="w-full" onClick={() => router.push("/")}>
                Back to Home
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setStep("form");
                  setForm({
                    childFirstName: "",
                    childLastName: "",
                    dob: "",
                    parentFirstName: "",
                    parentLastName: "",
                    parentPhone: "",
                    parentSecondaryPhone: "",
                    parentEmail: "",
                    appliedClass: UNSELECTED_CLASS,
                  });
                }}
              >
                Submit Another Application
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center">
          <span className="text-xl font-bold text-blue-600">Skuulr</span>
          <span className="ml-2 text-sm text-gray-500">/ Admissions</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Apply to {school.name}</h1>
          <p className="text-gray-600 mt-2">
            Fill in the details below to enroll your child. The school will contact you to complete the process.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Child&apos;s Information
              </CardTitle>
              <CardDescription>Tell us about your child</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="childFirstName">First Name *</Label>
                  <Input
                    id="childFirstName"
                    required
                    value={form.childFirstName}
                    onChange={(e) => setForm({ ...form, childFirstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="childLastName">Last Name *</Label>
                  <Input
                    id="childLastName"
                    required
                    value={form.childLastName}
                    onChange={(e) => setForm({ ...form, childLastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={form.dob}
                  onChange={(e) => setForm({ ...form, dob: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appliedClass">Applying for Class</Label>
                <Select
                  value={form.appliedClass}
                  onValueChange={(v) => setForm({ ...form, appliedClass: v })}
                >
                  <SelectTrigger id="appliedClass">
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNSELECTED_CLASS}>Let the school decide</SelectItem>
                    {school.classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {school.classes.length === 0 && (
                  <p className="text-xs text-gray-500">
                    No classes published yet — the school will assign one after reviewing your application.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-blue-600" />
                Parent/Guardian Information
              </CardTitle>
              <CardDescription>How can we reach you?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="parentFirstName">First Name *</Label>
                  <Input
                    id="parentFirstName"
                    required
                    value={form.parentFirstName}
                    onChange={(e) => setForm({ ...form, parentFirstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parentLastName">Last Name *</Label>
                  <Input
                    id="parentLastName"
                    required
                    value={form.parentLastName}
                    onChange={(e) => setForm({ ...form, parentLastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="parentPhone">Phone Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="parentPhone"
                    required
                    type="tel"
                    placeholder="024 123 4567"
                    className="pl-10"
                    value={form.parentPhone}
                    onChange={(e) => setForm({ ...form, parentPhone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="parentSecondaryPhone">Secondary Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="parentSecondaryPhone"
                    type="tel"
                    placeholder="050 123 4567"
                    className="pl-10"
                    value={form.parentSecondaryPhone}
                    onChange={(e) => setForm({ ...form, parentSecondaryPhone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="parentEmail">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="parentEmail"
                    type="email"
                    placeholder="parent@example.com"
                    className="pl-10"
                    value={form.parentEmail}
                    onChange={(e) => setForm({ ...form, parentEmail: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Submitting..." : "Submit Application"}
            {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </form>
      </main>
    </div>
  );
}
