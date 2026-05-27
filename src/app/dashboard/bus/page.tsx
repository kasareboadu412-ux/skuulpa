"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  Bus,
  Plus,
  Edit,
  X,
  MapPin,
  Users,
  Route,
  DollarSign,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Types ───

interface BusRoute {
  id: string;
  name: string;
  zones: { zone_name: string; fee: number }[];
  isActive: boolean;
}

interface BusSubscription {
  id: string;
  studentName: string;
  className: string;
  routeName: string;
  zone: string;
  tripType: string;
  feeAmount: number;
  isActive: boolean;
}

// ─── Sample data ───

const sampleRoutes: BusRoute[] = [
  {
    id: "br1",
    name: "Madina Route",
    zones: [
      { zone_name: "Madina Central", fee: 450 },
      { zone_name: "Madina Estates", fee: 400 },
      { zone_name: "Atomic Junction", fee: 350 },
    ],
    isActive: true,
  },
  {
    id: "br2",
    name: "Adenta Route",
    zones: [
      { zone_name: "Adenta Main", fee: 550 },
      { zone_name: "Adenta Flats", fee: 500 },
      { zone_name: "Pantang", fee: 600 },
    ],
    isActive: true,
  },
  {
    id: "br3",
    name: "Legon Route",
    zones: [
      { zone_name: "Legon Campus", fee: 300 },
      { zone_name: "Okponglo", fee: 350 },
    ],
    isActive: false,
  },
];

const sampleSubscriptions: BusSubscription[] = [
  { id: "bs1", studentName: "Adwoa Mensah", className: "JHS 2", routeName: "Madina Route", zone: "Madina Estates", tripType: "Round Trip", feeAmount: 400, isActive: true },
  { id: "bs2", studentName: "Yaw Boateng", className: "Class 4", routeName: "Adenta Route", zone: "Adenta Main", tripType: "One Way", feeAmount: 300, isActive: true },
  { id: "bs3", studentName: "Nana Amoako", className: "Class 3", routeName: "Madina Route", zone: "Madina Central", tripType: "Round Trip", feeAmount: 450, isActive: true },
  { id: "bs4", studentName: "Kofi Adom", className: "JHS 1", routeName: "Adenta Route", zone: "Pantang", tripType: "Round Trip", feeAmount: 600, isActive: true },
  { id: "bs5", studentName: "Kwame Asante", className: "Class 2", routeName: "Madina Route", zone: "Atomic Junction", tripType: "One Way", feeAmount: 200, isActive: false },
  { id: "bs6", studentName: "Akua Serwaa", className: "Class 1", routeName: "Madina Route", zone: "Madina Central", tripType: "Round Trip", feeAmount: 450, isActive: true },
];

const routeUtilization = [
  { name: "Madina Route", capacity: 45, subscribed: 38 },
  { name: "Adenta Route", capacity: 40, subscribed: 22 },
  { name: "Legon Route", capacity: 35, subscribed: 0 },
];

// ─── Add/Edit Route Modal ───

