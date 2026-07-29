import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { REPORT_STATUSES, canTransition, type ReportStatus } from "./report-status";

const tenantId = z.string().uuid();

export const listCategoriesAndPriorities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId }).parse(d))
  .handler(async ({ data, context }) => {
    const [cats, prios] = await Promise.all([
      context.supabase
        .from("garbage_categories")
        .select("id,name,color,icon,sort_order")
        .eq("tenant_id", data.tenantId)
        .eq("active", true)
        .order("sort_order"),
      context.supabase
        .from("priorities")
        .select("id,name,level,sla_minutes,color")
        .eq("tenant_id", data.tenantId)
        .eq("active", true)
        .order("level"),
    ]);
    if (cats.error) throw new Error(cats.error.message);
    if (prios.error) throw new Error(prios.error.message);
    return { categories: cats.data ?? [], priorities: prios.data ?? [] };
  });

export const createReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId,
        title: z.string().trim().min(3).max(140),
        description: z.string().trim().max(2000).optional(),
        categoryId: z.string().uuid().nullable().optional(),
        priorityId: z.string().uuid().nullable().optional(),
        size: z.enum(["small", "medium", "large", "extra_large"]).default("medium"),
        urgent: z.boolean().default(false),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        address: z.string().max(300).optional(),
        photoPaths: z.array(z.string().max(400)).max(10).default([]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // Only residents may submit reports
    const { data: memberRows } = await context.supabase
      .from("tenant_members")
      .select("role")
      .eq("tenant_id", data.tenantId)
      .eq("user_id", context.userId)
      .eq("active", true);
    const roles = new Set((memberRows ?? []).map((r) => r.role as string));
    if (!roles.has("resident")) {
      throw new Error("Only residents can submit reports");
    }

    // compute SLA deadline if priority provided
    let slaDeadline: string | null = null;
    if (data.priorityId) {
      const { data: p } = await context.supabase
        .from("priorities")
        .select("sla_minutes")
        .eq("id", data.priorityId)
        .maybeSingle();
      if (p?.sla_minutes) {
        slaDeadline = new Date(Date.now() + p.sla_minutes * 60_000).toISOString();
      }
    }

    const { data: report, error } = await context.supabase
      .from("reports")
      .insert({
        tenant_id: data.tenantId,
        reporter_id: context.userId,
        title: data.title,
        description: data.description ?? null,
        category_id: data.categoryId ?? null,
        priority_id: data.priorityId ?? null,
        size: data.size,
        urgent: data.urgent,
        lat: data.lat,
        lng: data.lng,
        address: data.address ?? null,
        sla_deadline: slaDeadline,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    if (data.photoPaths.length > 0) {
      const rows = data.photoPaths.map((p) => ({
        report_id: report.id,
        tenant_id: data.tenantId,
        uploader_id: context.userId,
        kind: "evidence" as const,
        storage_path: p,
      }));
      await context.supabase.from("report_photos").insert(rows);
    }

    await context.supabase.from("report_events").insert({
      report_id: report.id,
      tenant_id: data.tenantId,
      actor_id: context.userId,
      from_status: null,
      to_status: "submitted",
      note: "Report created",
    });

    return report;
  });

export const listReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId,
        scope: z.enum(["mine", "assigned", "available", "all"]).default("all"),
        status: z.enum(REPORT_STATUSES).optional(),
        search: z.string().max(120).optional(),
        limit: z.number().min(1).max(200).default(50),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("reports")
      .select(
        "id,title,status,size,urgent,lat,lng,address,created_at,updated_at,category_id,priority_id,assigned_collector_id,reporter_id",
      )
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.scope === "mine") q = q.eq("reporter_id", context.userId);
    if (data.scope === "assigned") q = q.eq("assigned_collector_id", context.userId);
    if (data.scope === "available") q = q.is("assigned_collector_id", null).eq("status", "submitted");
    if (data.status) q = q.eq("status", data.status);
    if (data.search) q = q.ilike("title", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ reportId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: report, error } = await context.supabase
      .from("reports")
      .select("*, category:garbage_categories(id,name,color,icon), priority:priorities(id,name,level,color)")
      .eq("id", data.reportId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!report) throw new Error("Report not found");
    const [photos, events, comments, rating] = await Promise.all([
      context.supabase.from("report_photos").select("*").eq("report_id", data.reportId).order("created_at"),
      context.supabase.from("report_events").select("*").eq("report_id", data.reportId).order("created_at"),
      context.supabase.from("report_comments").select("*").eq("report_id", data.reportId).order("created_at"),
      context.supabase.from("report_ratings").select("*").eq("report_id", data.reportId).maybeSingle(),
    ]);
    return {
      report,
      photos: photos.data ?? [],
      events: events.data ?? [],
      comments: comments.data ?? [],
      rating: rating.data ?? null,
    };
  });

