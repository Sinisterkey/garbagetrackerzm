CREATE OR REPLACE FUNCTION public.signup_collector(_tenant_id uuid DEFAULT NULL::uuid, _new_name text DEFAULT NULL::text, _timezone text DEFAULT 'UTC'::text, _center_lat double precision DEFAULT 0, _center_lng double precision DEFAULT 0)
 RETURNS tenant_members
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end $function$;