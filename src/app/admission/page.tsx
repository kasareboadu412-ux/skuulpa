"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  Cake,
  Upload,
  ArrowRight,
  CheckCircle,
  School,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Step = "form" | "success";

export default function AdmissionPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    childFirstName: "",
    childLastName: "",
    dob: "",
    parentFirstName: "",
    parentLastName: "",
    parentPhone: "",
    parentSecondaryPhone: "",
    parentEmail: "",
    appliedClass: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("admission_applications").insert({
        child_first_name: form.childFirstName,
        child_last_name: form.childLastName,
        dob: form.dob || null,
        parent_first_name: form.parentFirstName,
        parent_last_name: form.parentLastName,
        parent_phone: form.parentPhone,
        parent_secondary_phone: form.parentSecondaryPhone || null,
        parent_email: form.parentEmail || null,
        applied_class_id: form.appliedClass || null,
        status: "pending",
      });

      if (error) throw error;

      setStep("success");
      toast.success("Application submitted successfully!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to submit application";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (step === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Application Submitted!</h2>
            <p className="text-gray-600 mb-2">
              Thank you, <strong>{form.parentFirstName}</strong>. Your application for{" "}
              <strong>{form.childFirstName} {form.childLastName}</strong> has been received.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              The school will contact you at <strong>{form.parentPhone}</strong> regarding the next steps.
            </p>
            <div className="space-y-3">
              <Button className="w-full" onClick={() => router.push("/")}>
                Back to Home
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setStep("form")}>
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
          <span className="text-xl font-bold text-blue-600">Skooly</span>
          <span className="ml-2 text-sm text-gray-500">/ Admissions</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Apply for Admission</h1>
          <p className="text-gray-600 mt-2">
            Fill in the details below to enroll your child. The school will contact you to complete the process.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Child's Information
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
                  <SelectTrigger>
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nursery1">Nursery 1</SelectItem>
                    <SelectItem value="nursery2">Nursery 2</SelectItem>
                    <SelectItem value="kg1">Kindergarten 1</SelectItem>
                    <SelectItem value="kg2">Kindergarten 2</SelectItem>
                    <SelectItem value="class1">Class 1</SelectItem>
                    <SelectItem value="class2">Class 2</SelectItem>
                    <SelectItem value="class3">Class 3</SelectItem>
                    <SelectItem value="class4">Class 4</SelectItem>
                    <SelectItem value="class5">Class 5</SelectItem>
                    <SelectItem value="class6">Class 6</SelectItem>
                    <SelectItem value="jhs1">JHS 1</SelectItem>
                    <SelectItem value="jhs2">JHS 2</SelectItem>
                    <SelectItem value="jhs3">JHS 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthCert">Birth Certificate</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-gray-50 cursor-pointer">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Upload birth certificate (PDF or image)</p>
                  <p className="text-xs text-gray-400 mt-1">Max 5MB</p>
                  <Input id="birthCert" type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" />
                </div>
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
