import { createFileRoute } from "@tanstack/react-router";

type Role = "resident" | "collector" | "administrator";

const DEMO_USERS: { email: string; password: string; role: Role; full_name: string }[] = [
  { email: "resident@demo.garbagetracker.app", password: "DemoResident!234", role: "resident", full_name: "Rita Resident" },
  { email: "collector@demo.garbagetracker.app", password: "DemoCollector!234", role: "collector", full_name: "Colin Collector" },
  { email: "admin@demo.garbagetracker.app", password: "DemoAdmin!234", role: "administrator", full_name: "Ada Administrator" },
];

export const Route = createFileRoute("/api/public/seed-demo")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Ensure demo tenant exists
        let tenantId: string;
        const { data: existing } = await supabaseAdmin
          .from("tenants")
          .select("id")
          .eq("slug", "demo-city")
          .maybeSingle();
        if (existing) {
          tenantId = existing.id;
        } else {
          const { data: created, error: tErr } = await supabaseAdmin
            .from("tenants")
            .insert({
              name: "Demo City",
              slug: "demo-city",
              center_lat: 40.7128,
              center_lng: -74.006,
              default_zoom: 12,
            })
            .select("id")
            .single();
          if (tErr || !created) return Response.json({ error: tErr?.message ?? "tenant create failed" }, { status: 500 });
          tenantId = created.id;
        }

        const results: { email: string; password: string; role: Role; status: string }[] = [];
        for (const u of DEMO_USERS) {
          // Find existing user
          let userId: string | null = null;
          const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
          const found = list?.users.find((x) => x.email?.toLowerCase() === u.email.toLowerCase());
          if (found) {
            userId = found.id;
            await supabaseAdmin.auth.admin.updateUserById(found.id, { password: u.password, email_confirm: true });
          } else {
            const { data: nu, error: uErr } = await supabaseAdmin.auth.admin.createUser({
              email: u.email,
              password: u.password,
              email_confirm: true,
              user_metadata: { full_name: u.full_name },
            });
            if (uErr || !nu.user) {
              results.push({ ...u, status: `error: ${uErr?.message}` });
              continue;
            }
            userId = nu.user.id;
          }

          // Ensure profile
          await supabaseAdmin.from("profiles").upsert({ id: userId!, email: u.email, full_name: u.full_name });

          // Ensure tenant membership
          const { data: mem } = await supabaseAdmin
            .from("tenant_members")
            .select("user_id")
            .eq("user_id", userId!)
            .eq("tenant_id", tenantId)
            .maybeSingle();
          if (!mem) {
            await supabaseAdmin
              .from("tenant_members")
              .insert({ user_id: userId!, tenant_id: tenantId, role: u.role, active: true });
          } else {
            await supabaseAdmin
              .from("tenant_members")
              .update({ role: u.role, active: true })
              .eq("user_id", userId!)
              .eq("tenant_id", tenantId);
          }

          results.push({ email: u.email, password: u.password, role: u.role, status: "ok" });
        }

        return Response.json({ tenantId, tenantSlug: "demo-city", users: results });
      },
    },
  },
});