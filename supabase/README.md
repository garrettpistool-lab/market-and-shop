# Market and Shop — Supabase setup

Run these SQL scripts in the **Supabase SQL Editor** in order:

1. `FINAL_SUPABASE_SETUP.sql` — core schema
2. `PRODUCTION_RLS.sql` — row-level security policies
3. `VENDOR_REVIEWS_SYSTEM.sql` — reviews tables and policies
4. `REVIEWS_ADVANCED_SETUP.sql` — photo reviews, alerts
5. `TIER_SYSTEM_SETUP.sql` — vendor/customer plans, employees, storefront fields

## Edge function: `notify-low-rating`

Deploy from the repo root (requires [Supabase CLI](https://supabase.com/docs/guides/cli)):

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy notify-low-rating
```

Set secrets:

```bash
npx supabase secrets set APP_URL=https://your-production-domain.com
npx supabase secrets set NOTIFY_FROM_EMAIL="Market and Shop <noreply@yourdomain.com>"
npx supabase secrets set RESEND_API_KEY=re_your_resend_key
```

For pg_net database triggers, see `EDGE_SECRETS_SETUP.sql`.

## First admin user

1. Supabase Dashboard → **Authentication** → **Users** → **Add user**
2. SQL Editor:

```sql
INSERT INTO public.users (name, email, role)
VALUES ('Admin', 'you@yourdomain.com', 'admin')
ON CONFLICT (email) DO UPDATE SET role = 'admin';
```

## Environment variables (Vercel frontend)

| Variable | Source |
|----------|--------|
| `VITE_SUPABASE_URL` | Supabase → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API (anon / publishable key) |