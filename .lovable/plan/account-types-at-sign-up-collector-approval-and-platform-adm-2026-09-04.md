# Account types at sign-up, collector approval, and platform admin

## What changes for users

**Sign-up page**
- A new "I am a…" choice with two cards: **Resident** or **Garbage collector** (email/password and Google both honour the choice).
- **Resident**: unchanged — after sign-up they land on onboarding and join an existing municipality.
- **Garbage collector**: after entering name/email/password they get an extra step: **Pick an existing municipality** or **Create a new municipality** (name, timezone, map centre). Their collector membership is created immediately but marked **pending**.

**Pending collector experience**
- A pending collector can sign in but only sees a full-screen **"Awaiting approval"** page (municipality name, "the administrator will review your request", Sign out button). Every other page redirects there until approved.
- Once approved, the next sign-in (or page refresh) takes them straight to "My route".

**Platform administrator (admin@demo.garbagetracker.app)**
- Becomes the single system-wide admin. A new **Approvals** area in Administration lists every pending collector across all municipalities (name, email, municipality, requested date) with **Approve** / **Reject** buttons.
- Can **create municipalities** (existing form) and **assign a collector** to any municipality by email from the Members tab (already exists; kept and extended so the platform admin can act on every municipality, not just ones they belong to).
- The municipality switcher shows all municipalities to the platform admin.

**Creating a municipality no longer makes you an administrator**
- Collectors who create a municipality get a *pending collector* membership in it, not admin rights. Residents can join it right away. Only the platform admin holds administrative power.
- Existing "Create municipality" card on onboarding is limited to the platform admin; residents see only the "Join" list.

**Existing accounts**
- All current collectors are set to pending and must be re-approved by the admin (per your choice).
- admin@demo.garbagetracker.app is registered as platform admin. Other existing administrator memberships (e.g. the Kitwe creator) are kept as-is so nothing breaks, but no new ones can be self-created.

## Flow

```text
Sign up ──► Resident ──► Onboarding (join municipality) ──► Dashboard
        └─► Collector ──► Choose / create municipality ──► "Awaiting approval"
                                                                │
                Platform admin ──► Approvals ──► Approve ───────┘──► My route
                                              └► Reject ───────────► membership removed
```

## Technical details

**Database (one migration)**
- `tenant_members`: add `status text not null default 'approved'` (values `pending | approved | rejected`) plus `approved_by uuid`, `approved_at timestamptz`.
- Data: set `status='pending'` for every existing `collector` row; insert `admin@demo.garbagetracker.app` user id into `super_admins`.
- Replace `is_tenant_member` / `is_tenant_staff` / `has_tenant_role` to require `status='approved'` so RLS on reports, comments, assignments, etc. automatically excludes pending collectors.
- New security-definer RPCs:
  - `signup_collector(_tenant_id uuid | null, _new_name text, _timezone, _lat, _lng)` — creates the municipality if requested (no admin membership) and inserts a pending collector row for `auth.uid()`; auth-user-only guard.
  - `review_collector(_member_id uuid, _approve boolean)` — super admin only; sets status, `approved_by/at`, writes audit log and an in-app notification.
  - `list_pending_collectors()` — super admin only; returns member + profile + tenant.
- Replace `create_tenant_with_admin` with a super-admin-only version (`create_tenant`) so ordinary users cannot self-grant admin. RLS: `tm_self_join_resident` unchanged; policy `tm_read_self` unchanged so a pending collector can see their own pending row.
- Grant/execute privileges to `authenticated` on the new functions.

**Server functions** (`src/lib/tenants.functions.ts`, `src/lib/admin.functions.ts`)
- `listMyTenants` returns `status` too. `myRoleIn` only considers approved rows; new `myPendingMembership`.
- `signupAsCollector`, `listPendingCollectors`, `reviewCollector`, `isPlatformAdmin`, `listAllTenants` (super admin). `createTenant` calls the new RPC.
- `grantRole` restricted to roles `resident | collector`; sets `status='approved'`.

**Frontend**
- `src/routes/auth.tsx`: role selector; sign-up stores `account_type` in user metadata; collector branch renders the municipality step (list from `listTenantDirectory` or create form) then calls `signupAsCollector`.
- New `src/routes/_authenticated/pending.tsx` (awaiting-approval screen). `AppShell` / `_authenticated/route.tsx` child gate: if the user has a pending collector membership and no approved memberships, redirect to `/pending`.
- `src/routes/_authenticated/onboarding.tsx`: create form shown to platform admin only; collector "add municipality" also goes through pending.
- `src/routes/_authenticated/admin.tsx`: new **Approvals** tab (super admin), municipality selector for the platform admin, Members role dropdown limited to Resident/Collector.
- `src/hooks/use-current-tenant.ts` / `TenantSwitcher`: include status; super admin sees all tenants.
- `src/lib/rbac.ts`: `homeForRole` unchanged; add `isPlatformAdmin` helper usage.
- Demo seed route updated so the demo collector is created approved.
