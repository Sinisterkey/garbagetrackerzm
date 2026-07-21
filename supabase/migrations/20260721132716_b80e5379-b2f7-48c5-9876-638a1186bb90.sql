
-- Remove overly-permissive tenants insert; onboarding server fn (uses service role) will create tenants + memberships atomically.
drop policy if exists tenants_bootstrap_insert on public.tenants;

-- Restrict SECURITY DEFINER function execution to authenticated users only
revoke execute on function public.is_super_admin(uuid) from public, anon;
revoke execute on function public.has_tenant_role(uuid, uuid, public.app_role) from public, anon;
revoke execute on function public.is_tenant_member(uuid, uuid) from public, anon;
revoke execute on function public.is_tenant_staff(uuid, uuid) from public, anon;
revoke execute on function public.is_tenant_admin(uuid, uuid) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.seed_tenant_defaults() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

grant execute on function public.is_super_admin(uuid) to authenticated;
grant execute on function public.has_tenant_role(uuid, uuid, public.app_role) to authenticated;
grant execute on function public.is_tenant_member(uuid, uuid) to authenticated;
grant execute on function public.is_tenant_staff(uuid, uuid) to authenticated;
grant execute on function public.is_tenant_admin(uuid, uuid) to authenticated;
