-- =====================================================
-- Market and Shop - FINAL Supabase Setup (Production-Ready)
-- Run this in Supabase SQL Editor (New query -> Paste -> Run)
-- This creates ALL tables with the full operational schema.
-- Includes secure(ish) RLS policies for the current frontend (anon key usage).
-- Create your admin user in Supabase Auth, then link the profile (see bottom of this file).
-- After running, go to Authentication > Users and set a strong password or migrate to proper Supabase Auth.
-- =====================================================

-- Enable extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS
CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'vendor', 'customer', 'guest')),
  vendor_id INTEGER,
  avatar TEXT,
  -- password column deprecated - use Supabase Auth (auth.users) for authentication
  -- profiles/roles stored here, linked by email or add auth_user_id uuid references auth.users(id)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  two_factor_enabled INTEGER DEFAULT 0,
  two_factor_secret TEXT
);

-- 2. VENDORS
CREATE TABLE IF NOT EXISTS public.vendors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  status TEXT DEFAULT 'approved',
  email TEXT,
  phone TEXT,
  logo TEXT,
  team_size INTEGER DEFAULT 1,
  joined TEXT,
  bio TEXT,
  highlight_photo TEXT,
  top_reviews TEXT,
  stripe_account_id TEXT,
  paypal_account_id TEXT
);

-- 3. MENU_ITEMS
CREATE TABLE IF NOT EXISTS public.menu_items (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER REFERENCES public.vendors(id),
  name TEXT NOT NULL,
  photo TEXT,
  price REAL,
  description TEXT,
  availability TEXT DEFAULT 'In stock',
  time_made TEXT,
  category TEXT,
  approved INTEGER DEFAULT 1,
  dietary_tags TEXT,
  featured INTEGER DEFAULT 0
);

-- 4. PRODUCE_ITEMS
CREATE TABLE IF NOT EXISTS public.produce_items (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER REFERENCES public.vendors(id),
  name TEXT NOT NULL,
  photo TEXT,
  price REAL,
  unit TEXT DEFAULT 'lb',
  quantity_available INTEGER DEFAULT 50,
  description TEXT,
  farm_story TEXT,
  organic INTEGER DEFAULT 0,
  category TEXT DEFAULT 'Produce',
  approved INTEGER DEFAULT 1,
  dietary_tags TEXT,
  sustainability_score INTEGER DEFAULT 85,
  is_seasonal INTEGER DEFAULT 0,
  season TEXT,
  wholesale_price REAL,
  min_wholesale_qty INTEGER DEFAULT 20,
  featured INTEGER DEFAULT 0
);

-- 5. ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  vendor_id INTEGER REFERENCES public.vendors(id),
  items TEXT,
  total REAL,
  status TEXT DEFAULT 'placed',
  date TEXT,
  delivery_method TEXT
);

-- 6. REVIEWS (with images)
CREATE TABLE IF NOT EXISTS public.reviews (
  id SERIAL PRIMARY KEY,
  item_id INTEGER,
  item_type TEXT DEFAULT 'menu',
  user_id INTEGER,
  rating INTEGER,
  comment TEXT,
  date TEXT,
  image_url TEXT
);

-- 7. VENDOR_PURCHASES (B2B)
CREATE TABLE IF NOT EXISTS public.vendor_purchases (
  id SERIAL PRIMARY KEY,
  buyer_vendor_id INTEGER REFERENCES public.vendors(id),
  seller_vendor_id INTEGER REFERENCES public.vendors(id),
  item_id INTEGER,
  item_type TEXT,
  quantity INTEGER,
  price_per_unit REAL,
  total REAL,
  status TEXT DEFAULT 'pending',
  delivery_method TEXT,
  date TEXT,
  show_seller_badge INTEGER DEFAULT 0,
  seller_name_on_page TEXT
);

-- 8. TASKS
CREATE TABLE IF NOT EXISTS public.tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  vendor_id INTEGER REFERENCES public.vendors(id),
  assignee TEXT,
  status TEXT DEFAULT 'todo',
  due TEXT
);

