import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const pingLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        heading: z.number().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("collector_locations").insert({
      tenant_id: data.tenantId,
      collector_id: context.userId,
      lat: data.lat,
      lng: data.lng,
      heading: data.heading ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reportObstacle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ reportId: z.string().uuid(), description: z.string().min(3).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: r } = await context.supabase
      .from("reports")
      .select("tenant_id")
      .eq("id", data.reportId)
      .maybeSingle();
    if (!r) throw new Error("Report not found");
    const { error } = await context.supabase.from("obstacles").insert({
      report_id: data.reportId,
      tenant_id: r.tenant_id,
      collector_id: context.userId,
      description: data.description,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Live positions of collectors in the tenant (latest ping per collector, last hour). */
export const listCollectorLocations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: rows, error } = await context.supabase
      .from("collector_locations")
      .select("collector_id,lat,lng,heading,created_at")
      .eq("tenant_id", data.tenantId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    // dedupe latest per collector
    const latest = new Map<string, (typeof rows)[number]>();
    for (const r of rows ?? []) if (!latest.has(r.collector_id)) latest.set(r.collector_id, r);
    return [...latest.values()];
  });