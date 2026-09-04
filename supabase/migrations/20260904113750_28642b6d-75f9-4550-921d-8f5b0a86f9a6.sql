revoke execute on function public.create_tenant(text, text, double precision, double precision) from public, anon;
revoke execute on function public.signup_collector(uuid, text, text, double precision, double precision) from public, anon;
revoke execute on function public.list_pending_collectors() from public, anon;
revoke execute on function public.review_collector(uuid, boolean) from public, anon;
revoke execute on function public.list_all_tenants() from public, anon;
revoke execute on function public.list_tenant_directory() from public, anon;
grant execute on function public.list_tenant_directory() to authenticated;