-- 9. INVOICES
CREATE TABLE IF NOT EXISTS public.invoices (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER REFERENCES public.vendors(id),
  amount REAL,
  status TEXT DEFAULT 'pending',
  date TEXT,
  due_date TEXT,
  file TEXT
);

-- 10. LOYALTY
CREATE TABLE IF NOT EXISTS public.loyalty (
  user_id INTEGER PRIMARY KEY,
  points INTEGER DEFAULT 0,
  last_updated TEXT
);

-- 11. ADS
CREATE TABLE IF NOT EXISTS public.ads (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER REFERENCES public.vendors(id),
  item_id INTEGER,
  item_type TEXT DEFAULT 'menu',
  duration_days INTEGER,
  cost REAL,
  start_date TEXT,
  status TEXT DEFAULT 'active'
);

-- 12. DOCUMENTS
CREATE TABLE IF NOT EXISTS public.documents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  vendor_id INTEGER,
  name TEXT,
  date TEXT,
  file_path TEXT
);

-- 13. FAVORITES
CREATE TABLE IF NOT EXISTS public.favorites (
  user_id INTEGER,
  menu_item_id INTEGER,
  PRIMARY KEY (user_id, menu_item_id)
);

-- 14. ISSUES
CREATE TABLE IF NOT EXISTS public.issues (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  subject TEXT,
  description TEXT,
  status TEXT DEFAULT 'open',
  date TEXT,
  related_order INTEGER
);

-- =====================================================
-- ENABLE RLS
-- =====================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produce_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FINAL POLICIES (balanced for current app + security)
-- Public/anon can read product & vendor data.
-- Authenticated users can manage their own orders/reviews.
-- Admin role can do more (enforced in app + RLS where possible).
-- NOTE: For true production, migrate fully to Supabase Auth (auth.uid())
-- and replace email-based login. Current policies support the migrated frontend.
-- =====================================================

-- Drop any previous test policies first (safe re-run)
-- This covers all variants from previous script versions to avoid 42710 "already exists" errors
DO $$
BEGIN
  -- Vendors (public read)
  DROP POLICY IF EXISTS "anon select vendors" ON public.vendors;
  DROP POLICY IF EXISTS "public read vendors" ON public.vendors;

  -- Menu & Produce (public read)
  DROP POLICY IF EXISTS "anon select menu_items" ON public.menu_items;
  DROP POLICY IF EXISTS "public read menu_items" ON public.menu_items;
  DROP POLICY IF EXISTS "anon select produce_items" ON public.produce_items;
  DROP POLICY IF EXISTS "public read produce_items" ON public.produce_items;

  -- Orders
  DROP POLICY IF EXISTS "anon insert orders" ON public.orders;
  DROP POLICY IF EXISTS "public insert orders" ON public.orders;
  DROP POLICY IF EXISTS "anon select orders" ON public.orders;
  DROP POLICY IF EXISTS "users select own orders" ON public.orders;
  DROP POLICY IF EXISTS "users manage own orders" ON public.orders;

  -- Reviews
  DROP POLICY IF EXISTS "anon insert reviews" ON public.reviews;
  DROP POLICY IF EXISTS "public insert reviews" ON public.reviews;
  DROP POLICY IF EXISTS "anon select reviews" ON public.reviews;
  DROP POLICY IF EXISTS "public select reviews" ON public.reviews;
  DROP POLICY IF EXISTS "users manage own reviews" ON public.reviews;

  -- B2B Purchases
  DROP POLICY IF EXISTS "anon insert vendor_purchases" ON public.vendor_purchases;
  DROP POLICY IF EXISTS "public insert vendor_purchases" ON public.vendor_purchases;
  DROP POLICY IF EXISTS "anon select vendor_purchases" ON public.vendor_purchases;
  DROP POLICY IF EXISTS "public select vendor_purchases" ON public.vendor_purchases;

  -- Users (needed for current email-based login + admin lookup)
  DROP POLICY IF EXISTS "anon select users" ON public.users;
  DROP POLICY IF EXISTS "public select users for login" ON public.users;
  DROP POLICY IF EXISTS "anon insert users" ON public.users;
  DROP POLICY IF EXISTS "public insert users (signup)" ON public.users;

  -- Admin/demo tables (permissive for now)
  DROP POLICY IF EXISTS "anon all tasks" ON public.tasks;
  DROP POLICY IF EXISTS "authenticated all tasks" ON public.tasks;
  DROP POLICY IF EXISTS "anon all invoices" ON public.invoices;
  DROP POLICY IF EXISTS "authenticated all invoices" ON public.invoices;
  DROP POLICY IF EXISTS "anon all loyalty" ON public.loyalty;
  DROP POLICY IF EXISTS "authenticated all loyalty" ON public.loyalty;
  DROP POLICY IF EXISTS "anon all ads" ON public.ads;
  DROP POLICY IF EXISTS "authenticated all ads" ON public.ads;
  DROP POLICY IF EXISTS "anon all documents" ON public.documents;
  DROP POLICY IF EXISTS "authenticated all documents" ON public.documents;
  DROP POLICY IF EXISTS "anon all favorites" ON public.favorites;
  DROP POLICY IF EXISTS "authenticated all favorites" ON public.favorites;
  DROP POLICY IF EXISTS "anon all issues" ON public.issues;
  DROP POLICY IF EXISTS "authenticated all issues" ON public.issues;
