"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Save,
  Globe,
  Bell,
  Mail,
  Shield,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ───

type PlatformSettings = {
  platformName: string;
  supportEmail: string;
  defaultPlan: string;
  defaultTrialDays: number;
  currency: string;
  timezone: string;
};

type NotificationSettings = {
  newSchoolNotifications: boolean;
  paymentNotifications: boolean;
  trialEndingNotifications: boolean;
  weeklyReportEmails: boolean;
  adminEmail: string;
};

const defaultPlatformSettings: PlatformSettings = {
  platformName: "Skooly",
  supportEmail: "support@skooly.com",
  defaultPlan: "free",
  defaultTrialDays: 14,
  currency: "GHS",
  timezone: "Africa/Accra",
};

const defaultNotificationSettings: NotificationSettings = {
  newSchoolNotifications: true,
  paymentNotifications: true,
  trialEndingNotifications: true,
  weeklyReportEmails: false,
  adminEmail: "",
};

// ─── Skeleton ───

function SettingsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48" />
      <div className="h-64 bg-gray-200 rounded" />
      <div className="h-64 bg-gray-200 rounded" />
    </div>
  );
}

// ─── Toggle Component ───

function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div>
        <p className="font-medium text-sm text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <Label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
      </Label>
    </div>
  );
}

// ─── Main Settings Page ───

export default function SuperAdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(
    defaultPlatformSettings
  );
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>(defaultNotificationSettings);

  useEffect(() => {
    // Load saved settings from localStorage as a simple persistence layer
    try {
      const saved = localStorage.getItem("skooly-super-admin-settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        setPlatformSettings(parsed.platform || defaultPlatformSettings);
        setNotificationSettings(
          parsed.notifications || defaultNotificationSettings
        );
      }
    } catch {
      // Use defaults
    }
    setLoading(false);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Persist to localStorage (in a real app this would hit an API)
      localStorage.setItem(
        "skooly-super-admin-settings",
        JSON.stringify({
          platform: platformSettings,
          notifications: notificationSettings,
        })
      );

      localStorage.setItem(
        "skooly-super-admin-name",
        platformSettings.platformName
      );

      // Simulate API delay
      await new Promise((r) => setTimeout(r, 600));

      toast.success("Settings saved successfully");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Platform-wide configuration and preferences
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="platform">
        <TabsList>
          <TabsTrigger value="platform">
            <Globe className="h-4 w-4 mr-2" />
            Platform
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Platform Settings */}
        <TabsContent value="platform" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Platform Information</CardTitle>
              <CardDescription>
                Basic platform configuration for all schools
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="platformName">Platform Name</Label>
                <Input
                  id="platformName"
                  value={platformSettings.platformName}
                  onChange={(e) =>
                    setPlatformSettings((prev) => ({
                      ...prev,
                      platformName: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="supportEmail"
                    type="email"
                    className="pl-9"
                    value={platformSettings.supportEmail}
                    onChange={(e) =>
                      setPlatformSettings((prev) => ({
                        ...prev,
                        supportEmail: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultPlan">Default Plan</Label>
                  <Select
                    value={platformSettings.defaultPlan}
                    onValueChange={(v) =>
                      setPlatformSettings((prev) => ({
                        ...prev,
                        defaultPlan: v,
                      }))
                    }
                  >
                    <SelectTrigger id="defaultPlan">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trialDays">Trial Duration (days)</Label>
                  <Input
                    id="trialDays"
                    type="number"
                    min="0"
                    max="365"
                    value={platformSettings.defaultTrialDays}
                    onChange={(e) =>
                      setPlatformSettings((prev) => ({
                        ...prev,
                        defaultTrialDays: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={platformSettings.currency}
                    onValueChange={(v) =>
                      setPlatformSettings((prev) => ({
                        ...prev,
                        currency: v,
                      }))
                    }
                  >
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GHS">GHS (GH₵)</SelectItem>
                      <SelectItem value="NGN">NGN (₦)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={platformSettings.timezone}
                    onValueChange={(v) =>
                      setPlatformSettings((prev) => ({
                        ...prev,
                        timezone: v,
                      }))
                    }
                  >
                    <SelectTrigger id="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Africa/Accra">
                        Africa/Accra (UTC+0)
                      </SelectItem>
                      <SelectItem value="Africa/Lagos">
                        Africa/Lagos (UTC+1)
                      </SelectItem>
                      <SelectItem value="Africa/Nairobi">
                        Africa/Nairobi (UTC+3)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Admin Notifications</CardTitle>
              <CardDescription>
                Control which notifications the super admin receives
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adminEmail">Admin Notification Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="adminEmail"
                    type="email"
                    className="pl-9"
                    placeholder="admin@skooly.com"
                    value={notificationSettings.adminEmail}
                    onChange={(e) =>
                      setNotificationSettings((prev) => ({
                        ...prev,
                        adminEmail: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <ToggleSwitch
                checked={notificationSettings.newSchoolNotifications}
                onChange={(v) =>
                  setNotificationSettings((prev) => ({
                    ...prev,
                    newSchoolNotifications: v,
                  }))
                }
                label="New School Registrations"
                description="Get notified when a new school signs up"
              />

              <ToggleSwitch
                checked={notificationSettings.paymentNotifications}
                onChange={(v) =>
                  setNotificationSettings((prev) => ({
                    ...prev,
                    paymentNotifications: v,
                  }))
                }
                label="Payment Notifications"
                description="Alert when schools make subscription payments"
              />

              <ToggleSwitch
                checked={notificationSettings.trialEndingNotifications}
                onChange={(v) =>
                  setNotificationSettings((prev) => ({
                    ...prev,
                    trialEndingNotifications: v,
                  }))
                }
                label="Trial Ending Alerts"
                description="Notification when school trial period is about to end"
              />

              <ToggleSwitch
                checked={notificationSettings.weeklyReportEmails}
                onChange={(v) =>
                  setNotificationSettings((prev) => ({
                    ...prev,
                    weeklyReportEmails: v,
                  }))
                }
                label="Weekly Report Emails"
                description="Receive weekly summary of platform activity"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>
                Platform security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Super Admin Access
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Only authorized super admin accounts can access this panel.
                      All actions are logged for audit purposes.
                    </p>
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
