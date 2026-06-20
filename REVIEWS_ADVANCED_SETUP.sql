-- =====================================================
-- Market and Shop — Advanced Reviews (run after VENDOR_REVIEWS_SYSTEM.sql)
-- Adds: notifications, order-gate helpers, pg_cron deadlines,
--       tightened RLS, review photo storage, low-rating trigger
-- =====================================================

-- -----------------------------------------------------------------
-- 1. Vendor notifications (in-app + email trigger source)
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_notifications (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  review_id INTEGER REFERENCES public.reviews(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'low_rating',
  title TEXT NOT NULL,
  body TEXT,
  read BOOLEAN DEFAULT false,
  email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_notifications_vendor ON public.vendor_notifications(vendor_id, read);

ALTER TABLE public.vendor_notifications ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------
-- 2. Auth helper functions (JWT email → profile)
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(trim(coalesce(
    auth.jwt() ->> 'email',
    (current_setting('request.jwt.claims', true)::json ->> 'email')
  )));
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(role) FROM public.users
  WHERE lower(email) = public.current_user_email()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_vendor_id()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT vendor_id FROM public.users
  WHERE lower(email) = public.current_user_email()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() = 'admin';
$$;

-- Order-gated reviews: customer must have an order with this vendor
CREATE OR REPLACE FUNCTION public.can_review_vendor(p_vendor_id INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.users u ON u.id = o.user_id
      WHERE o.vendor_id = p_vendor_id
        AND lower(u.email) = public.current_user_email()
        AND lower(coalesce(o.status, 'placed')) IN (
          'placed', 'preparing', 'delivered', 'completed', 'fulfilled'
        )
    );
$$;

-- -----------------------------------------------------------------
-- 3. Server-side deadline processor (pg_cron target)
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_review_deadlines()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  published_count INTEGER := 0;
  locked_count INTEGER := 0;
  v RECORD;
BEGIN
  -- Auto-publish overdue low ratings
  FOR v IN
    SELECT id, vendor_id FROM public.reviews
    WHERE status = 'pending_resolution'
      AND grace_deadline IS NOT NULL
      AND grace_deadline < NOW()
  LOOP
    UPDATE public.reviews
    SET status = 'published', is_public = true, locked = false
    WHERE id = v.id;
    published_count := published_count + 1;

    INSERT INTO public.vendor_notifications (vendor_id, review_id, type, title, body)
    VALUES (
      v.vendor_id, v.id, 'review_published',
      'Review now public',
      'A low rating grace period ended and the review was published on your profile.'
    );
  END LOOP;

  -- Lock reviews past edit window
  UPDATE public.reviews SET locked = true
  WHERE locked = false
    AND editable_until IS NOT NULL
    AND editable_until < NOW();
  GET DIAGNOSTICS locked_count = ROW_COUNT;

  -- Refresh vendor rating cache for all vendors with public reviews
  FOR v IN SELECT DISTINCT vendor_id AS id FROM public.reviews WHERE vendor_id IS NOT NULL AND is_public = true
  LOOP
    PERFORM public.refresh_vendor_rating(v.id);
  END LOOP;

  RETURN published_count + locked_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_vendor_rating(p_vendor_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  avg_r REAL;
  cnt INTEGER;
BEGIN
  SELECT coalesce(avg(rating::real), 0), count(*)
  INTO avg_r, cnt
  FROM public.reviews
  WHERE vendor_id = p_vendor_id AND is_public = true;

  UPDATE public.vendors
  SET avg_rating = round(avg_r::numeric, 1), review_count = cnt
  WHERE id = p_vendor_id;
END;
$$;

-- RPC wrapper for frontend fallback calls
CREATE OR REPLACE FUNCTION public.process_review_deadlines_rpc()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$ SELECT public.process_review_deadlines(); $$;

GRANT EXECUTE ON FUNCTION public.process_review_deadlines_rpc() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_review_vendor(INTEGER) TO authenticated;

-- pg_cron: hourly deadline processing (enable pg_cron in Dashboard → Integrations first)
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'marketandshop-process-review-deadlines';

    PERFORM cron.schedule(
      'marketandshop-process-review-deadlines',
      '15 * * * *',
      'SELECT public.process_review_deadlines();'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available — enable it in Supabase Dashboard or run process_review_deadlines() manually.';
END;
$cron$;

-- -----------------------------------------------------------------
-- 4. Low-rating trigger → in-app notification (+ optional email via Edge Function)
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.on_review_low_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_name TEXT;
BEGIN
  IF NEW.rating <= 3 AND NEW.status = 'pending_resolution' AND NEW.vendor_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND coalesce(OLD.rating, 5) > 3)) THEN
    SELECT email, name INTO v_email, v_name FROM public.vendors WHERE id = NEW.vendor_id;

    INSERT INTO public.vendor_notifications (vendor_id, review_id, type, title, body)
    VALUES (
      NEW.vendor_id,
      NEW.id,
      'low_rating',
      format('Low rating: %s stars', NEW.rating),
      format(
        'A customer left a %s-star review. You have 3 days to respond before it may appear publicly. Comment: %s',
        NEW.rating,
        left(coalesce(NEW.comment, ''), 200)
      )
    );

    -- Optional: call Edge Function via pg_net (set secrets in Vault: edge_notify_url, edge_notify_secret)
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
        PERFORM net.http_post(
          url := coalesce(
            (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'edge_notify_url' LIMIT 1),
            current_setting('app.edge_notify_url', true)
          ),
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || coalesce(
              (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'edge_notify_secret' LIMIT 1),
              current_setting('app.edge_notify_secret', true)
            )
          ),
          body := jsonb_build_object(
            'review_id', NEW.id,
            'vendor_id', NEW.vendor_id,
            'vendor_email', v_email,
            'vendor_name', v_name,
            'rating', NEW.rating,
            'comment', NEW.comment,
            'grace_deadline', NEW.grace_deadline
          )
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL; -- email is best-effort; in-app notification always created
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_review_low_rating ON public.reviews;
CREATE TRIGGER trg_review_low_rating
  AFTER INSERT OR UPDATE OF rating, status ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.on_review_low_rating();

-- -----------------------------------------------------------------
-- 5. Tightened RLS — reviews
-- -----------------------------------------------------------------
DO $$
BEGIN
  DROP POLICY IF EXISTS "public select published reviews" ON public.reviews;
  DROP POLICY IF EXISTS "users insert reviews" ON public.reviews;
  DROP POLICY IF EXISTS "users update own reviews" ON public.reviews;
  DROP POLICY IF EXISTS "vendors update resolution" ON public.reviews;
  DROP POLICY IF EXISTS "reviews_select_tight" ON public.reviews;
  DROP POLICY IF EXISTS "reviews_insert_tight" ON public.reviews;
  DROP POLICY IF EXISTS "reviews_update_own" ON public.reviews;
  DROP POLICY IF EXISTS "reviews_vendor_resolve" ON public.reviews;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "reviews_select_tight" ON public.reviews
  FOR SELECT TO authenticated
  USING (
    is_public = true
    OR lower(reviewer_email) = public.current_user_email()
    OR (
      vendor_id = public.current_user_vendor_id()
      AND status IN ('pending_resolution', 'resolved')
    )
    OR public.is_admin()
  );

-- Anon: public reviews only (browsing storefronts)
CREATE POLICY "reviews_select_anon" ON public.reviews
  FOR SELECT TO anon
  USING (is_public = true);

CREATE POLICY "reviews_insert_tight" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_review_vendor(vendor_id)
    AND lower(reviewer_email) = public.current_user_email()
  );

CREATE POLICY "reviews_update_own" ON public.reviews
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR (
      lower(reviewer_email) = public.current_user_email()
      AND coalesce(locked, false) = false
    )
  )
  WITH CHECK (
    public.is_admin()
    OR lower(reviewer_email) = public.current_user_email()
  );

