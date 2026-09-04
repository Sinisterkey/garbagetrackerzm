import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const tenantId = z.string().uuid();

/** All members of a tenant with their profile info (admin only). */
export const listTenantMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: members, error } = await context.supabase
      .from("tenant_members")
      .select("id,user_id,role,active,status,created_at")
      .eq("tenant_id", data.tenantId)
      .order("created_at");
    if (error) throw new Error(error.message);
    const ids = [...new Set((members ?? []).map((m) => m.user_id))];
    const profiles = ids.length
      ? (
          await context.supabase.from("profiles").select("id,full_name,email,avatar_path,phone").in("id", ids)
        ).data ?? []
      : [];
    const byId = new Map(profiles.map((p) => [p.id, p]));
    return (members ?? []).map((m) => ({ ...m, profile: byId.get(m.user_id) ?? null }));
  });

/** Grant a role to a user (admin only). Idempotent; assigned members are approved immediately. */
export const grantRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId,
        userId: z.string().uuid(),
        role: z.enum(["resident", "collector"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("tenant_members")
      .upsert(
        {
          tenant_id: data.tenantId,
          user_id: data.userId,
          role: data.role,
          active: true,
          status: "approved",
          approved_by: context.userId,
          approved_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id,user_id,role" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Pending collector requests across all municipalities (platform admin only). */
export const listPendingCollectors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any).rpc("list_pending_collectors");
    if (error) throw new Error(error.message);
    return (data ?? []) as {
      id: string;
      user_id: string;
      tenant_id: string;
      tenant_name: string;
      full_name: string | null;
      email: string | null;
      phone: string | null;
      created_at: string;
    }[];
  });

/** Approve or reject a pending collector (platform admin only). */
export const reviewCollector = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ memberId: z.string().uuid(), approve: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).rpc("review_collector", {
      _member_id: data.memberId,
      _approve: data.approve,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Deactivate a specific role assignment. */
export const revokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ memberId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("tenant_members")
      .update({ active: false })
      .eq("id", data.memberId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Look up a user by email (must exist in profiles) so admins can grant roles. */
export const findUserByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ email: z.string().email() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p } = await supabaseAdmin
      .from("profiles")
      .select("id,full_name,email")
      .ilike("email", data.email)
      .maybeSingle();
    return p ?? null;
  });

// ---------- Categories ----------
export const saveCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        tenantId,
        name: z.string().min(1).max(60),
        color: z.string().max(20).default("#0d9488"),
        icon: z.string().max(40).default("trash-2"),
        active: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { error } = await context.supabase
        .from("garbage_categories")
        .update({ name: data.name, color: data.color, icon: data.icon, active: data.active })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("garbage_categories").insert({
        tenant_id: data.tenantId,
        name: data.name,
        color: data.color,
        icon: data.icon,
        active: data.active,
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("garbage_categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Priorities ----------
export const savePriority = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        tenantId,
        name: z.string().min(1).max(60),
        level: z.number().int().min(1).max(10),
        slaMinutes: z.number().int().min(5).max(20160),
        color: z.string().max(20).default("#f59e0b"),
        active: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch = {
      tenant_id: data.tenantId,
      name: data.name,
      level: data.level,
      sla_minutes: data.slaMinutes,
      color: data.color,
      active: data.active,
    };
    if (data.id) {
      const { error } = await context.supabase.from("priorities").update(patch).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("priorities").insert(patch);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deletePriority = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("priorities").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Announcements ----------
export const listAnnouncements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("announcements")
      .select("*")
      .eq("tenant_id", data.tenantId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const saveAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId,
        title: z.string().min(1).max(140),
        body: z.string().min(1).max(4000),
        published: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("announcements").insert({
      tenant_id: data.tenantId,
      author_id: context.userId,
      title: data.title,
      body: data.body,
      published: data.published,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Audit ----------
export const listAuditLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("audit_logs")
      .select("*")
      .eq("tenant_id", data.tenantId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });