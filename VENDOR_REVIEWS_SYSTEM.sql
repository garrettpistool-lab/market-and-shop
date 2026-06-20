-- =====================================================
-- Market and Shop — Vendor Rating & Review Workflow
-- Run in Supabase SQL Editor after FINAL_SUPABASE_SETUP.sql
-- Safe to re-run (idempotent column adds).
-- =====================================================

-- Extend reviews for vendor ratings, grace period, and edit window
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS vendor_id INTEGER REFERENCES public.vendors(id);
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS reviewer_email TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published';
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS editable_until TIMESTAMPTZ;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS grace_deadline TIMESTAMPTZ;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS vendor_notified BOOLEAN DEFAULT false;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS vendor_response TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS resolution_note TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT false;

-- Cached vendor rating (updated by app; optional denormalization)
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS avg_rating REAL DEFAULT 0;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- Backfill vendor_id on existing item reviews where possible
UPDATE public.reviews r
SET vendor_id = m.vendor_id
FROM public.menu_items m
WHERE r.item_id = m.id AND r.item_type = 'menu' AND r.vendor_id IS NULL;

UPDATE public.reviews r
SET vendor_id = p.vendor_id
FROM public.produce_items p
WHERE r.item_id = p.id AND r.item_type = 'produce' AND r.vendor_id IS NULL;

-- RLS: allow authenticated + anon read public reviews; insert/update own reviews
DO $$
BEGIN
  DROP POLICY IF EXISTS "public select published reviews" ON public.reviews;
  DROP POLICY IF EXISTS "users insert reviews" ON public.reviews;
  DROP POLICY IF EXISTS "users update own reviews" ON public.reviews;
  DROP POLICY IF EXISTS "vendors update resolution" ON public.reviews;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Permissive read for hybrid anon-key app (vendor portal needs pending reviews too)
CREATE POLICY "public select published reviews" ON public.reviews
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "users insert reviews" ON public.reviews
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "users update own reviews" ON public.reviews
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "vendors update resolution" ON public.reviews
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);