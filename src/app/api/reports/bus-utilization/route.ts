import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const school_id = searchParams.get("school_id");

    if (!school_id) {
      return NextResponse.json(
        { error: "school_id query parameter is required" },
        { status: 400 }
      );
    }

    // Get all bus routes for this school
    const { data: routes } = await supabase
      .from("bus_routes")
      .select("*, bus_stops(*)")
      .eq("school_id", school_id);

    if (!routes || routes.length === 0) {
      return NextResponse.json({
        data: {
          routes: [],
          summary: {
            total_routes: 0,
            total_subscriptions: 0,
            total_revenue: 0,
            utilization_rate: 0,
          },
        },
      });
    }

    const routeIds = routes.map((r) => r.id);

    // Get all active subscriptions for these routes
    const { data: subscriptions } = await supabase
      .from("bus_subscriptions")
      .select("*, student:students(id, first_name, last_name, class_id, class:classes(name))")
      .in("bus_route_id", routeIds)
      .eq("is_active", true);

    // Build route-level report
    const routeReports = routes.map((route) => {
      const routeSubs = (subscriptions ?? []).filter(
        (s: any) => s.bus_route_id === route.id
      );
      const capacity = (route.zones as any[])?.length ?? 0;
      const totalFee = routeSubs.reduce(
        (sum: number, s: any) => sum + Number(s.fee_amount ?? 0),
        0
      );

      return {
        route_id: route.id,
        route_name: route.name,
        zones: route.zones,
        stops: route.bus_stops ?? [],
        total_subscriptions: routeSubs.length,
        capacity,
        utilization_rate:
          capacity > 0
            ? Math.round((routeSubs.length / capacity) * 10000) / 100
            : 0,
        total_revenue: totalFee,
        subscriptions: routeSubs,
      };
    });

    const totalSubscriptions = routeReports.reduce(
      (s: number, r: any) => s + r.total_subscriptions,
      0
    );
    const totalRevenue = routeReports.reduce(
      (s: number, r: any) => s + r.total_revenue,
      0
    );
    const totalCapacity = routeReports.reduce(
      (s: number, r: any) => s + r.capacity,
      0
    );

    return NextResponse.json({
      data: {
        routes: routeReports,
        summary: {
          total_routes: routes.length,
          total_subscriptions: totalSubscriptions,
          total_revenue: totalRevenue,
          total_capacity: totalCapacity,
          utilization_rate:
            totalCapacity > 0
              ? Math.round((totalSubscriptions / totalCapacity) * 10000) / 100
              : 0,
        },
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