export const updateReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        reportId: z.string().uuid(),
        title: z.string().min(3).max(140).optional(),
        description: z.string().max(2000).optional(),
        categoryId: z.string().uuid().nullable().optional(),
        priorityId: z.string().uuid().nullable().optional(),
        size: z.enum(["small", "medium", "large", "extra_large"]).optional(),
        urgent: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.description !== undefined) patch.description = data.description;
    if (data.categoryId !== undefined) patch.category_id = data.categoryId;
    if (data.priorityId !== undefined) patch.priority_id = data.priorityId;
    if (data.size !== undefined) patch.size = data.size;
    if (data.urgent !== undefined) patch.urgent = data.urgent;
    const { error } = await context.supabase
      .from("reports")
      .update(patch as never)
      .eq("id", data.reportId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ reportId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("reports").delete().eq("id", data.reportId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Transition a report — enforces the role-based state machine.
 * `role` is the caller's effective role in the report's tenant.
 */
export const transitionReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        reportId: z.string().uuid(),
        to: z.enum(REPORT_STATUSES),
        note: z.string().max(500).optional(),
        completionPhotoPaths: z.array(z.string()).max(10).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: report, error: gErr } = await context.supabase
      .from("reports")
      .select("id,tenant_id,status,assigned_collector_id,reporter_id")
      .eq("id", data.reportId)
      .maybeSingle();
    if (gErr) throw new Error(gErr.message);
    if (!report) throw new Error("Report not found");

    // Determine caller role in this tenant
    const { data: roleRows } = await context.supabase
      .from("tenant_members")
      .select("role")
      .eq("tenant_id", report.tenant_id)
      .eq("user_id", context.userId)
      .eq("active", true);
    const roles = new Set((roleRows ?? []).map((r) => r.role as string));
    const isSuper = (
      await context.supabase.from("super_admins").select("user_id").eq("user_id", context.userId).maybeSingle()
    ).data;
    if (isSuper) roles.add("super_admin");

    const effective =
      (["super_admin", "administrator", "supervisor", "collector", "resident"] as const).find((r) =>
        roles.has(r),
      ) ?? null;
    if (!effective) throw new Error("Not a member of this tenant");

    if (!canTransition(effective, report.status as ReportStatus, data.to)) {
      throw new Error(`Cannot move from ${report.status} to ${data.to} as ${effective}`);
    }
    // Collector-only guard on their own job
    if (effective === "collector" && report.assigned_collector_id !== context.userId) {
      throw new Error("Not your job");
    }

    const patch: Record<string, unknown> = { status: data.to };
    const now = new Date().toISOString();
    if (data.to === "accepted") patch.accepted_at = now;
    if (data.to === "travelling") patch.started_at = now;
    if (data.to === "completed") patch.completed_at = now;
    if (data.to === "verified") patch.verified_at = now;

    const { error: uErr } = await context.supabase
      .from("reports")
      .update(patch as never)
      .eq("id", data.reportId);
    if (uErr) throw new Error(uErr.message);

    if (data.completionPhotoPaths?.length) {
      const rows = data.completionPhotoPaths.map((p) => ({
        report_id: data.reportId,
        tenant_id: report.tenant_id,
        uploader_id: context.userId,
        kind: "completion" as const,
        storage_path: p,
      }));
      await context.supabase.from("report_photos").insert(rows);
    }

    await context.supabase.from("report_events").insert({
      report_id: data.reportId,
      tenant_id: report.tenant_id,
      actor_id: context.userId,
      from_status: report.status,
      to_status: data.to,
      note: data.note ?? null,
    });

    // Notify reporter on completed/verified/assigned
    if (["assigned", "completed", "verified"].includes(data.to)) {
      await context.supabase.from("notifications").insert({
        tenant_id: report.tenant_id,
        user_id: report.reporter_id,
        title:
          data.to === "assigned"
            ? "Your report has been assigned to a collector"
            : data.to === "completed"
              ? "Your report was collected — awaiting verification"
              : "Your report is verified and closed",
        body: null,
        link: `/reports/${data.reportId}`,
      });
    }

    return { ok: true };
  });

export const addComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ reportId: z.string().uuid(), body: z.string().trim().min(1).max(2000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: r } = await context.supabase
      .from("reports")
      .select("tenant_id")
      .eq("id", data.reportId)
      .maybeSingle();
    if (!r) throw new Error("Report not found");
    const { error } = await context.supabase.from("report_comments").insert({
      report_id: data.reportId,
      tenant_id: r.tenant_id,
      author_id: context.userId,
      body: data.body,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const rateReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        reportId: z.string().uuid(),
        stars: z.number().int().min(1).max(5),
        comment: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: r } = await context.supabase
      .from("reports")
      .select("tenant_id")
      .eq("id", data.reportId)
      .maybeSingle();
    if (!r) throw new Error("Report not found");
    const { error } = await context.supabase.from("report_ratings").insert({
      report_id: data.reportId,
      tenant_id: r.tenant_id,
      rater_id: context.userId,
      stars: data.stars,
      comment: data.comment ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });