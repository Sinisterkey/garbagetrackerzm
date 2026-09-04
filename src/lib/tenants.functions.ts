import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TENANT_COLS = "id, name, slug, logo_path, center_lat, center_lng, default_zoom";

/**
 * List every tenant the caller belongs to (with their role and approval status).
 * Platform admins (super admins) additionally see every municipality as "administrator".
 */
export const listMyTenants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("tenant_members")
      .select(`role, active, status, tenant_id, tenant:tenants(${TENANT_COLS})`)
      .eq("user_id", context.userId)
      .eq("active", true);
    if (error) throw new Error(error.message);
    let rows = (data ?? []) as any[];

    // Pending members cannot read the tenant row yet (RLS only admits approved
    // members), so fill in the basics from the public directory.
    if (rows.some((r) => !r.tenant)) {
      const { data: dir } = await (context.supabase as any).rpc("list_tenant_directory");
      const byId = new Map(((dir ?? []) as any[]).map((t) => [t.id, t]));
      rows = rows.map((r) => {
        if (r.tenant) return r;
        const t = byId.get(r.tenant_id);
        return {
          ...r,
          tenant: {
            id: r.tenant_id,
            name: t?.name ?? "Municipality",
            slug: t?.slug ?? "",
            logo_path: null,
            center_lat: 0,
            center_lng: 0,
            default_zoom: 12,
          },
        };
      });
    }

    const { data: superRow } = await context.supabase
      .from("super_admins")
      .select("user_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!superRow) return rows;

    const { data: all } = await (context.supabase as any).rpc("list_all_tenants");
    const seen = new Set(rows.map((r) => r.tenant?.id));
    const extra = ((all ?? []) as any[])
      .filter((t) => !seen.has(t.id))
      .map((t) => ({
        role: "super_admin",
        active: true,
        status: "approved",
        tenant: {
          id: t.id,
          name: t.name,
          slug: t.slug,
          logo_path: t.logo_path,
          center_lat: t.center_lat,
          center_lng: t.center_lng,
          default_zoom: t.default_zoom,
        },
      }));
    // Super admin rows in their own memberships become super_admin as well
    return [...rows.map((r) => ({ ...r, role: "super_admin", status: "approved" })), ...extra];
  });

/** Is the caller the platform administrator? */
export const amIPlatformAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("super_admins")
      .select("user_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    return !!data;
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

/** Create a new municipality (platform admin only; enforced in the database). */
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
    const { data: tenant, error } = await (context.supabase as any).rpc("create_tenant", {
      _name: data.name,
      _timezone: data.timezone,
      _center_lat: data.centerLat,
      _center_lng: data.centerLng,
    });
    if (error) throw new Error(error.message);
    if (!tenant) throw new Error("Could not create the municipality. Please try again.");
    return tenant as { id: string; name: string; slug: string };
  });

/**
 * Collector sign-up: request to collect for an existing municipality, or create a
 * new one. Either way the membership is created as *pending* until the platform
 * administrator approves it.
 */
export const signupAsCollector = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid().optional(),
        newName: z.string().trim().min(2).max(80).optional(),
        timezone: z.string().min(1).max(64).default("UTC"),
        centerLat: z.number().min(-90).max(90).default(0),
        centerLng: z.number().min(-180).max(180).default(0),
      })
      .refine((v) => v.tenantId || v.newName, { message: "Choose or name a municipality" })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: member, error } = await (context.supabase as any).rpc("signup_collector", {
      _tenant_id: data.tenantId ?? null,
      _new_name: data.newName ?? null,
      _timezone: data.timezone,
      _center_lat: data.centerLat,
      _center_lng: data.centerLng,
    });
    if (error) throw new Error(error.message);
    return member as { id: string; tenant_id: string; status: string };
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
      status: "approved",
    });
    if (error && !/duplicate/i.test(error.message)) throw new Error(error.message);
    return { ok: true };
  });

/** List every tenant on the platform (public directory for onboarding). */
export const listTenantDirectory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any).rpc("list_tenant_directory");
    if (error) throw new Error(error.message);
    return (data ?? []) as { id: string; name: string; slug: string }[];
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
    const { error } = await context.supabase
      .from("tenants")
      .update(patch as never)
      .eq("id", data.tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** The caller's (approved) role in the given tenant. */
export const myRoleIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: superRow } = await context.supabase
      .from("super_admins")
      .select("user_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (superRow) return "super_admin" as const;

    const { data: rows, error } = await context.supabase
      .from("tenant_members")
      .select("role")
      .eq("tenant_id", data.tenantId)
      .eq("user_id", context.userId)
      .eq("active", true)
      .eq("status", "approved");
    if (error) throw new Error(error.message);
    // pick highest role: super>admin>supervisor>collector>resident
    const rank = { super_admin: 5, administrator: 4, supervisor: 3, collector: 2, resident: 1 } as const;
    const roles = (rows ?? []).map((r) => r.role as keyof typeof rank);
    if (roles.length === 0) return null;
    roles.sort((a, b) => rank[b] - rank[a]);
    return roles[0];
  });