CREATE POLICY "reviews_vendor_resolve" ON public.reviews
  FOR UPDATE TO authenticated
  USING (vendor_id = public.current_user_vendor_id())
  WITH CHECK (vendor_id = public.current_user_vendor_id());

-- Notifications RLS
DO $$
BEGIN
  DROP POLICY IF EXISTS "vendor_notifications_select" ON public.vendor_notifications;
  DROP POLICY IF EXISTS "vendor_notifications_update" ON public.vendor_notifications;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "vendor_notifications_select" ON public.vendor_notifications
  FOR SELECT TO authenticated
  USING (vendor_id = public.current_user_vendor_id() OR public.is_admin());

CREATE POLICY "vendor_notifications_update" ON public.vendor_notifications
  FOR UPDATE TO authenticated
  USING (vendor_id = public.current_user_vendor_id())
  WITH CHECK (vendor_id = public.current_user_vendor_id());

-- -----------------------------------------------------------------
-- 6. Supabase Storage — review photos bucket
-- -----------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'review-photos',
  'review-photos',
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
  DROP POLICY IF EXISTS "review_photos_public_read" ON storage.objects;
  DROP POLICY IF EXISTS "review_photos_auth_upload" ON storage.objects;
  DROP POLICY IF EXISTS "review_photos_auth_update_own" ON storage.objects;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "review_photos_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'review-photos');

CREATE POLICY "review_photos_auth_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'review-photos'
    AND (storage.foldername(name))[1] = public.current_user_email()
  );

CREATE POLICY "review_photos_auth_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'review-photos'
    AND (storage.foldername(name))[1] = public.current_user_email()
  );

-- -----------------------------------------------------------------
-- Done. Next steps:
-- 1. Deploy supabase/functions/notify-low-rating (see supabase/README.md)
-- 2. Set Edge Function secrets: RESEND_API_KEY, NOTIFY_FROM_EMAIL
-- 3. Optional Vault secrets: edge_notify_url, edge_notify_secret
-- 4. Enable pg_cron extension in Supabase Dashboard
-- =====================================================