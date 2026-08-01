create or replace function public.list_tenant_directory()
returns table (id uuid, name text, slug text)
language sql
stable
security definer
set search_path = public
as $$
  select t.id, t.name, t.slug from public.tenants t where t.active order by t.name
$$;

revoke all on function public.list_tenant_directory() from public, anon;
grant execute on function public.list_tenant_directory() to authenticated;

create or replace function public.create_tenant_with_admin(
  _name text,
  _timezone text default 'UTC',
  _center_lat double precision default 0,
  _center_lng double precision default 0
)
returns public.tenants
language plpgsql
security definer
set search_path = public
as $$
declare
  base_slug text;
  final_slug text;
  n int := 1;
  t public.tenants;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if _name is null or length(btrim(_name)) < 2 then
    raise exception 'Municipality name must be at least 2 characters';
  end if;

  base_slug := nullif(regexp_replace(lower(btrim(_name)), '[^a-z0-9]+', '-', 'g'), '');
  base_slug := btrim(coalesce(base_slug, 'municipality'), '-');
  if base_slug = '' then base_slug := 'municipality'; end if;
  base_slug := left(base_slug, 40);
  final_slug := base_slug;

  while exists (select 1 from public.tenants where slug = final_slug) loop
    n := n + 1;
    final_slug := left(base_slug, 36) || '-' || n::text;
  end loop;

  insert into public.tenants (name, slug, timezone, center_lat, center_lng)
  values (btrim(_name), final_slug, coalesce(nullif(btrim(_timezone), ''), 'UTC'),
          coalesce(_center_lat, 0), coalesce(_center_lng, 0))
  returning * into t;

  insert into public.tenant_members (tenant_id, user_id, role, active)
  values (t.id, auth.uid(), 'administrator', true)
  on conflict do nothing;

  insert into public.audit_logs (tenant_id, actor_id, action, entity, entity_id)
  values (t.id, auth.uid(), 'tenant.created', 'tenant', t.id::text);

  return t;
end $$;

revoke all on function public.create_tenant_with_admin(text, text, double precision, double precision) from public, anon;
grant execute on function public.create_tenant_with_admin(text, text, double precision, double precision) to authenticated;