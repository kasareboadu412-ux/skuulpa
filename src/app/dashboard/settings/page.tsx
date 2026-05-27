"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Save,
  School,
  CreditCard,
  Bell,
  Users,
  Palette,
} from "lucide-react";

type SchoolSettings = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  logo_url: string;
  settings: Record<string, unknown>;
};

export default function SettingsPage() {
  const [school, setSchool] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchool();
  }, []);

  const loadSchool = async () => {
    const { data, error } = await supabase
      .from("schools")
      .select("*")
      .limit(1)
      .single();

    if (error) {
      toast.error("Failed to load settings");
    } else {
      setSchool(data);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!school) return;
    const { error } = await supabase
      .from("schools")
      .update({
        name: school.name,
        phone: school.phone,
        email: school.email,
        address: school.address,
      })
      .eq("id", school.id);

    if (error) {
      toast.error("Failed to save");
    } else {
      toast.success("Settings saved");
    }
  };

  if (loading) {
    return (
      <div className="p-8 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your school configuration</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">
            <School className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="fees">
            <CreditCard className="w-4 h-4 mr-2" />
            Fee Settings
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="academics">
            <Users className="w-4 h-4 mr-2" />
            Academics
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="w-4 h-4 mr-2" />
            Appearance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>School Information</CardTitle>
              <CardDescription>
                Basic information about your school
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="schoolName">School Name</Label>
                <Input
                  id="schoolName"
                  value={school?.name || ""}
                  onChange={(e) =>
                    setSchool((prev) =>
                      prev ? { ...prev, name: e.target.value } : prev
                    )
                  }
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="schoolPhone">Phone</Label>
                  <Input
                    id="schoolPhone"
                    value={school?.phone || ""}
                    onChange={(e) =>
                      setSchool((prev) =>
                        prev ? { ...prev, phone: e.target.value } : prev
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schoolEmail">Email</Label>
                  <Input
                    id="schoolEmail"
                    type="email"
                    value={school?.email || ""}
                    onChange={(e) =>
                      setSchool((prev) =>
                        prev ? { ...prev, email: e.target.value } : prev
                      )
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="schoolAddress">Address</Label>
                <Input
                  id="schoolAddress"
                  value={school?.address || ""}
                  onChange={(e) =>
                    setSchool((prev) =>
                      prev ? { ...prev, address: e.target.value } : prev
                    )
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Fee Configuration</CardTitle>
              <CardDescription>
                Default fee structure settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="siblingDiscount">Sibling Discount (%)</Label>
                  <Input id="siblingDiscount" type="number" defaultValue={10} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="earlyPaymentDiscount">
                    Early Payment Discount (%)
                  </Label>
                  <Input id="earlyPaymentDiscount" type="number" defaultValue={5} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lateFee">Late Fee Amount (GH₵)</Label>
                <Input id="lateFee" type="number" defaultValue={20} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Channels</CardTitle>
              <CardDescription>
                Configure how parents receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">WhatsApp Notifications</p>
                  <p className="text-sm text-gray-500">
                    Fee reminders, absence alerts, receipts
                  </p>
                </div>
                <Label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                </Label>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">SMS Notifications</p>
                  <p className="text-sm text-gray-500">
                    Fallback for parents without WhatsApp
                  </p>
                </div>
                <Label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                </Label>
              </div>
              <div className="space-y-2">
                <Label>Fee Reminder Schedule</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" className="bg-blue-50">7 days before</Button>
                  <Button variant="outline" className="bg-blue-50">3 days before</Button>
                  <Button variant="outline" className="bg-blue-50">1 day before</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="academics" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Academic Configuration</CardTitle>
              <CardDescription>
                Grading and assessment settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Continuous Assessment Weight (%)</Label>
                <p className="text-sm text-gray-500">
                  CA typically counts for 30% of final grade in Ghana
                </p>
                <Input type="number" defaultValue={30} />
              </div>
              <div className="space-y-2">
                <Label>Exam Weight (%)</Label>
                <Input type="number" defaultValue={70} />
              </div>
              <div className="space-y-2">
                <Label>Grading Scale</Label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 border rounded flex justify-between">
                    <span>A (Excellent)</span>
                    <span className="font-mono">80-100%</span>
                  </div>
                  <div className="p-2 border rounded flex justify-between">
                    <span>B (Very Good)</span>
                    <span className="font-mono">70-79%</span>
                  </div>
                  <div className="p-2 border rounded flex justify-between">
                    <span>C (Good)</span>
                    <span className="font-mono">60-69%</span>
                  </div>
                  <div className="p-2 border rounded flex justify-between">
                    <span>D (Pass)</span>
                    <span className="font-mono">50-59%</span>
                  </div>
                  <div className="p-2 border rounded flex justify-between">
                    <span>E (Weak Pass)</span>
                    <span className="font-mono">40-49%</span>
                  </div>
                  <div className="p-2 border rounded flex justify-between">
                    <span>F (Fail)</span>
                    <span className="font-mono">&lt;40%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>School Branding</CardTitle>
              <CardDescription>
                Customize the look and feel of your school portal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>School Logo</Label>
                <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-gray-50 cursor-pointer">
                  <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                    <School className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">
                    Click to upload logo
                  </p>
                  <p className="text-xs text-gray-400">
                    PNG or JPG, max 2MB
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    {["#2563EB", "#059669", "#DC2626", "#D97706", "#7C3AED"].map(
                      (color) => (
                        <button
                          key={color}
                          className="w-8 h-8 rounded-full border-2 border-transparent hover:border-gray-300 transition"
                          style={{ backgroundColor: color }}
                        />
                      )
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      Light
                    </Button>
                    <Button variant="outline" className="flex-1">
                      Dark
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
