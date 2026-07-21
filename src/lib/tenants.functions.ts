import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

/** List every tenant the caller belongs to (with their role). */
export const listMyTenants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("tenant_members")
      .select("role, active, tenant:tenants(id, name, slug, logo_path, center_lat, center_lng, default_zoom)")
      .eq("user_id", context.userId)
      .eq("active", true);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Fetch a tenant the caller is a member of. */
export const getTenant = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: tenant, error } = await context.supabase
      .from("tenants")
      .select("*")
      .eq("id", data.tenantId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!tenant) throw new Error("Not found");
    return tenant;
  });

/**
 * Create a new municipality (tenant) and enroll the caller as its administrator.
 * Uses the admin client because RLS only lets pre-existing admins insert tenants.
 */
export const createTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().trim().min(2).max(80),
        timezone: z.string().min(1).max(64).default("UTC"),
        centerLat: z.number().min(-90).max(90).default(0),
        centerLng: z.number().min(-180).max(180).default(0),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const baseSlug = slugify(data.name) || "municipality";
    let slug = baseSlug;
    let n = 1;
    // ensure unique slug
    while (true) {
      const { data: exists } = await supabaseAdmin
        .from("tenants")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!exists) break;
      n += 1;
      slug = `${baseSlug}-${n}`;
    }
    const { data: tenant, error } = await supabaseAdmin
      .from("tenants")
      .insert({
        name: data.name,
        slug,
        timezone: data.timezone,
        center_lat: data.centerLat,
        center_lng: data.centerLng,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const { error: mErr } = await supabaseAdmin.from("tenant_members").insert({
      tenant_id: tenant.id,
      user_id: context.userId,
      role: "administrator",
    });
    if (mErr) throw new Error(mErr.message);
    await supabaseAdmin.from("audit_logs").insert({
      tenant_id: tenant.id,
      actor_id: context.userId,
      action: "tenant.created",
      entity: "tenant",
      entity_id: tenant.id,
    });
    return tenant;
  });

/** Join an existing tenant as a resident (self-service). */
export const joinTenantAsResident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("tenant_members").insert({
      tenant_id: data.tenantId,
      user_id: context.userId,
      role: "resident",
    });
    if (error && !/duplicate/i.test(error.message)) throw new Error(error.message);
    return { ok: true };
  });

/** List every tenant on the platform (public directory for onboarding). */
export const listTenantDirectory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("tenants")
      .select("id, name, slug")
      .eq("active", true)
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Update tenant settings (admin only). */
export const updateTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        name: z.string().min(2).max(80).optional(),
        timezone: z.string().max(64).optional(),
        centerLat: z.number().min(-90).max(90).optional(),
        centerLng: z.number().min(-180).max(180).optional(),
        defaultZoom: z.number().min(1).max(20).optional(),
        workingHours: z
          .object({ start: z.string(), end: z.string() })
          .optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.timezone !== undefined) patch.timezone = data.timezone;
    if (data.centerLat !== undefined) patch.center_lat = data.centerLat;
    if (data.centerLng !== undefined) patch.center_lng = data.centerLng;
    if (data.defaultZoom !== undefined) patch.default_zoom = data.defaultZoom;
    if (data.workingHours !== undefined) patch.working_hours = data.workingHours;
    const { error } = await context.supabase.from("tenants").update(patch).eq("id", data.tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** The caller's role in the given tenant. */
export const myRoleIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("tenant_members")
      .select("role")
      .eq("tenant_id", data.tenantId)
      .eq("user_id", context.userId)
      .eq("active", true);
    if (error) throw new Error(error.message);
    // pick highest role: super>admin>supervisor>collector>resident
    const rank = { super_admin: 5, administrator: 4, supervisor: 3, collector: 2, resident: 1 } as const;
    const roles = (rows ?? []).map((r) => r.role as keyof typeof rank);
    if (roles.length === 0) return null;
    roles.sort((a, b) => rank[b] - rank[a]);
    return roles[0];
  });