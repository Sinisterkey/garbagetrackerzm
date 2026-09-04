-- 1. Membership status
alter table public.tenant_members
  add column if not exists status text not null default 'approved',
  add column if not exists approved_by uuid,
  add column if not exists approved_at timestamptz;

alter table public.tenant_members drop constraint if exists tenant_members_status_check;
alter table public.tenant_members
  add constraint tenant_members_status_check check (status in ('pending','approved','rejected'));

-- Existing collectors must be re-approved
update public.tenant_members set status = 'pending' where role = 'collector';

-- Platform admin
insert into public.super_admins (user_id)
select id from auth.users where lower(email) = 'admin@demo.garbagetracker.app'
on conflict do nothing;

-- 2. Membership helpers only count approved rows
create or replace function public.is_tenant_member(_uid uuid, _tenant uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists(
    select 1 from public.tenant_members
    where user_id = _uid and tenant_id = _tenant and active and status = 'approved'
  ) or public.is_super_admin(_uid)
$$;

create or replace function public.is_tenant_staff(_uid uuid, _tenant uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists(
    select 1 from public.tenant_members
    where user_id = _uid and tenant_id = _tenant and active and status = 'approved'
      and role in ('supervisor','administrator')
  ) or public.is_super_admin(_uid)
$$;

create or replace function public.has_tenant_role(_uid uuid, _tenant uuid, _role app_role)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists(
    select 1 from public.tenant_members
    where user_id = _uid and tenant_id = _tenant and role = _role and active and status = 'approved'
  )
$$;

-- 3. Tenant creation is super-admin only now
drop function if exists public.create_tenant_with_admin(text, text, double precision, double precision);

create or replace function public.create_tenant(_name text, _timezone text default 'UTC',
  _center_lat double precision default 0, _center_lng double precision default 0)
returns public.tenants language plpgsql security definer set search_path to 'public' as $$
declare
  base_slug text; final_slug text; n int := 1; t public.tenants;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not public.is_super_admin(auth.uid()) then raise exception 'Only the platform administrator can create municipalities'; end if;
  if _name is null or length(btrim(_name)) < 2 then raise exception 'Municipality name must be at least 2 characters'; end if;

  base_slug := nullif(regexp_replace(lower(btrim(_name)), '[^a-z0-9]+', '-', 'g'), '');
  base_slug := btrim(coalesce(base_slug, 'municipality'), '-');
  if base_slug = '' then base_slug := 'municipality'; end if;
  base_slug := left(base_slug, 40);
  final_slug := base_slug;
  while exists (select 1 from public.tenants where slug = final_slug) loop
    n := n + 1; final_slug := left(base_slug, 36) || '-' || n::text;
  end loop;

  insert into public.tenants (name, slug, timezone, center_lat, center_lng)
  values (btrim(_name), final_slug, coalesce(nullif(btrim(_timezone), ''), 'UTC'), coalesce(_center_lat,0), coalesce(_center_lng,0))
  returning * into t;

  insert into public.tenant_members (tenant_id, user_id, role, active, status, approved_at)
  values (t.id, auth.uid(), 'administrator', true, 'approved', now()) on conflict do nothing;

  insert into public.audit_logs (tenant_id, actor_id, action, entity, entity_id)
  values (t.id, auth.uid(), 'tenant.created', 'tenant', t.id::text);
  return t;
end $$;

-- 4. Collector sign-up (join existing or create new municipality) -> pending
create or replace function public.signup_collector(_tenant_id uuid default null, _new_name text default null,
  _timezone text default 'UTC', _center_lat double precision default 0, _center_lng double precision default 0)
returns public.tenant_members language plpgsql security definer set search_path to 'public' as $$
declare
  base_slug text; final_slug text; n int := 1; tid uuid; m public.tenant_members;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  if _tenant_id is not null then
    select id into tid from public.tenants where id = _tenant_id and active;
    if tid is null then raise exception 'Municipality not found'; end if;
  else
    if _new_name is null or length(btrim(_new_name)) < 2 then raise exception 'Municipality name must be at least 2 characters'; end if;
    base_slug := nullif(regexp_replace(lower(btrim(_new_name)), '[^a-z0-9]+', '-', 'g'), '');
    base_slug := btrim(coalesce(base_slug, 'municipality'), '-');
    if base_slug = '' then base_slug := 'municipality'; end if;
    base_slug := left(base_slug, 40);
    final_slug := base_slug;
    while exists (select 1 from public.tenants where slug = final_slug) loop
      n := n + 1; final_slug := left(base_slug, 36) || '-' || n::text;
    end loop;
    insert into public.tenants (name, slug, timezone, center_lat, center_lng)
    values (btrim(_new_name), final_slug, coalesce(nullif(btrim(_timezone), ''), 'UTC'), coalesce(_center_lat,0), coalesce(_center_lng,0))
    returning id into tid;
    insert into public.audit_logs (tenant_id, actor_id, action, entity, entity_id)
    values (tid, auth.uid(), 'tenant.created_by_collector', 'tenant', tid::text);
  end if;

  select * into m from public.tenant_members where tenant_id = tid and user_id = auth.uid() and role = 'collector';
  if m.id is not null then
    if m.status = 'approved' and m.active then return m; end if;
    update public.tenant_members set status = 'pending', active = true, approved_by = null, approved_at = null
    where id = m.id returning * into m;
  else
    insert into public.tenant_members (tenant_id, user_id, role, active, status)
    values (tid, auth.uid(), 'collector', true, 'pending') returning * into m;
  end if;

  insert into public.audit_logs (tenant_id, actor_id, action, entity, entity_id)
  values (tid, auth.uid(), 'collector.requested', 'tenant_member', m.id::text);
  return m;
end $$;

-- 5. Approvals (super admin only)
create or replace function public.list_pending_collectors()
returns table(id uuid, user_id uuid, tenant_id uuid, tenant_name text, full_name text, email text, phone text, created_at timestamptz)
language sql stable security definer set search_path to 'public' as $$
  select tm.id, tm.user_id, tm.tenant_id, t.name, p.full_name, p.email, p.phone, tm.created_at
  from public.tenant_members tm
  join public.tenants t on t.id = tm.tenant_id
  left join public.profiles p on p.id = tm.user_id
  where tm.role = 'collector' and tm.status = 'pending' and tm.active
    and public.is_super_admin(auth.uid())
  order by tm.created_at
$$;

create or replace function public.review_collector(_member_id uuid, _approve boolean)
returns public.tenant_members language plpgsql security definer set search_path to 'public' as $$
declare m public.tenant_members; tname text;
begin
  if auth.uid() is null or not public.is_super_admin(auth.uid()) then
    raise exception 'Only the platform administrator can review collectors';
  end if;
  select * into m from public.tenant_members where id = _member_id and role = 'collector';
  if m.id is null then raise exception 'Request not found'; end if;

  if _approve then
    update public.tenant_members set status = 'approved', active = true, approved_by = auth.uid(), approved_at = now()
    where id = m.id returning * into m;
  else
    update public.tenant_members set status = 'rejected', active = false, approved_by = auth.uid(), approved_at = now()
    where id = m.id returning * into m;
  end if;

  select name into tname from public.tenants where id = m.tenant_id;
  insert into public.notifications (tenant_id, user_id, title, body, link)
  values (m.tenant_id, m.user_id,
    case when _approve then 'Collector account approved' else 'Collector request declined' end,
    case when _approve then 'You can now sign in and start collecting for ' || tname || '.'
         else 'Your request to collect for ' || tname || ' was not approved.' end,
    case when _approve then '/jobs' else null end);
  insert into public.audit_logs (tenant_id, actor_id, action, entity, entity_id)
  values (m.tenant_id, auth.uid(), case when _approve then 'collector.approved' else 'collector.rejected' end, 'tenant_member', m.id::text);
  return m;
end $$;

-- 6. Super admin directory of all tenants (full rows)
create or replace function public.list_all_tenants()
returns setof public.tenants language sql stable security definer set search_path to 'public' as $$
  select * from public.tenants where public.is_super_admin(auth.uid()) order by name
$$;

grant execute on function public.create_tenant(text, text, double precision, double precision) to authenticated;
grant execute on function public.signup_collector(uuid, text, text, double precision, double precision) to authenticated;
grant execute on function public.list_pending_collectors() to authenticated;
grant execute on function public.review_collector(uuid, boolean) to authenticated;
grant execute on function public.list_all_tenants() to authenticated;