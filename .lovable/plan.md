## Garbage Tracker — Multi-tenant Waste Management Platform

A production-quality web platform on Lovable's supported stack: **React 19 + TanStack Start + TypeScript + Tailwind + shadcn/ui + Lovable Cloud (Postgres, Auth, Storage, Email)**. All originally-listed features are covered; PHP/Laravel/MySQL/Redis/Docker items are replaced with equivalent Lovable-native capabilities.

### Stack mapping (originals → Lovable equivalents)

| Original | Delivered as |
|---|---|
| Next.js 15 / React 19 | TanStack Start + React 19 |
| Laravel 12 / PHP 8.4 | TanStack `createServerFn` + server routes (TypeScript) |
| MySQL | Lovable Cloud Postgres |
| Sanctum | Lovable Cloud Auth (email/password + Google) + MFA (TOTP) |
| Redis / Queues | Postgres `pg_cron` + async server routes for background jobs |
| Laravel Scout | Postgres full-text search (`tsvector` + GIN index) |
| S3 storage | Lovable Cloud Storage (S3-compatible) |
| SMS | Provider-agnostic abstraction (`notifications.sms_provider` setting; Twilio-ready secret slot) |
| Push | Web Push (VAPID) with a pluggable provider interface |
| Email | Lovable managed email + React Email templates |
| Docker / Nginx / GH Actions | Managed hosting via Lovable publish |
| Pest / PHPUnit | Vitest for server functions + Playwright for E2E |
| Chart.js | Recharts (already in stack) |

### Multi-tenancy model

