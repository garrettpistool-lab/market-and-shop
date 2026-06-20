-- =====================================================
-- Market and Shop — Tier System (run AFTER REVIEWS_ADVANCED_SETUP.sql)
-- Vendor free/paid plans, customer free/paid, employees,
-- storefront customization, vendor order RLS fix, purchase counts
-- Safe to re-run.
-- =====================================================

-- -----------------------------------------------------------------
-- 1. Vendor storefront & plan columns
-- -----------------------------------------------------------------
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT '#083a9b';
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS slogan TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS banner_images JSONB DEFAULT '[]'::jsonb;

UPDATE public.vendors SET plan = 'free' WHERE plan IS NULL;
UPDATE public.vendors SET theme_color = '#083a9b' WHERE theme_color IS NULL;
UPDATE public.vendors SET banner_images = '[]'::jsonb WHERE banner_images IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vendors_plan_check'
  ) THEN
    ALTER TABLE public.vendors
      ADD CONSTRAINT vendors_plan_check CHECK (plan IN ('free', 'paid'));
  END IF;
END $$;

-- Test vendor on paid plan for storefront demo (optional)
UPDATE public.vendors SET plan = 'paid', slogan = 'Fresh local flavors, made with care.'
WHERE email ILIKE 'vendor@example.com'
   OR name ILIKE '%test vendor%';

-- -----------------------------------------------------------------
-- 2. Customer plan & delivery link columns
-- -----------------------------------------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS customer_plan TEXT DEFAULT 'free';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS purchase_count INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS doordash_linked BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ubereats_linked BOOLEAN DEFAULT false;

UPDATE public.users SET customer_plan = 'free' WHERE customer_plan IS NULL;
UPDATE public.users SET purchase_count = coalesce(purchase_count, 0);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_customer_plan_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_customer_plan_check CHECK (customer_plan IN ('free', 'paid'));
  END IF;
END $$;

-- -----------------------------------------------------------------
-- 3. Vendor employees
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_employees (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  employee_email TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (vendor_id, employee_email)
);

CREATE INDEX IF NOT EXISTS idx_vendor_employees_email
  ON public.vendor_employees (lower(employee_email))
  WHERE active = true;

ALTER TABLE public.vendor_employees ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_employees TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.vendor_employees_id_seq TO authenticated;

