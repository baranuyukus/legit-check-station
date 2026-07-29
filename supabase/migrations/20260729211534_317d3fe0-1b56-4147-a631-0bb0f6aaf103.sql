-- CERTIFICATES ----------------------------------------------------------
ALTER TABLE public.certificates
  ADD COLUMN owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN owner_masked text,
  ADD COLUMN claim_token text NOT NULL DEFAULT (replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','')),
  ADD COLUMN claimed_at timestamptz,
  ADD COLUMN shopify_order_id text,
  ADD COLUMN shopify_order_name text,
  ADD COLUMN shopify_line_item_id text;

CREATE UNIQUE INDEX certificates_claim_token_key ON public.certificates (claim_token);
CREATE UNIQUE INDEX certificates_shopify_line_item_key
  ON public.certificates (shopify_line_item_id) WHERE shopify_line_item_id IS NOT NULL;
CREATE INDEX certificates_owner_user_id_idx ON public.certificates (owner_user_id);

CREATE POLICY "Owners can view their certificates"
  ON public.certificates FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

-- OWNERSHIP HISTORY ------------------------------------------------------
ALTER TABLE public.ownership_history
  ADD COLUMN owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN kind text NOT NULL DEFAULT 'manual';

CREATE POLICY "Owners can view history of their certificates"
  ON public.ownership_history FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.certificates c
    WHERE c.id = ownership_history.certificate_id AND c.owner_user_id = auth.uid()
  ));

-- TRANSFER REQUESTS ------------------------------------------------------
CREATE TABLE public.transfer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid NOT NULL REFERENCES public.certificates(id) ON DELETE CASCADE,
  from_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  to_email text NOT NULL,
  code_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.transfer_requests TO authenticated;
GRANT ALL ON public.transfer_requests TO service_role;

ALTER TABLE public.transfer_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Senders can view their transfer requests"
  ON public.transfer_requests FOR SELECT TO authenticated
  USING (from_user_id = auth.uid());

CREATE POLICY "Admins can view transfer requests"
  ON public.transfer_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX transfer_requests_certificate_idx ON public.transfer_requests (certificate_id);
CREATE INDEX transfer_requests_to_email_idx ON public.transfer_requests (lower(to_email));

CREATE TRIGGER update_transfer_requests_updated_at
  BEFORE UPDATE ON public.transfer_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SHOPIFY ORDERS ---------------------------------------------------------
CREATE TABLE public.shopify_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_order_id text NOT NULL UNIQUE,
  order_name text,
  customer_email text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.shopify_orders TO authenticated;
GRANT ALL ON public.shopify_orders TO service_role;

ALTER TABLE public.shopify_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view shopify orders"
  ON public.shopify_orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));