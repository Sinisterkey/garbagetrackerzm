import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** List collectors in a tenant (for the supervisor assign dropdown). */
export const listCollectors = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: members, error } = await context.supabase
      .from("tenant_members")
      .select("user_id")
      .eq("tenant_id", data.tenantId)
      .eq("role", "collector")
      .eq("active", true);
    if (error) throw new Error(error.message);
    const ids = (members ?? []).map((m) => m.user_id);
    if (ids.length === 0) return [];
    const { data: profiles, error: pErr } = await context.supabase
      .from("profiles")
      .select("id,full_name,email,avatar_path")
      .in("id", ids);
    if (pErr) throw new Error(pErr.message);
    return profiles ?? [];
  });

export const assignCollector = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        reportId: z.string().uuid(),
        collectorId: z.string().uuid(),
        reason: z.string().max(300).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: report } = await context.supabase
      .from("reports")
      .select("id,tenant_id,status,reporter_id")
      .eq("id", data.reportId)
      .maybeSingle();
    if (!report) throw new Error("Report not found");

    // Deactivate previous active assignments
    await context.supabase
      .from("assignments")
      .update({ active: false })
      .eq("report_id", data.reportId)
      .eq("active", true);

    const { error: iErr } = await context.supabase.from("assignments").insert({
      report_id: data.reportId,
      tenant_id: report.tenant_id,
      collector_id: data.collectorId,
      assigned_by: context.userId,
      reason: data.reason ?? null,
    });
    if (iErr) throw new Error(iErr.message);

    const { error: uErr } = await context.supabase
      .from("reports")
      .update({
        assigned_collector_id: data.collectorId,
        supervisor_id: context.userId,
        status: "assigned",
        assigned_at: new Date().toISOString(),
      })
      .eq("id", data.reportId);
    if (uErr) throw new Error(uErr.message);

    await context.supabase.from("report_events").insert({
      report_id: data.reportId,
      tenant_id: report.tenant_id,
      actor_id: context.userId,
      from_status: report.status,
      to_status: "assigned",
      note: `Assigned to collector`,
    });

    await Promise.all([
      context.supabase.from("notifications").insert({
        tenant_id: report.tenant_id,
        user_id: data.collectorId,
        title: "You have a new job",
        link: `/jobs/${data.reportId}`,
      }),
      context.supabase.from("notifications").insert({
        tenant_id: report.tenant_id,
        user_id: report.reporter_id,
        title: "A collector was assigned to your report",
        link: `/reports/${data.reportId}`,
      }),
    ]);

    return { ok: true };
  });