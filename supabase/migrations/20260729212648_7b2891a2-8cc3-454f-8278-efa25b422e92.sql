DROP POLICY IF EXISTS "Anyone can log a scan" ON public.scan_events;

CREATE POLICY "Scans can be logged for existing certificates"
  ON public.scan_events FOR INSERT TO anon, authenticated
  WITH CHECK (
    certificate_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.certificates c WHERE c.id = scan_events.certificate_id)
  );