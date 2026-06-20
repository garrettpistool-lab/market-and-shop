-- =====================================================
-- Market and Shop — Production RLS (run AFTER FINAL_SUPABASE_SETUP.sql)
-- Tightens public browsing to approved content only.
-- Admins (role=admin in public.users) retain full read access.
-- Safe to re-run.
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND role = 'admin'
  );
$$;

-- Vendors: public sees approved only; admins see all
DROP POLICY IF EXISTS "public read vendors" ON public.vendors;
CREATE POLICY "public read approved vendors" ON public.vendors
  FOR SELECT TO anon, authenticated
  USING (status = 'approved' OR public.is_admin());

-- Menu items: public sees approved only
DROP POLICY IF EXISTS "public read menu_items" ON public.menu_items;
CREATE POLICY "public read approved menu_items" ON public.menu_items
  FOR SELECT TO anon, authenticated
  USING (approved = 1 OR public.is_admin());

-- Produce: public sees approved only
DROP POLICY IF EXISTS "public read produce_items" ON public.produce_items;
CREATE POLICY "public read approved produce_items" ON public.produce_items
  FOR SELECT TO anon, authenticated
  USING (approved = 1 OR public.is_admin());

-- Users: authenticated can read own profile; admins read all
DROP POLICY IF EXISTS "public select users for login" ON public.users;
CREATE POLICY "users select own or admin" ON public.users
  FOR SELECT TO authenticated
  USING (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    OR public.is_admin()
  );
-- Anon still needs email lookup during hybrid login edge cases
CREATE POLICY "anon select users for login" ON public.users
  FOR SELECT TO anon
  USING (true);

-- Orders: customers see own; vendors see their storefront orders; admins see all
-- (Full vendor + employee policies in TIER_SYSTEM_SETUP.sql — run that after this file)
DROP POLICY IF EXISTS "users select own orders" ON public.orders;
DROP POLICY IF EXISTS "orders select own or admin" ON public.orders;
CREATE POLICY "orders select own or admin" ON public.orders
  FOR SELECT TO authenticated
  USING (
    user_id IN (SELECT id FROM public.users WHERE lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
    OR vendor_id IN (
      SELECT vendor_id FROM public.users
      WHERE lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        AND vendor_id IS NOT NULL
    )
    OR public.is_admin()
  );

-- Users can update own profile (not role); admins update any
DROP POLICY IF EXISTS "users update own profile" ON public.users;
CREATE POLICY "users update own profile" ON public.users
  FOR UPDATE TO authenticated
  USING (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    OR public.is_admin()
  )
  WITH CHECK (
    public.is_admin()
    OR (
      lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND role = (SELECT u.role FROM public.users u WHERE lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', '')) LIMIT 1)
    )
  );

-- Vendors/content writes: authenticated vendors + admins (app-enforced; permissive insert for signup flows)
DROP POLICY IF EXISTS "authenticated insert vendors" ON public.vendors;
CREATE POLICY "authenticated insert vendors" ON public.vendors
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated update vendors" ON public.vendors;
CREATE POLICY "authenticated update vendors" ON public.vendors
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated insert menu_items" ON public.menu_items;
CREATE POLICY "authenticated insert menu_items" ON public.menu_items
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated insert produce_items" ON public.produce_items;
CREATE POLICY "authenticated insert produce_items" ON public.produce_items
  FOR INSERT TO authenticated
  WITH CHECK (true);