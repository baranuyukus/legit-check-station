REVOKE SELECT (claim_token) ON public.certificates FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_claim_token(_certificate_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.claim_token
  FROM public.certificates c
  WHERE c.id = _certificate_id
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR c.owner_user_id = auth.uid())
$$;

REVOKE ALL ON FUNCTION public.get_claim_token(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_claim_token(uuid) TO authenticated;