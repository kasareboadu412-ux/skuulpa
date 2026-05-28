"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Save, School, CreditCard, Users } from "lucide-react";

interface SchoolSettings {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  short_code: string | null;
  logo_url: string | null;
  settings: Record<string, unknown> | null;
}

export default function SettingsPage() {
  const [school, setSchool] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/schools/me");
        const data = await res.json();
        if (res.ok) setSchool(data.data);
        else toast.error(data.error || "Failed to load settings");
      } catch {
        toast.error("Network error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    if (!school) return;
    setSaving(true);
    try {
      const res = await fetch("/api/schools", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: school.id,
          name: school.name,
          phone: school.phone,
          email: school.email,
          address: school.address,
          settings: school.settings,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save");
        return;
      }
      toast.success("Settings saved");
      setSchool(data.data);
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: unknown) => {
    setSchool((prev) => prev ? { ...prev, settings: { ...(prev.settings ?? {}), [key]: value } } : prev);
  };

  const getSetting = (key: string, fallback: unknown = "") => {
    return school?.settings?.[key] ?? fallback;
  };

  if (loading) {
    return (
      <div className="p-8 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    );
  }

  if (!school) {
    return <div className="p-8"><Card><CardContent className="py-12 text-center text-gray-500">Unable to load school settings.</CardContent></Card></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your school configuration</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general"><School className="w-4 h-4 mr-2" />General</TabsTrigger>
          <TabsTrigger value="fees"><CreditCard className="w-4 h-4 mr-2" />Fee Settings</TabsTrigger>
          <TabsTrigger value="academics"><Users className="w-4 h-4 mr-2" />Academics</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>School Information</CardTitle>
              <CardDescription>Basic information about your school</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="schoolName">School Name</Label>
                <Input id="schoolName" value={school.name ?? ""} onChange={(e) => setSchool((p) => p ? { ...p, name: e.target.value } : p)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="schoolPhone">Phone</Label>
                  <Input id="schoolPhone" value={school.phone ?? ""} onChange={(e) => setSchool((p) => p ? { ...p, phone: e.target.value } : p)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schoolEmail">Email</Label>
                  <Input id="schoolEmail" type="email" value={school.email ?? ""} onChange={(e) => setSchool((p) => p ? { ...p, email: e.target.value } : p)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="schoolAddress">Address</Label>
                <Input id="schoolAddress" value={school.address ?? ""} onChange={(e) => setSchool((p) => p ? { ...p, address: e.target.value } : p)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Short Code</Label>
                  <Input value={school.short_code ?? ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Input value={String(getSetting("currency", "GHS"))} onChange={(e) => updateSetting("currency", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Fee Configuration</CardTitle>
              <CardDescription>Default fee structure settings (saved with school)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="siblingDiscount">Sibling Discount (%)</Label>
                  <Input
                    id="siblingDiscount"
                    type="number"
                    value={Number(getSetting("sibling_discount_pct", 10))}
                    onChange={(e) => updateSetting("sibling_discount_pct", Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="earlyPaymentDiscount">Early Payment Discount (%)</Label>
                  <Input
                    id="earlyPaymentDiscount"
                    type="number"
                    value={Number(getSetting("early_payment_discount_pct", 5))}
                    onChange={(e) => updateSetting("early_payment_discount_pct", Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lateFee">Late Fee Amount (GH₵)</Label>
                <Input
                  id="lateFee"
                  type="number"
                  value={Number(getSetting("late_fee_amount", 20))}
                  onChange={(e) => updateSetting("late_fee_amount", Number(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="academics" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Academic Configuration</CardTitle>
              <CardDescription>Grading and assessment weight settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Continuous Assessment Weight (%)</Label>
                <p className="text-sm text-gray-500">CA typically counts for 30% of final grade in Ghana</p>
                <Input
                  type="number"
                  value={Number(getSetting("ca_weight_pct", 30))}
                  onChange={(e) => updateSetting("ca_weight_pct", Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Exam Weight (%)</Label>
                <Input
                  type="number"
                  value={Number(getSetting("exam_weight_pct", 70))}
                  onChange={(e) => updateSetting("exam_weight_pct", Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Grading Scale (read-only)</Label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 border rounded flex justify-between"><span>A (Excellent)</span><span className="font-mono">80-100%</span></div>
                  <div className="p-2 border rounded flex justify-between"><span>B (Very Good)</span><span className="font-mono">70-79%</span></div>
                  <div className="p-2 border rounded flex justify-between"><span>C (Good)</span><span className="font-mono">60-69%</span></div>
                  <div className="p-2 border rounded flex justify-between"><span>D (Pass)</span><span className="font-mono">50-59%</span></div>
                  <div className="p-2 border rounded flex justify-between"><span>F (Fail)</span><span className="font-mono">&lt;50%</span></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
