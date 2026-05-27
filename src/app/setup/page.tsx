"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  School,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

type Step = "welcome" | "school" | "classes" | "complete";

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [loading, setLoading] = useState(false);
  const [school, setSchool] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });
  const [classes, setClasses] = useState([
    "Nursery 1", "Nursery 2", "KG 1", "KG 2",
    "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6",
    "JHS 1", "JHS 2", "JHS 3",
  ]);

  const steps: { key: Step; label: string }[] = [
    { key: "school", label: "School" },
    { key: "classes", label: "Classes" },
  ];

  const handleSetup = async () => {
    setLoading(true);
    try {
      // Get the seeded default school (single-school mode)
      const { data: existingSchool } = await supabase
        .from("schools")
        .select("id")
        .limit(1)
        .maybeSingle();

      const schoolId = existingSchool?.id;
      if (!schoolId) {
        throw new Error("No school found. Run the seed migration first.");
      }

      // Update school details
      const { error: updateError } = await supabase
        .from("schools")
        .update({
          name: school.name,
          phone: school.phone,
          email: school.email,
          address: school.address,
        })
        .eq("id", schoolId);

      if (updateError) throw updateError;

      // Get current year
      const year = new Date().getFullYear();
      const { data: yearData } = await supabase
        .from("academic_years")
        .select("id")
        .eq("school_id", schoolId)
        .eq("is_current", true)
        .maybeSingle();

      let yearId = yearData?.id;
      if (!yearId) {
        const { data: newYear, error: yearError } = await supabase
          .from("academic_years")
          .insert({
            school_id: schoolId,
            name: `${year}/${year + 1}`,
            start_date: `${year}-09-01`,
            end_date: `${year + 1}-08-31`,
            is_current: true,
          })
          .select()
          .single();
        if (yearError) throw yearError;
        yearId = newYear.id;
      }

      // Create classes that don't exist yet
      for (const className of classes) {
        const { data: existingClass } = await supabase
          .from("classes")
          .select("id")
          .eq("school_id", schoolId)
          .eq("name", className)
          .maybeSingle();

        if (!existingClass) {
          const { error: classError } = await supabase.from("classes").insert({
            school_id: schoolId,
            academic_year_id: yearId,
            name: className,
          });
          if (classError) throw classError;
        }
      }

      toast.success("School setup complete!");
      setStep("complete");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Setup failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (step === "welcome") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <School className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Welcome to Skooly!</h1>
            <p className="text-gray-600 mb-6">
              Configure your school details and classes to get started.
            </p>
            <Button size="lg" onClick={() => setStep("school")}>
              Get Started <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "complete") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-lg w-full text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">All Set!</h2>
            <p className="text-gray-500 text-sm mb-6">
              Your school is ready. Add students and teachers from the dashboard.
            </p>
            <Button size="lg" onClick={() => router.push("/dashboard")}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => {
            const currentIdx = steps.findIndex((st) => st.key === step);
            const isActive = i <= currentIdx;
            return (
              <div key={s.key} className="flex items-center">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                  isActive ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-400"
                }`}>
                  <span>{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-1 ${isActive ? "bg-blue-300" : "bg-gray-200"}`} />
                )}
              </div>
            );
          })}
        </div>

        {step === "school" && (
          <Card>
            <CardHeader>
              <CardTitle>School Information</CardTitle>
              <CardDescription>Configure your school details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>School Name *</Label>
                <Input
                  placeholder="e.g. King's Court International School"
                  value={school.name}
                  onChange={(e) => setSchool({ ...school, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input
                    type="tel"
                    placeholder="024 123 4567"
                    value={school.phone}
                    onChange={(e) => setSchool({ ...school, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="info@school.com"
                    value={school.email}
                    onChange={(e) => setSchool({ ...school, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  placeholder="Madina, Accra"
                  value={school.address}
                  onChange={(e) => setSchool({ ...school, address: e.target.value })}
                />
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep("welcome")}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button onClick={() => setStep("classes")} disabled={!school.name}>
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "classes" && (
          <Card>
            <CardHeader>
              <CardTitle>Classes</CardTitle>
              <CardDescription>Select the classes your school offers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {["Nursery 1", "Nursery 2", "KG 1", "KG 2",
                  "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6",
                  "JHS 1", "JHS 2", "JHS 3"].map((c) => {
                  const enabled = classes.includes(c);
                  return (
                    <button
                      key={c}
                      onClick={() => setClasses(enabled ? classes.filter((x) => x !== c) : [...classes, c])}
                      className={`p-3 rounded-lg border text-sm font-medium transition ${
                        enabled ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep("school")}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button onClick={handleSetup} disabled={loading}>
                  {loading ? "Configuring..." : "Complete Setup"}
                  {!loading && <CheckCircle className="w-4 h-4 ml-2" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
