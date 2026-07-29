DROP POLICY "Published certificates are public" ON public.certificates;
CREATE POLICY "Published certificates are public"
ON public.certificates FOR SELECT TO anon, authenticated
USING (is_published = true);
CREATE POLICY "Admins can view all certificates"
ON public.certificates FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY "Ownership history is public for published items" ON public.ownership_history;
CREATE POLICY "Ownership history is public for published items"
ON public.ownership_history FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.certificates c
  WHERE c.id = certificate_id AND c.is_published = true
));
CREATE POLICY "Admins can view all ownership history"
ON public.ownership_history FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));