"use client";

import { useCallback, useEffect, useState } from "react";
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
  Route as RouteIcon,
  DollarSign,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Zone {
  zone_name: string;
  fee: number;
}

interface BusRoute {
  id: string;
  name: string;
  zones: Zone[];
  is_active: boolean;
  bus_subscriptions?: Array<{ count: number }>;
}

interface BusSubscription {
  id: string;
  trip_type: string;
  fee_amount: number;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  student?: { id: string; first_name: string; last_name: string } | null;
  bus_route?: { id: string; name: string } | null;
  stop?: { id: string; name: string } | null;
}

interface UtilizationReport {
  route_id: string;
  route_name: string;
  total_subscriptions: number;
  capacity: number;
  utilization_rate: number;
  total_revenue: number;
}

function RouteModal({
  open,
  onClose,
  onSaved,
  editRoute,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editRoute: BusRoute | null;
}) {
  const [name, setName] = useState("");
  const [zones, setZones] = useState<Zone[]>([{ zone_name: "", fee: 0 }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editRoute?.name ?? "");
      setZones(editRoute?.zones?.length ? editRoute.zones : [{ zone_name: "", fee: 0 }]);
    }
  }, [open, editRoute]);

  if (!open) return null;

  const addZone = () => setZones([...zones, { zone_name: "", fee: 0 }]);
  const removeZone = (i: number) => zones.length > 1 && setZones(zones.filter((_, idx) => idx !== i));
  const updateZone = (i: number, field: keyof Zone, value: string | number) => {
    const next = [...zones];
    next[i] = { ...next[i], [field]: value };
    setZones(next);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Route name is required"); return; }
    if (zones.some((z) => !z.zone_name.trim() || z.fee <= 0)) {
      toast.error("Each zone needs a name and positive fee"); return;
    }
    setSaving(true);
    try {
      // Note: API has no PATCH for routes — create only for now
      const res = await fetch("/api/bus/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), zones, is_active: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save route");
        return;
      }
      toast.success("Route created");
      onSaved();
      onClose();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RouteIcon className="h-5 w-5" />
              {editRoute ? "Edit Route" : "Add Bus Route"}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
          <CardDescription>Define a bus route with zone-based fee structure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="route-name">Route Name</Label>
            <Input id="route-name" placeholder="e.g. Madina Route" value={name} onChange={(e) => setName(e.target.value)} />
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
                  <Input placeholder="Zone name" className="flex-1" value={zone.zone_name} onChange={(e) => updateZone(i, "zone_name", e.target.value)} />
                  <div className="relative w-28">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">GH₵</span>
                    <Input type="number" className="pl-8" value={zone.fee || ""} onChange={(e) => updateZone(i, "fee", Number(e.target.value))} />
                  </div>
                  <Button variant="ghost" size="icon" className="text-red-400 h-8 w-8" onClick={() => removeZone(i)}><X className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editRoute ? "Update Route" : "Create Route"}</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function BusPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"routes" | "subscriptions" | "stats">("routes");
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [editRoute, setEditRoute] = useState<BusRoute | null>(null);
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [subscriptions, setSubscriptions] = useState<BusSubscription[]>([]);
  const [utilization, setUtilization] = useState<UtilizationReport[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, sRes, uRes] = await Promise.all([
        fetch("/api/bus/routes"),
        fetch("/api/bus/subscriptions"),
        fetch("/api/reports/bus-utilization"),
      ]);
      const [rData, sData, uData] = await Promise.all([rRes.json(), sRes.json(), uRes.json()]);
      if (rRes.ok) setRoutes(rData.data ?? []);
      if (sRes.ok) setSubscriptions(sData.data ?? []);
      if (uRes.ok) setUtilization(uData.data?.routes ?? []);
    } catch {
      toast.error("Failed to load bus data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (<div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />))}
        </div>
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  const activeRoutes = routes.filter((r) => r.is_active).length;
  const activeSubscribers = subscriptions.filter((s) => s.is_active).length;
  const monthlyRevenue = subscriptions.filter((s) => s.is_active).reduce((sum, s) => sum + Number(s.fee_amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bus Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage bus routes, subscriptions, and utilization</p>
        </div>
        <Button onClick={() => { setEditRoute(null); setShowRouteModal(true); }}>
          <Plus className="h-4 w-4 mr-1" />Add Route
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-500">Active Routes</CardTitle>
            <RouteIcon className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{activeRoutes}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-500">Active Subscribers</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{activeSubscribers}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-500">Term Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(monthlyRevenue)}</div></CardContent>
        </Card>
      </div>

      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {[
          { key: "routes", label: "Bus Routes" },
          { key: "subscriptions", label: "Subscriptions" },
          { key: "stats", label: "Utilization" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "routes" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {routes.length === 0 ? (
            <Card className="col-span-full"><CardContent className="py-12 text-center text-gray-500">No routes yet. Add your first route to get started.</CardContent></Card>
          ) : routes.map((route) => (
            <Card key={route.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Bus className="h-5 w-5 text-blue-600" />{route.name}
                  </CardTitle>
                  <Badge variant={route.is_active ? "success" : "secondary"}>
                    {route.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(route.zones ?? []).map((zone, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        <span className="text-sm">{zone.zone_name}</span>
                      </div>
                      <span className="text-sm font-semibold">{formatCurrency(zone.fee)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => { setEditRoute(route); setShowRouteModal(true); }}>
                  <Edit className="h-3 w-3" /> Edit
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

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
                    <th className="pb-3 font-medium">Route</th>
                    <th className="pb-3 font-medium">Stop</th>
                    <th className="pb-3 font-medium">Trip Type</th>
                    <th className="pb-3 font-medium">Fee</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-500">No subscriptions yet.</td></tr>
                  ) : subscriptions.map((s) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-900">{s.student ? `${s.student.first_name} ${s.student.last_name}` : "—"}</td>
                      <td className="py-3 text-gray-600">{s.bus_route?.name ?? "—"}</td>
                      <td className="py-3 text-gray-600">{s.stop?.name ?? "—"}</td>
                      <td className="py-3 capitalize text-gray-600">{s.trip_type.replace(/_/g, " ")}</td>
                      <td className="py-3 font-semibold">{formatCurrency(Number(s.fee_amount))}</td>
                      <td className="py-3"><Badge variant={s.is_active ? "success" : "secondary"}>{s.is_active ? "Active" : "Inactive"}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "stats" && (
        <Card>
          <CardHeader>
            <CardTitle>Route Utilization</CardTitle>
            <CardDescription>Subscribed vs capacity per route</CardDescription>
          </CardHeader>
          <CardContent>
            {utilization.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">No utilization data yet.</p>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={utilization} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="route_name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="capacity" fill="#93c5fd" name="Capacity" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="total_subscriptions" fill="#f97316" name="Subscribed" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <RouteModal
        open={showRouteModal}
        onClose={() => { setShowRouteModal(false); setEditRoute(null); }}
        onSaved={() => void load()}
        editRoute={editRoute}
      />
    </div>
  );
}
