
-- =========================================================================
-- ENUMS
-- =========================================================================
create type public.app_role as enum ('resident','collector','supervisor','administrator','super_admin');

create type public.report_status as enum (
  'submitted','assigned','accepted','travelling','working',
  'completed','verified','rejected','cancelled'
);

create type public.report_size as enum ('small','medium','large','extra_large');

create type public.channel as enum ('in_app','email','sms','push');

-- =========================================================================
-- UPDATED_AT trigger helper
-- =========================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- =========================================================================
-- TENANTS
-- =========================================================================
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_path text,
  timezone text not null default 'UTC',
  working_hours jsonb not null default '{"start":"08:00","end":"17:00"}'::jsonb,
  center_lat double precision not null default 0,
  center_lng double precision not null default 0,
  default_zoom int not null default 13,
  settings jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.tenants to authenticated;
grant all on public.tenants to service_role;
alter table public.tenants enable row level security;
create trigger set_tenants_updated_at before update on public.tenants
  for each row execute function public.set_updated_at();

-- =========================================================================
-- PROFILES
-- =========================================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create trigger set_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- =========================================================================
-- TENANT MEMBERS (roles are scoped per tenant)
-- =========================================================================
create table public.tenant_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id, role)
);
create index tenant_members_user_idx on public.tenant_members(user_id);
create index tenant_members_tenant_idx on public.tenant_members(tenant_id);
grant select, insert, update, delete on public.tenant_members to authenticated;
grant all on public.tenant_members to service_role;
alter table public.tenant_members enable row level security;

-- Global super-admin flag stored as a tenant-less row (tenant_id = zero uuid via a marker table)
create table public.super_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
grant select on public.super_admins to authenticated;
grant all on public.super_admins to service_role;
alter table public.super_admins enable row level security;
create policy super_admins_self_read on public.super_admins
  for select to authenticated using (user_id = auth.uid());

-- =========================================================================
-- Security-definer helper functions (avoid RLS recursion)
-- =========================================================================
create or replace function public.is_super_admin(_uid uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.super_admins where user_id = _uid) $$;

