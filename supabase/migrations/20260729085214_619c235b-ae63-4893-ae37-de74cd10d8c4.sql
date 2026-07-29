DROP POLICY IF EXISTS rc_read ON public.report_comments;
DROP POLICY IF EXISTS rc_insert ON public.report_comments;

CREATE POLICY rc_read ON public.report_comments FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.reports r
  WHERE r.id = report_comments.report_id
    AND (r.reporter_id = auth.uid()
      OR r.assigned_collector_id = auth.uid()
      OR public.has_tenant_role(auth.uid(), r.tenant_id, 'collector')
      OR public.is_tenant_staff(auth.uid(), r.tenant_id))
));

CREATE POLICY rc_insert ON public.report_comments FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid() AND EXISTS (
  SELECT 1 FROM public.reports r
  WHERE r.id = report_comments.report_id
    AND (r.reporter_id = auth.uid()
      OR r.assigned_collector_id = auth.uid()
      OR public.has_tenant_role(auth.uid(), r.tenant_id, 'collector')
      OR public.is_tenant_staff(auth.uid(), r.tenant_id))
));