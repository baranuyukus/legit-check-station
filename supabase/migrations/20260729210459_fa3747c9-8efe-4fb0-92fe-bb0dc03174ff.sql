CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Admins can view roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_code text NOT NULL UNIQUE,
  product_name text NOT NULL,
  brand text,
  size text,
  colorway text,
  condition text NOT NULL DEFAULT 'New / Deadstock',
  image_url text,
  verified_date date NOT NULL DEFAULT current_date,
  purchase_date date,
  current_owner text,
  notes text,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.certificates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published certificates are public"
ON public.certificates FOR SELECT TO anon, authenticated
USING (is_published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage certificates"
ON public.certificates FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_certificates_updated_at
BEFORE UPDATE ON public.certificates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ownership_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid NOT NULL REFERENCES public.certificates(id) ON DELETE CASCADE,
  owner_handle text NOT NULL,
  transferred_at date NOT NULL DEFAULT current_date,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ownership_history TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ownership_history TO authenticated;
GRANT ALL ON public.ownership_history TO service_role;
ALTER TABLE public.ownership_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ownership history is public for published items"
ON public.ownership_history FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.certificates c
  WHERE c.id = certificate_id AND (c.is_published = true OR public.has_role(auth.uid(), 'admin'))
));

CREATE POLICY "Admins manage ownership history"
ON public.ownership_history FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_ownership_history_cert ON public.ownership_history (certificate_id);

CREATE POLICY "Item images are readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'item-images');

CREATE POLICY "Admins can upload item images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'item-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update item images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'item-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete item images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'item-images' AND public.has_role(auth.uid(), 'admin'));