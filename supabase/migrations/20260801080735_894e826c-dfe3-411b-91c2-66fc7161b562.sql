REVOKE SELECT ON public.certificates FROM anon, authenticated;

GRANT SELECT (
  id, auth_code, product_name, brand, size, colorway, condition, image_url,
  verified_date, purchase_date, current_owner, notes, is_published,
  created_at, updated_at, owner_user_id, owner_masked, claimed_at,
  claim_locked, assigned_at
) ON public.certificates TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;

CREATE OR REPLACE FUNCTION public.admin_list_certificates()
RETURNS SETOF public.certificates
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.* FROM public.certificates c
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
  ORDER BY c.created_at DESC
$$;

CREATE OR REPLACE FUNCTION public.admin_get_certificate(_id uuid)
RETURNS SETOF public.certificates
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.* FROM public.certificates c
  WHERE c.id = _id AND public.has_role(auth.uid(), 'admin'::app_role)
$$;

REVOKE ALL ON FUNCTION public.admin_list_certificates() FROM public, anon;
REVOKE ALL ON FUNCTION public.admin_get_certificate(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_certificates() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_certificate(uuid) TO authenticated;