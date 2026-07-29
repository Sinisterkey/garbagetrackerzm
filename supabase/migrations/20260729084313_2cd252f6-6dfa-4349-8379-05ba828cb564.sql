CREATE POLICY reports_read_collector_pool ON public.reports FOR SELECT TO authenticated
USING (public.has_tenant_role(auth.uid(), tenant_id, 'collector') AND assigned_collector_id IS NULL AND deleted_at IS NULL);

CREATE POLICY reports_claim_collector ON public.reports FOR UPDATE TO authenticated
USING (public.has_tenant_role(auth.uid(), tenant_id, 'collector') AND assigned_collector_id IS NULL AND status = 'submitted')
WITH CHECK (assigned_collector_id = auth.uid());