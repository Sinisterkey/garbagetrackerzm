import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDashboardStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const start30 = new Date(Date.now() - 30 * 86400 * 1000).toISOString();

    const [todayCount, pending, completed, verified, last30] = await Promise.all([
      context.supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", data.tenantId)
        .gte("created_at", startOfDay),
      context.supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", data.tenantId)
        .in("status", ["submitted", "assigned", "accepted", "travelling", "working"]),
      context.supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", data.tenantId)
        .in("status", ["completed", "verified"])
        .gte("created_at", start30),
      context.supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", data.tenantId)
        .eq("status", "verified")
        .gte("created_at", start30),
      context.supabase
        .from("reports")
        .select("created_at,verified_at,status")
        .eq("tenant_id", data.tenantId)
        .gte("created_at", start30)
        .limit(2000),
    ]);

    // Aggregate trend (per-day new reports)
    const trendMap = new Map<string, number>();
    for (const r of last30.data ?? []) {
      const day = new Date(r.created_at as string).toISOString().slice(0, 10);
      trendMap.set(day, (trendMap.get(day) ?? 0) + 1);
    }
    const trend = [...trendMap.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, count]) => ({ date, count }));

    // Average verification time (hours)
    const durations = (last30.data ?? [])
      .filter((r) => r.verified_at && r.created_at)
      .map(
        (r) =>
          (new Date(r.verified_at as string).getTime() - new Date(r.created_at as string).getTime()) /
          3600000,
      );
    const avgHours = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    return {
      today: todayCount.count ?? 0,
      pending: pending.count ?? 0,
      completed30d: completed.count ?? 0,
      verified30d: verified.count ?? 0,
      avgResponseHours: Number(avgHours.toFixed(1)),
      trend,
    };
  });

export const getHeatmapPoints = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("reports")
      .select("lat,lng,status")
      .eq("tenant_id", data.tenantId)
      .limit(2000);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({ lat: r.lat, lng: r.lng, status: r.status }));
  });