function RouteModal({
  open,
  onClose,
  editRoute,
}: {
  open: boolean;
  onClose: () => void;
  editRoute: BusRoute | null;
}) {
  const [name, setName] = useState(editRoute?.name || "");
  const [zones, setZones] = useState<{ zone_name: string; fee: number }[]>(
    editRoute?.zones || [{ zone_name: "", fee: 0 }]
  );

  useEffect(() => {
    if (editRoute) {
      setName(editRoute.name);
      setZones(editRoute.zones);
    }
  }, [editRoute]);

  if (!open) return null;

  const addZone = () => {
    setZones([...zones, { zone_name: "", fee: 0 }]);
  };

  const removeZone = (index: number) => {
    if (zones.length === 1) return;
    setZones(zones.filter((_, i) => i !== index));
  };

  const updateZone = (index: number, field: "zone_name" | "fee", value: string | number) => {
    const updated = [...zones];
    updated[index] = { ...updated[index], [field]: value };
    setZones(updated);
  };

  const handleSave = () => {
    if (!name) {
      toast.error("Route name is required");
      return;
    }
    const invalidZone = zones.some((z) => !z.zone_name || z.fee <= 0);
    if (invalidZone) {
      toast.error("Each zone needs a name and fee");
      return;
    }
    toast.success(editRoute ? "Route updated" : "Route created");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Route className="h-5 w-5" />
              {editRoute ? "Edit Route" : "Add Bus Route"}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>Define a bus route with zone-based fee structure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="route-name">Route Name</Label>
            <Input
              id="route-name"
              placeholder="e.g. Madina Route"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Zones & Fees</Label>
              <Button variant="outline" size="sm" onClick={addZone}>
                <Plus className="h-3 w-3 mr-1" /> Add Zone
              </Button>
            </div>
            <div className="space-y-2">
              {zones.map((zone, i) => (
                <div key={i} className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <Input
                    placeholder="Zone name"
                    className="flex-1"
                    value={zone.zone_name}
                    onChange={(e) => updateZone(i, "zone_name", e.target.value)}
                  />
                  <div className="relative w-28">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                      GH₵
                    </span>
                    <Input
                      type="number"
                      className="pl-8"
                      value={zone.fee || ""}
                      onChange={(e) => updateZone(i, "fee", Number(e.target.value))}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-400 h-8 w-8"
                    onClick={() => removeZone(i)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>
            {editRoute ? "Update Route" : "Create Route"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// ─── Main Page ───

export default function BusPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"routes" | "subscriptions" | "stats">("routes");
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [editRoute, setEditRoute] = useState<BusRoute | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const totalSubscribers = sampleSubscriptions.filter((s) => s.isActive).length;
  const monthlyRevenue = sampleSubscriptions
    .filter((s) => s.isActive)
    .reduce((sum, s) => sum + s.feeAmount, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bus Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage bus routes, subscriptions, and utilization
          </p>
        </div>
        <Button onClick={() => { setEditRoute(null); setShowRouteModal(true); }}>
          <Plus className="h-4 w-4 mr-1" />
          Add Route
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-500">Active Routes</CardTitle>
            <Route className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sampleRoutes.filter((r) => r.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-500">Active Subscribers</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubscribers}</div>
            <p className="text-xs text-gray-500 mt-1">This term</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-500">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(monthlyRevenue)}</div>
            <p className="text-xs text-gray-500 mt-1">From subscriptions</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {[
          { key: "routes", label: "Bus Routes" },
          { key: "subscriptions", label: "Subscriptions" },
          { key: "stats", label: "Utilization" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Routes Tab */}
      {activeTab === "routes" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sampleRoutes.map((route) => (
            <Card key={route.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Bus className="h-5 w-5 text-blue-600" />
                    {route.name}
                  </CardTitle>
                  <Badge variant={route.isActive ? "success" : "secondary"}>
                    {route.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {route.zones.map((zone, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        <span className="text-sm">{zone.zone_name}</span>
                      </div>
                      <span className="text-sm font-semibold">
                        {formatCurrency(zone.fee)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={() => { setEditRoute(route); setShowRouteModal(true); }}
                >
                  <Edit className="h-3 w-3" /> Edit
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Subscriptions Tab */}
      {activeTab === "subscriptions" && (
        <Card>
          <CardHeader>
            <CardTitle>Student Subscriptions</CardTitle>
            <CardDescription>Current bus subscriptions by student</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 font-medium">Student</th>
                    <th className="pb-3 font-medium">Class</th>
                    <th className="pb-3 font-medium">Route</th>
                    <th className="pb-3 font-medium">Zone</th>
                    <th className="pb-3 font-medium">Trip Type</th>
                    <th className="pb-3 font-medium">Fee</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleSubscriptions.map((sub) => (
                    <tr key={sub.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-900">
                        {sub.studentName}
                      </td>
                      <td className="py-3 text-gray-600">{sub.className}</td>
                      <td className="py-3 text-gray-600">{sub.routeName}</td>
                      <td className="py-3 text-gray-600">{sub.zone}</td>
                      <td className="py-3 text-gray-600">{sub.tripType}</td>
                      <td className="py-3 font-semibold">
                        {formatCurrency(sub.feeAmount)}
                      </td>
                      <td className="py-3">
                        {sub.isActive ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Utilization Tab */}
      {activeTab === "stats" && (
        <Card>
          <CardHeader>
            <CardTitle>Route Utilization</CardTitle>
            <CardDescription>Capacity vs actual subscriptions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={routeUtilization} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar
                    dataKey="capacity"
                    fill="#93c5fd"
                    name="Capacity"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="subscribed"
                    fill="#2563eb"
                    name="Subscribed"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Route Modal */}
      <RouteModal
        open={showRouteModal}
        onClose={() => { setShowRouteModal(false); setEditRoute(null); }}
        editRoute={editRoute}
      />
    </div>
  );
}
