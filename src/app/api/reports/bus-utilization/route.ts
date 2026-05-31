import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireStaffModule } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireStaffModule("reports");
  if (auth instanceof NextResponse) return auth;
  const { schoolId } = auth;

  try {
    const supabase = await createSupabaseServerClient();

    const { data: routes } = await supabase
      .from("bus_routes")
      .select("*, bus_stops(*)")
      .eq("school_id", schoolId);

    if (!routes || routes.length === 0) {
      return NextResponse.json({
        data: {
          routes: [],
          summary: { total_routes: 0, total_subscriptions: 0, total_revenue: 0, utilization_rate: 0 },
        },
      });
    }

    const routeIds = routes.map((r) => r.id);

    const { data: subscriptions } = await supabase
      .from("bus_subscriptions")
      .select("*, student:students(id, first_name, last_name, class_id, class:classes(name))")
      .in("bus_route_id", routeIds)
      .eq("is_active", true);

    const routeReports = routes.map((route) => {
      const routeSubs = (subscriptions ?? []).filter((s: { bus_route_id: string }) => s.bus_route_id === route.id);
      const capacity = (route.zones as Array<unknown>)?.length ?? 0;
      const totalFee = routeSubs.reduce((sum: number, s: { fee_amount?: number }) => sum + Number(s.fee_amount ?? 0), 0);

      return {
        route_id: route.id,
        route_name: route.name,
        zones: route.zones,
        stops: route.bus_stops ?? [],
        total_subscriptions: routeSubs.length,
        capacity,
        utilization_rate: capacity > 0 ? Math.round((routeSubs.length / capacity) * 10000) / 100 : 0,
        total_revenue: totalFee,
        subscriptions: routeSubs,
      };
    });

    const totalSubscriptions = routeReports.reduce((s, r) => s + r.total_subscriptions, 0);
    const totalRevenue = routeReports.reduce((s, r) => s + r.total_revenue, 0);
    const totalCapacity = routeReports.reduce((s, r) => s + r.capacity, 0);

    return NextResponse.json({
      data: {
        routes: routeReports,
        summary: {
          total_routes: routes.length,
          total_subscriptions: totalSubscriptions,
          total_revenue: totalRevenue,
          total_capacity: totalCapacity,
          utilization_rate: totalCapacity > 0 ? Math.round((totalSubscriptions / totalCapacity) * 10000) / 100 : 0,
        },
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