- `tenants` table (municipalities). Every domain row carries `tenant_id`.
- All RLS policies filter by `tenant_id = current_tenant_id()` (SECURITY DEFINER helper that reads the caller's active membership).
- `tenant_members(user_id, tenant_id, role)` — replaces per-tenant `user_roles`, giving a user a role scoped to a tenant.
- Super Admin bypasses tenant filter via a global `is_super_admin(uid)` helper.

### Roles & RBAC

App-role enum: `resident | collector | supervisor | administrator | super_admin`. Enforced via:
1. `has_tenant_role(uid, tenant_id, role)` SECURITY DEFINER function.
2. RLS policies on every table.
3. Route gates under `_authenticated/` + nested pathless layouts (`_resident`, `_collector`, `_supervisor`, `_admin`, `_superadmin`).
4. Server-function middleware `requireRole([...])` that re-verifies on every mutation.

### Database schema (Postgres, all with RLS + explicit GRANTs)

- `tenants` — municipality name, logo, timezone, working hours, map center, settings JSONB.
- `profiles` — user profile (name, phone, avatar), FK to `auth.users`, auto-created via trigger.
- `tenant_members` — user↔tenant + role.
- `garbage_categories` — per-tenant (household, recyclable, hazardous, bulk, e-waste…).
- `priorities` — low/medium/high/urgent with SLA minutes.
- `reports` — the core entity: reporter, tenant, category, priority, status enum (`submitted|assigned|accepted|travelling|working|completed|verified|rejected|cancelled`), description, size estimate, `location geography(Point,4326)`, address, timestamps for each transition, assigned_collector_id, supervisor_id.
- `report_photos` — before/after photos with `type` (`evidence|completion`) and `storage_path`.
- `report_events` — full audit trail of every status change (who/when/from/to/note).
- `report_comments` — threaded comments.
- `report_ratings` — 1-5 stars + comment by resident after completion.
- `collector_locations` — live tracking pings (lat/lng/heading/timestamp).
- `assignments` — job assignment history (reassignments preserved).
- `obstacles` — collector-reported blockers on a job.
- `announcements` — tenant-wide broadcasts.
- `notifications` — in-app inbox rows.
- `notification_preferences` — per-user email/sms/push toggles.
- `notification_templates` — per-tenant email/SMS/push templates with variables.
- `audit_logs` — generic actor/action/entity/diff audit table.
- `system_settings` — per-tenant KV (SMS provider, email from, VAPID keys, map defaults, logo, working hours).
- `mfa_factors` — TOTP factor tracking (Supabase Auth `mfa.factors` is used; a mirror view exists for convenience).

All spatial queries use PostGIS (`ST_DWithin`, `ST_Distance`) for nearby-reports, heatmap buckets, and routing distance.

### Backend (server functions & routes)

Organized under `src/lib/<domain>.functions.ts` (+ `.server.ts` helpers):

- `auth` — signup, MFA enroll/verify, session helpers.
- `tenants` — CRUD (super admin), current-tenant switcher.
- `reports` — create, list (filter/sort/paginate/search), get, update-before-assignment, delete-before-assignment, transition (state machine), comment, rate.
- `assignments` — assign, reassign, accept, reject.
- `collectors` — my-jobs, update-location, upload-completion-photos, report-obstacle.
- `supervisor` — pending queue, verify/reject completion, live-map data.
- `admin` — user/role/category/priority CRUD, announcements, templates, settings.
- `analytics` — KPIs, trends, heatmap points, top streets, collector productivity.
- `exports` — PDF (via `@react-pdf/renderer`), Excel (`exceljs`), CSV.
- `notifications` — enqueue (in-app row + email via Lovable Email + optional SMS via provider adapter + Web Push).
- `files` — signed upload URLs, thumbnail generation via `sharp`-free path (server-side image resize using `@cloudflare/workers-types` compatible lib, e.g. `browser-image-resizer` on client + server validation of MIME/size).

Public routes at `/api/public/*`:
- `POST /api/public/webhooks/sms-status` (provider callback, HMAC-verified).
- `POST /api/public/cron/sla-breach` (scheduled by `pg_cron` → `pg_net`, secret-verified) — flags overdue jobs and sends escalation notifications.

State machine centralized in `src/lib/reports.state-machine.ts` with explicit allowed transitions per role.

### Frontend routes

```
/                              Public landing (features, pricing-agnostic marketing)
/auth                          Sign in / Sign up / Forgot / Reset / MFA challenge
/auth/callback                 OAuth return (Google)

/_authenticated/
  /onboarding                  Select/create tenant membership
  /notifications
  /profile                     Profile + MFA setup + notification prefs

  /_resident/
    /dashboard                 My reports, stats, nearby map
    /reports/new               Create report (camera, GPS, category, urgency)
    /reports                   My history
    /reports/$id               Detail, comments, rate, edit/delete (pre-assign)

  /_collector/
    /jobs                      Today's queue
    /jobs/$id                  Detail + navigation + status actions + completion upload
    /history

  /_supervisor/
    /queue                     Unassigned & pending verification
    /map                       Live collectors + open jobs
    /reports/$id               Assign/reassign/verify/reject
    /reports                   All tenant reports (filters, search, export)

  /_admin/
    /dashboard                 KPIs, charts, heatmap
    /users                     User & role management
    /collectors                Collector management
    /categories
    /priorities
    /announcements
    /templates                 Notification templates
    /analytics
    /audit
    /settings                  Tenant settings

  /_superadmin/
    /tenants                   Provision & manage municipalities
    /users                     Global user search
    /system                    Global settings, feature flags
```

Every leaf route defines its own `head()` (title, description, OG). Root sets defaults for landing.

### Maps & analytics

- Leaflet + OpenStreetMap tiles, `leaflet.markercluster` for clusters, `leaflet.heat` for heatmap.
- Nearby reports via PostGIS `ST_DWithin`; distances via `ST_Distance`.
- Routing: OSRM public demo endpoint with tenant-configurable base URL setting (self-host swap-in).
- Recharts for KPI charts (trends, response time, completion time, productivity).

### Notifications pipeline

1. Domain event fires in server function → `notifications.enqueue(userId, template, vars, channels[])`.
2. Enqueuer writes in-app row + calls Lovable Email + calls SMS adapter (no-op unless provider configured) + Web Push (if subscription exists).
3. Preferences respected per channel per user.
4. Real-time in-app inbox uses Supabase Realtime subscription on `notifications`.

### Security

- RLS on every table, tenant-scoped; roles in `tenant_members` (never on profiles).
- `has_tenant_role` / `is_super_admin` are SECURITY DEFINER, `search_path = public`.
- Zod validation on every server-function input.
- Rate limiting: token-bucket table `rate_limits(key, window_start, count)` checked in middleware for auth + report-create + comment endpoints.
- File uploads: MIME sniff + size cap + re-encoded thumbnails; storage paths namespaced `tenant/{id}/reports/{id}/...`.
- Security headers set in root document; CSRF not needed (same-origin, bearer tokens).
- MFA (TOTP) via Supabase Auth `mfa` APIs; enforced for admin/superadmin roles via `beforeLoad` check.
- Audit log written by triggers on `reports`, `tenant_members`, `system_settings`.
- HIBP leaked-password check enabled via `configure_auth`.

### UI / design

- Modern minimal municipality dashboard aesthetic; NOT generic AI purple.
- Semantic design tokens in `src/styles.css` (light + dark). Custom palette (deep teal + amber accent) — no hardcoded colors in components.
- shadcn/ui components; Framer Motion for tasteful transitions; mobile-first; WCAG AA (focus rings, aria labels, color contrast).
- Distinct visual identity: geometric route-line motif, subtle map-grid background on marketing, chip-based status pills, card-heavy dashboards.

### Testing

- Vitest unit tests for state machine, RBAC helpers, validators, analytics aggregators.
- Vitest integration tests for critical server functions (create/assign/complete/verify flow).
- Playwright E2E for: signup → MFA → report → assign → complete → verify → rate.

### Documentation (delivered as `/docs/*.md` in repo)

SRS, System Design, API reference (generated from Zod schemas), Installation, Deployment (Lovable publish + optional custom domain), Developer Guide, Admin Manual, User Manual, Maintenance, Database Documentation, plus Mermaid diagrams (use-case, class, sequence, activity, ER, component, deployment, flowcharts) rendered inline in the docs.

### Build order (single large delivery, but sequenced to keep the app runnable at every step)

1. **Foundation:** Enable Lovable Cloud; design tokens; landing page replacing placeholder; root head metadata; router shell.
2. **Auth & tenancy:** email/password + Google, MFA, `tenants`, `tenant_members`, `profiles`, onboarding, `_authenticated` gate + role sub-layouts, RBAC helpers, tenant switcher.
3. **Core schema + storage bucket** (`reports`, photos, events, comments, ratings, categories, priorities, assignments, obstacles, locations, notifications, templates, settings, audit) with RLS + GRANTs + triggers.
4. **Resident flow:** create/edit/delete/view reports, photo upload, GPS capture with manual adjust, nearby map, comment, rate.
5. **Supervisor flow:** queue, assign/reassign, live map, verify/reject.
6. **Collector flow:** jobs, status transitions, navigation, completion upload, obstacle reporting, location pings.
7. **Notifications:** in-app inbox (realtime), email templates, SMS adapter, Web Push, preferences.
8. **Admin:** dashboards, KPIs, charts, heatmap, users/roles/categories/priorities/announcements/templates/settings/audit/analytics.
9. **Super Admin:** tenant provisioning, global views.
10. **Exports:** PDF/Excel/CSV endpoints + UI buttons.
11. **Cron & SLA:** `pg_cron` + `/api/public/cron/sla-breach`.
12. **Security pass:** rate limits, HIBP, security scan, audit fixes.
13. **Tests:** Vitest + Playwright suites.
14. **Docs & diagrams:** `/docs/*` with Mermaid.

### Explicit non-goals / substitutions to confirm you accept

- No Docker/Nginx/GH Actions — hosting is Lovable's managed publish.
- No PHP anywhere; API is TypeScript.
- SMS provider is abstracted, not pre-wired to a specific vendor (add secret later for Twilio/etc.).
- Google Maps not used; OSM/Leaflet only (as also listed in your spec).

Approving this plan implements all of the above end to end.