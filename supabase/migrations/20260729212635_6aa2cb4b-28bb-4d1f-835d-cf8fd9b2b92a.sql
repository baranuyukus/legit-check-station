-- 1. Profiles: ad soyad + telefon
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone text;

-- 2. Certificates: atama alanları
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS assigned_email text,
  ADD COLUMN IF NOT EXISTS claim_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz;

CREATE INDEX IF NOT EXISTS certificates_assigned_email_idx
  ON public.certificates (lower(assigned_email));

-- 3. QR / doğrulama trafiği
CREATE TABLE public.scan_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid REFERENCES public.certificates(id) ON DELETE CASCADE,
  auth_code text,
  kind text NOT NULL DEFAULT 'verify',
  country text,
  city text,
  device_type text,
  browser text,
  os text,
  referrer text,
  ip_hash text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.scan_events TO anon, authenticated;
GRANT SELECT ON public.scan_events TO authenticated;
GRANT ALL ON public.scan_events TO service_role;

ALTER TABLE public.scan_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log a scan"
  ON public.scan_events FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view scan events"
  ON public.scan_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners can view scans of their certificates"
  ON public.scan_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.certificates c
    WHERE c.id = scan_events.certificate_id AND c.owner_user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS scan_events_cert_idx ON public.scan_events (certificate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS scan_events_created_idx ON public.scan_events (created_at DESC);

-- 4. Kayıt olurken profil bilgileri + bekleyen atamaların devri
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _masked text;
BEGIN
  INSERT INTO public.profiles (id, email, display_name, full_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'phone'
  )
  ON CONFLICT (id) DO UPDATE
    SET full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone);

  -- maskelenmiş e-posta
  _masked := regexp_replace(split_part(NEW.email, '@', 1), '(.)(.*)(.)$', '\1***\3')
             || '@' || split_part(NEW.email, '@', 2);

  -- bu e-postaya önceden atanmış sahipsiz sertifikaları devral
  UPDATE public.certificates c
     SET owner_user_id = NEW.id,
         owner_masked = _masked,
         claimed_at = COALESCE(c.claimed_at, now())
   WHERE lower(c.assigned_email) = lower(NEW.email)
     AND c.owner_user_id IS NULL;

  INSERT INTO public.ownership_history (certificate_id, owner_handle, owner_user_id, kind, note)
  SELECT c.id, _masked, NEW.id, 'assignment', 'Yönetici ataması kayıt sonrası aktifleşti'
    FROM public.certificates c
   WHERE c.owner_user_id = NEW.id
     AND lower(c.assigned_email) = lower(NEW.email);

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;