create or replace function public.has_tenant_role(_uid uuid, _tenant uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists(
    select 1 from public.tenant_members
    where user_id = _uid and tenant_id = _tenant and role = _role and active
  )
$$;

create or replace function public.is_tenant_member(_uid uuid, _tenant uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists(
    select 1 from public.tenant_members
    where user_id = _uid and tenant_id = _tenant and active
  )
$$;

create or replace function public.is_tenant_staff(_uid uuid, _tenant uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists(
    select 1 from public.tenant_members
    where user_id = _uid and tenant_id = _tenant and active
      and role in ('supervisor','administrator')
  ) or public.is_super_admin(_uid)
$$;

create or replace function public.is_tenant_admin(_uid uuid, _tenant uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists(
    select 1 from public.tenant_members
    where user_id = _uid and tenant_id = _tenant and active and role = 'administrator'
  ) or public.is_super_admin(_uid)
$$;

-- =========================================================================
-- PROFILE + membership triggers
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- TENANTS policies
create policy tenants_read_member on public.tenants
  for select to authenticated
  using (public.is_tenant_member(auth.uid(), id) or public.is_super_admin(auth.uid()));

create policy tenants_super_write on public.tenants
  for all to authenticated
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

create policy tenants_admin_update on public.tenants
  for update to authenticated
  using (public.is_tenant_admin(auth.uid(), id))
  with check (public.is_tenant_admin(auth.uid(), id));

-- Bootstrap: any authenticated user can create a tenant (they become administrator via server function)
create policy tenants_bootstrap_insert on public.tenants
  for insert to authenticated with check (true);

-- PROFILES policies
create policy profiles_read_self_or_staff on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.is_super_admin(auth.uid())
    or exists (
      select 1 from public.tenant_members me
      join public.tenant_members other on other.tenant_id = me.tenant_id
      where me.user_id = auth.uid() and me.active
        and me.role in ('supervisor','administrator')
        and other.user_id = profiles.id and other.active
    )
  );
create policy profiles_upsert_self on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy profiles_update_self on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- TENANT MEMBERS policies
create policy tm_read_self on public.tenant_members
  for select to authenticated using (user_id = auth.uid());
create policy tm_read_staff on public.tenant_members
  for select to authenticated using (public.is_tenant_staff(auth.uid(), tenant_id));
-- Admin/super can manage
create policy tm_admin_manage on public.tenant_members
  for all to authenticated
  using (public.is_tenant_admin(auth.uid(), tenant_id))
  with check (public.is_tenant_admin(auth.uid(), tenant_id));
-- Self-join as resident (bootstrap after tenant selection)
create policy tm_self_join_resident on public.tenant_members
  for insert to authenticated
  with check (user_id = auth.uid() and role = 'resident');

-- =========================================================================
-- CATEGORIES & PRIORITIES (per tenant)
-- =========================================================================
create table public.garbage_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  description text,
  color text not null default '#0d9488',
  icon text default 'trash-2',
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index gc_tenant_idx on public.garbage_categories(tenant_id);
grant select, insert, update, delete on public.garbage_categories to authenticated;
grant all on public.garbage_categories to service_role;
alter table public.garbage_categories enable row level security;
create policy gc_read on public.garbage_categories
  for select to authenticated using (public.is_tenant_member(auth.uid(), tenant_id));
create policy gc_admin on public.garbage_categories
  for all to authenticated
  using (public.is_tenant_admin(auth.uid(), tenant_id))
  with check (public.is_tenant_admin(auth.uid(), tenant_id));

create table public.priorities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  level int not null,
  sla_minutes int not null default 1440,
  color text not null default '#f59e0b',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index pr_tenant_idx on public.priorities(tenant_id);
grant select, insert, update, delete on public.priorities to authenticated;
grant all on public.priorities to service_role;
alter table public.priorities enable row level security;
create policy pr_read on public.priorities
  for select to authenticated using (public.is_tenant_member(auth.uid(), tenant_id));
create policy pr_admin on public.priorities
  for all to authenticated
  using (public.is_tenant_admin(auth.uid(), tenant_id))
  with check (public.is_tenant_admin(auth.uid(), tenant_id));

-- =========================================================================
-- REPORTS
-- =========================================================================
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.garbage_categories(id) on delete set null,
  priority_id uuid references public.priorities(id) on delete set null,
  status public.report_status not null default 'submitted',
  size public.report_size not null default 'medium',
  urgent boolean not null default false,
  title text not null,
  description text,
  address text,
  lat double precision not null,
  lng double precision not null,
  assigned_collector_id uuid references auth.users(id) on delete set null,
  supervisor_id uuid references auth.users(id) on delete set null,
  assigned_at timestamptz,
  accepted_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  verified_at timestamptz,
  sla_deadline timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index reports_tenant_status_idx on public.reports(tenant_id, status);
create index reports_reporter_idx on public.reports(reporter_id);
create index reports_collector_idx on public.reports(assigned_collector_id);
create index reports_geo_idx on public.reports(lat, lng);
grant select, insert, update, delete on public.reports to authenticated;
grant all on public.reports to service_role;
alter table public.reports enable row level security;
create trigger set_reports_updated_at before update on public.reports
  for each row execute function public.set_updated_at();

-- Residents: read own, staff: read tenant, collectors: read jobs assigned to them
create policy reports_read_own on public.reports
  for select to authenticated using (reporter_id = auth.uid());
create policy reports_read_assigned on public.reports
  for select to authenticated using (assigned_collector_id = auth.uid());
create policy reports_read_staff on public.reports
  for select to authenticated using (public.is_tenant_staff(auth.uid(), tenant_id));

-- Residents create in a tenant they belong to
create policy reports_insert_resident on public.reports
  for insert to authenticated
  with check (reporter_id = auth.uid() and public.is_tenant_member(auth.uid(), tenant_id));

-- Residents can edit/delete only while still 'submitted'
create policy reports_update_own_pre on public.reports
  for update to authenticated
  using (reporter_id = auth.uid() and status = 'submitted')
  with check (reporter_id = auth.uid());
create policy reports_delete_own_pre on public.reports
  for delete to authenticated
  using (reporter_id = auth.uid() and status = 'submitted');

-- Staff can update anything in their tenant
create policy reports_update_staff on public.reports
  for update to authenticated
  using (public.is_tenant_staff(auth.uid(), tenant_id))
  with check (public.is_tenant_staff(auth.uid(), tenant_id));

-- Assigned collector can update status/photos of their job
create policy reports_update_collector on public.reports
  for update to authenticated
  using (assigned_collector_id = auth.uid())
  with check (assigned_collector_id = auth.uid());

-- =========================================================================
-- REPORT PHOTOS
-- =========================================================================
create table public.report_photos (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  uploader_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('evidence','completion')),
  storage_path text not null,
  created_at timestamptz not null default now()
);
create index rp_report_idx on public.report_photos(report_id);
grant select, insert, delete on public.report_photos to authenticated;
grant all on public.report_photos to service_role;
alter table public.report_photos enable row level security;

create policy rp_read on public.report_photos
  for select to authenticated using (
    exists (select 1 from public.reports r where r.id = report_id
      and (r.reporter_id = auth.uid()
        or r.assigned_collector_id = auth.uid()
        or public.is_tenant_staff(auth.uid(), r.tenant_id)))
  );
create policy rp_insert on public.report_photos
  for insert to authenticated with check (
    uploader_id = auth.uid()
    and exists (select 1 from public.reports r where r.id = report_id
      and (r.reporter_id = auth.uid()
        or r.assigned_collector_id = auth.uid()
        or public.is_tenant_staff(auth.uid(), r.tenant_id)))
  );
create policy rp_delete on public.report_photos
  for delete to authenticated using (
    uploader_id = auth.uid()
    or exists (select 1 from public.reports r where r.id = report_id
      and public.is_tenant_staff(auth.uid(), r.tenant_id))
  );

-- =========================================================================
-- REPORT EVENTS (audit trail)
-- =========================================================================
create table public.report_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  from_status public.report_status,
  to_status public.report_status,
  note text,
  created_at timestamptz not null default now()
);
create index re_report_idx on public.report_events(report_id);
grant select, insert on public.report_events to authenticated;
grant all on public.report_events to service_role;
alter table public.report_events enable row level security;
create policy re_read on public.report_events
  for select to authenticated using (
    exists (select 1 from public.reports r where r.id = report_id
      and (r.reporter_id = auth.uid()
        or r.assigned_collector_id = auth.uid()
        or public.is_tenant_staff(auth.uid(), r.tenant_id)))
  );
create policy re_insert on public.report_events
  for insert to authenticated with check (actor_id = auth.uid());

-- =========================================================================
-- COMMENTS
-- =========================================================================
create table public.report_comments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index rc_report_idx on public.report_comments(report_id);
grant select, insert, delete on public.report_comments to authenticated;
grant all on public.report_comments to service_role;
alter table public.report_comments enable row level security;
create policy rc_read on public.report_comments
  for select to authenticated using (
    exists (select 1 from public.reports r where r.id = report_id
      and (r.reporter_id = auth.uid()
        or r.assigned_collector_id = auth.uid()
        or public.is_tenant_staff(auth.uid(), r.tenant_id)))
  );
create policy rc_insert on public.report_comments
  for insert to authenticated with check (
    author_id = auth.uid()
    and exists (select 1 from public.reports r where r.id = report_id
      and (r.reporter_id = auth.uid()
        or r.assigned_collector_id = auth.uid()
        or public.is_tenant_staff(auth.uid(), r.tenant_id)))
  );
create policy rc_delete_own on public.report_comments
  for delete to authenticated using (author_id = auth.uid());

-- =========================================================================
-- RATINGS
-- =========================================================================
create table public.report_ratings (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references public.reports(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  rater_id uuid not null references auth.users(id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);
grant select, insert on public.report_ratings to authenticated;
grant all on public.report_ratings to service_role;
alter table public.report_ratings enable row level security;
create policy rr_read on public.report_ratings
  for select to authenticated using (
    exists (select 1 from public.reports r where r.id = report_id
      and (r.reporter_id = auth.uid() or public.is_tenant_staff(auth.uid(), r.tenant_id)))
  );
create policy rr_insert on public.report_ratings
  for insert to authenticated with check (
    rater_id = auth.uid()
    and exists (select 1 from public.reports r where r.id = report_id
      and r.reporter_id = auth.uid() and r.status = 'verified')
  );

-- =========================================================================
-- ASSIGNMENTS history
-- =========================================================================
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  collector_id uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  reason text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index as_report_idx on public.assignments(report_id);
grant select, insert, update on public.assignments to authenticated;
grant all on public.assignments to service_role;
alter table public.assignments enable row level security;
create policy as_read on public.assignments
  for select to authenticated using (
    collector_id = auth.uid()
    or public.is_tenant_staff(auth.uid(), tenant_id)
  );
create policy as_insert_staff on public.assignments
  for insert to authenticated with check (public.is_tenant_staff(auth.uid(), tenant_id));
create policy as_update_staff on public.assignments
  for update to authenticated using (public.is_tenant_staff(auth.uid(), tenant_id));

-- =========================================================================
-- OBSTACLES
-- =========================================================================
create table public.obstacles (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  collector_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.obstacles to authenticated;
grant all on public.obstacles to service_role;
alter table public.obstacles enable row level security;
create policy ob_read on public.obstacles
  for select to authenticated using (
    collector_id = auth.uid() or public.is_tenant_staff(auth.uid(), tenant_id)
  );
create policy ob_insert on public.obstacles
  for insert to authenticated with check (collector_id = auth.uid());

-- =========================================================================
-- COLLECTOR LOCATIONS (live ping)
-- =========================================================================
create table public.collector_locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  collector_id uuid not null references auth.users(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  heading double precision,
  created_at timestamptz not null default now()
);
create index cl_recent_idx on public.collector_locations(collector_id, created_at desc);
grant select, insert on public.collector_locations to authenticated;
grant all on public.collector_locations to service_role;
alter table public.collector_locations enable row level security;
create policy cl_insert_self on public.collector_locations
  for insert to authenticated with check (collector_id = auth.uid());
create policy cl_read_staff_or_self on public.collector_locations
  for select to authenticated using (
    collector_id = auth.uid() or public.is_tenant_staff(auth.uid(), tenant_id)
  );

-- =========================================================================
-- ANNOUNCEMENTS
-- =========================================================================
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  title text not null,
  body text not null,
  audience public.app_role[],
  published boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.announcements to authenticated;
grant all on public.announcements to service_role;
alter table public.announcements enable row level security;
create policy an_read on public.announcements
  for select to authenticated using (public.is_tenant_member(auth.uid(), tenant_id) and published);
create policy an_admin on public.announcements
  for all to authenticated
  using (public.is_tenant_admin(auth.uid(), tenant_id))
  with check (public.is_tenant_admin(auth.uid(), tenant_id));

-- =========================================================================
-- NOTIFICATIONS (in-app inbox)
-- =========================================================================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index nt_user_idx on public.notifications(user_id, created_at desc);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy nt_read_own on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy nt_update_own on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email boolean not null default true,
  sms boolean not null default false,
  push boolean not null default true,
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.notification_preferences to authenticated;
grant all on public.notification_preferences to service_role;
alter table public.notification_preferences enable row level security;
create policy np_self on public.notification_preferences
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  key text not null,
  channel public.channel not null,
  subject text,
  body text not null,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (tenant_id, key, channel)
);
grant select, insert, update, delete on public.notification_templates to authenticated;
grant all on public.notification_templates to service_role;
alter table public.notification_templates enable row level security;
create policy ntpl_read on public.notification_templates
  for select to authenticated using (public.is_tenant_member(auth.uid(), tenant_id));
create policy ntpl_admin on public.notification_templates
  for all to authenticated
  using (public.is_tenant_admin(auth.uid(), tenant_id))
  with check (public.is_tenant_admin(auth.uid(), tenant_id));

-- =========================================================================
-- SYSTEM SETTINGS (per tenant)
-- =========================================================================
create table public.system_settings (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, key)
);
grant select, insert, update, delete on public.system_settings to authenticated;
grant all on public.system_settings to service_role;
alter table public.system_settings enable row level security;
create policy ss_read on public.system_settings
  for select to authenticated using (public.is_tenant_member(auth.uid(), tenant_id));
create policy ss_admin on public.system_settings
  for all to authenticated
  using (public.is_tenant_admin(auth.uid(), tenant_id))
  with check (public.is_tenant_admin(auth.uid(), tenant_id));

-- =========================================================================
-- AUDIT LOG
-- =========================================================================
create table public.audit_logs (
  id bigserial primary key,
  tenant_id uuid references public.tenants(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index al_tenant_idx on public.audit_logs(tenant_id, created_at desc);
grant select, insert on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create policy al_read_admin on public.audit_logs
  for select to authenticated using (
    tenant_id is null and public.is_super_admin(auth.uid())
    or (tenant_id is not null and public.is_tenant_admin(auth.uid(), tenant_id))
  );
create policy al_insert_any on public.audit_logs
  for insert to authenticated with check (actor_id = auth.uid());

-- =========================================================================
-- SEED default categories & priorities on tenant creation
-- =========================================================================
create or replace function public.seed_tenant_defaults()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.garbage_categories (tenant_id,name,color,icon,sort_order) values
    (new.id,'Household waste','#0d9488','trash-2',1),
    (new.id,'Recyclable','#10b981','recycle',2),
    (new.id,'Organic','#84cc16','leaf',3),
    (new.id,'Hazardous','#ef4444','biohazard',4),
    (new.id,'Bulk / Furniture','#6366f1','sofa',5),
    (new.id,'E-waste','#8b5cf6','plug-zap',6);

  insert into public.priorities (tenant_id,name,level,sla_minutes,color) values
    (new.id,'Low',1,4320,'#64748b'),
    (new.id,'Medium',2,1440,'#f59e0b'),
    (new.id,'High',3,360,'#f97316'),
    (new.id,'Urgent',4,60,'#ef4444');

  insert into public.notification_templates (tenant_id,key,channel,subject,body) values
    (new.id,'report.assigned','email','Your report has been assigned','A collector has been assigned to your garbage report.'),
    (new.id,'report.completed','email','Your report was completed','A collector has marked your report as completed.'),
    (new.id,'report.verified','email','Your report is closed','Your report has been verified and closed. Please rate the service.');
  return new;
end $$;

create trigger on_tenant_created after insert on public.tenants
  for each row execute function public.seed_tenant_defaults();

-- =========================================================================
-- STORAGE POLICIES
-- =========================================================================
-- report-photos bucket: path convention `{tenant_id}/{report_id}/{uuid}.jpg`
create policy "report_photos_read_member" on storage.objects
  for select to authenticated using (
    bucket_id = 'report-photos'
    and public.is_tenant_member(auth.uid(), (string_to_array(name,'/'))[1]::uuid)
  );
create policy "report_photos_insert_member" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'report-photos'
    and owner = auth.uid()
    and public.is_tenant_member(auth.uid(), (string_to_array(name,'/'))[1]::uuid)
  );
create policy "report_photos_delete_owner_or_staff" on storage.objects
  for delete to authenticated using (
    bucket_id = 'report-photos' and (
      owner = auth.uid()
      or public.is_tenant_staff(auth.uid(), (string_to_array(name,'/'))[1]::uuid)
    )
  );

-- tenant-logos bucket: `{tenant_id}/logo.<ext>`
create policy "tenant_logos_read_any_auth" on storage.objects
  for select to authenticated using (bucket_id = 'tenant-logos');
create policy "tenant_logos_write_admin" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'tenant-logos'
    and public.is_tenant_admin(auth.uid(), (string_to_array(name,'/'))[1]::uuid)
  )
  with check (
    bucket_id = 'tenant-logos'
    and public.is_tenant_admin(auth.uid(), (string_to_array(name,'/'))[1]::uuid)
  );