-- -----------------------------------------------------------------
-- 4. Helper functions
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.users
  WHERE lower(email) = public.current_user_email()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.vendor_plan_for(p_vendor_id INTEGER)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(plan, 'free') FROM public.vendors WHERE id = p_vendor_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.employee_permissions_for(p_vendor_id INTEGER)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(permissions, '[]'::jsonb)
  FROM public.vendor_employees
  WHERE vendor_id = p_vendor_id
    AND lower(employee_email) = public.current_user_email()
    AND active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.employee_has_permission(p_vendor_id INTEGER, p_perm TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin()
    OR public.current_user_vendor_id() = p_vendor_id
    OR EXISTS (
      SELECT 1 FROM public.vendor_employees ve
      WHERE ve.vendor_id = p_vendor_id
        AND lower(ve.employee_email) = public.current_user_email()
        AND ve.active = true
        AND ve.permissions ? p_perm
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_vendor_orders(p_vendor_id INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.employee_has_permission(p_vendor_id, 'orders')
     OR public.current_user_vendor_id() = p_vendor_id
     OR public.is_admin();
$$;

-- Customer rating gate: free plan needs 15+ purchases
CREATE OR REPLACE FUNCTION public.customer_can_rate()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE lower(u.email) = public.current_user_email()
        AND (
          u.customer_plan = 'paid'
          OR coalesce(u.purchase_count, 0) >= 15
        )
    );
$$;

-- Updated order-gated reviews with customer plan + purchase count
CREATE OR REPLACE FUNCTION public.can_review_vendor(p_vendor_id INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin()
    OR (
      public.customer_can_rate()
      AND EXISTS (
        SELECT 1 FROM public.orders o
        JOIN public.users u ON u.id = o.user_id
        WHERE o.vendor_id = p_vendor_id
          AND lower(u.email) = public.current_user_email()
          AND lower(coalesce(o.status, 'placed')) IN (
            'placed', 'preparing', 'delivered', 'completed', 'fulfilled'
          )
      )
    );
$$;

-- Increment purchase_count when order placed
CREATE OR REPLACE FUNCTION public.on_order_placed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    UPDATE public.users
    SET purchase_count = coalesce(purchase_count, 0) + 1
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_purchase_count ON public.orders;
CREATE TRIGGER trg_order_purchase_count
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.on_order_placed();

-- -----------------------------------------------------------------
-- 5. Orders RLS — vendors & employees can see their orders
-- -----------------------------------------------------------------
DROP POLICY IF EXISTS "orders select own or admin" ON public.orders;
DROP POLICY IF EXISTS "users select own orders" ON public.orders;
DROP POLICY IF EXISTS "orders_select_tier" ON public.orders;
DROP POLICY IF EXISTS "orders_update_vendor" ON public.orders;

CREATE POLICY "orders_select_tier" ON public.orders
  FOR SELECT TO authenticated
  USING (
    user_id = public.current_user_id()
    OR public.can_access_vendor_orders(vendor_id)
    OR public.is_admin()
  );

CREATE POLICY "orders_update_vendor" ON public.orders
  FOR UPDATE TO authenticated
  USING (public.can_access_vendor_orders(vendor_id))
  WITH CHECK (public.can_access_vendor_orders(vendor_id));

-- Customers can insert their own orders
DROP POLICY IF EXISTS "orders insert own" ON public.orders;
CREATE POLICY "orders_insert_own" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = public.current_user_id()
    OR public.is_admin()
  );

-- -----------------------------------------------------------------
-- 6. Vendor employees RLS
-- -----------------------------------------------------------------
DO $$
BEGIN
  DROP POLICY IF EXISTS "vendor_employees_owner" ON public.vendor_employees;
  DROP POLICY IF EXISTS "vendor_employees_select" ON public.vendor_employees;
  DROP POLICY IF EXISTS "vendor_employees_insert" ON public.vendor_employees;
  DROP POLICY IF EXISTS "vendor_employees_update" ON public.vendor_employees;
  DROP POLICY IF EXISTS "vendor_employees_delete" ON public.vendor_employees;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "vendor_employees_select" ON public.vendor_employees
  FOR SELECT TO authenticated
  USING (
    vendor_id = public.current_user_vendor_id()
    OR lower(employee_email) = public.current_user_email()
    OR public.is_admin()
  );

CREATE POLICY "vendor_employees_insert" ON public.vendor_employees
  FOR INSERT TO authenticated
  WITH CHECK (
    vendor_id = public.current_user_vendor_id()
    OR public.is_admin()
  );

CREATE POLICY "vendor_employees_update" ON public.vendor_employees
  FOR UPDATE TO authenticated
  USING (vendor_id = public.current_user_vendor_id() OR public.is_admin())
  WITH CHECK (vendor_id = public.current_user_vendor_id() OR public.is_admin());

CREATE POLICY "vendor_employees_delete" ON public.vendor_employees
  FOR DELETE TO authenticated
  USING (vendor_id = public.current_user_vendor_id() OR public.is_admin());

-- -----------------------------------------------------------------
-- 7. Vendor update RLS — owners + employees with profile_editor
-- -----------------------------------------------------------------
DROP POLICY IF EXISTS "authenticated update vendors" ON public.vendors;

CREATE POLICY "vendors_update_tier" ON public.vendors
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR id = public.current_user_vendor_id()
    OR public.employee_has_permission(id, 'profile_editor')
    OR public.employee_has_permission(id, 'bio_edit')
    OR public.employee_has_permission(id, 'theme')
    OR public.employee_has_permission(id, 'banners')
  )
  WITH CHECK (
    public.is_admin()
    OR id = public.current_user_vendor_id()
    OR public.employee_has_permission(id, 'profile_editor')
    OR public.employee_has_permission(id, 'bio_edit')
    OR public.employee_has_permission(id, 'theme')
    OR public.employee_has_permission(id, 'banners')
  );

-- -----------------------------------------------------------------
-- 8. Storage — vendor-assets bucket (logos, banners, avatars)
-- -----------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vendor-assets',
  'vendor-assets',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  DROP POLICY IF EXISTS "vendor_assets_public_read" ON storage.objects;
  DROP POLICY IF EXISTS "vendor_assets_auth_upload" ON storage.objects;
  DROP POLICY IF EXISTS "vendor_assets_auth_update" ON storage.objects;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "vendor_assets_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'vendor-assets');

CREATE POLICY "vendor_assets_auth_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vendor-assets');

CREATE POLICY "vendor_assets_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'vendor-assets');

-- Profile avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-avatars',
  'profile-avatars',
  true,
  3145728,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  DROP POLICY IF EXISTS "profile_avatars_public_read" ON storage.objects;
  DROP POLICY IF EXISTS "profile_avatars_auth_upload" ON storage.objects;
  DROP POLICY IF EXISTS "profile_avatars_auth_update" ON storage.objects;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "profile_avatars_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'profile-avatars');

CREATE POLICY "profile_avatars_auth_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile-avatars'
    AND (storage.foldername(name))[1] = public.current_user_email()
  );

CREATE POLICY "profile_avatars_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'profile-avatars'
    AND (storage.foldername(name))[1] = public.current_user_email()
  );

-- -----------------------------------------------------------------
-- 9. Edge function vault placeholders (set in Dashboard → Vault)
-- edge_notify_url = https://YOUR_PROJECT_REF.supabase.co/functions/v1/notify-low-rating
-- edge_notify_secret = <service_role_key>
-- RESEND_API_KEY set via: npx supabase secrets set RESEND_API_KEY=re_xxx
-- =====================================================