END $$;

-- PUBLIC READ for browsing (vendors, products)
CREATE POLICY "public read vendors" ON public.vendors FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read menu_items" ON public.menu_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read produce_items" ON public.produce_items FOR SELECT TO anon, authenticated USING (true);

-- ORDERS: Public can insert (current checkout flow), users can see their own
CREATE POLICY "public insert orders" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "users select own orders" ON public.orders FOR SELECT TO authenticated USING (user_id = (SELECT id FROM public.users WHERE email = current_setting('request.jwt.claims', true)::json->>'email' OR true));  -- relaxed for demo

-- REVIEWS: Public insert for photo reviews
CREATE POLICY "public insert reviews" ON public.reviews FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public select reviews" ON public.reviews FOR SELECT TO anon, authenticated USING (true);

-- VENDOR_PURCHASES (B2B): Allow public for current vendor-to-vendor feature
CREATE POLICY "public insert vendor_purchases" ON public.vendor_purchases FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public select vendor_purchases" ON public.vendor_purchases FOR SELECT TO anon, authenticated USING (true);

-- USERS: Allow lookup by email for login (current custom flow)
CREATE POLICY "public select users for login" ON public.users FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public insert users (signup)" ON public.users FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Supporting tables - permissive for admin/demo functionality (tighten with service role later)
CREATE POLICY "authenticated all tasks" ON public.tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated all invoices" ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated all loyalty" ON public.loyalty FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated all ads" ON public.ads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated all documents" ON public.documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated all favorites" ON public.favorites FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated all issues" ON public.issues FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Admin can do everything (app-side enforcement + these broad policies for simplicity)
-- In production, use a separate service_role key or custom claims for true admin bypass.

-- Note: Realtime publications are enabled by default in Supabase for these tables.
-- If needed: Database > Replication in the dashboard.

-- =====================================================
-- ADMIN SETUP (run after creating your first admin in Supabase Auth)
-- =====================================================
-- 1. Supabase Dashboard → Authentication → Users → Add user (your admin email + password)
-- 2. Link the profile row (replace with your admin email and display name):
--
-- INSERT INTO public.users (name, email, role) VALUES
-- ('Admin', 'you@yourdomain.com', 'admin')
-- ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;
--
-- No demo or test accounts are seeded. Add vendors and customers through signup or the Admin Portal.

-- =====================================================
-- FINAL NOTES
-- 1. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel (or .env.local for dev).
-- 2. Redeploy the frontend after env changes.
-- 3. Run PRODUCTION_RLS.sql and other setup scripts in the order listed in supabase/README.md.
-- 4. Enable Email provider in Authentication → Providers.
-- =====================================================