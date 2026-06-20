# Market and Shop

A full-stack local vendor marketplace: customers browse storefronts, place orders, and leave reviews; vendors manage menus, employees, and storefront branding; admins oversee the platform.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vite 7, React 18, Tailwind CSS, React Router |
| Auth | Supabase Auth (+ optional Auth0) |
| Database | Supabase Postgres with Row Level Security |
| Backend API | Node.js + Express (optional) |
| Edge functions | Supabase (`notify-low-rating`) |
| Monitoring | Sentry (optional) |
| Cache / rate limits | Upstash Redis (optional) |

## Quick start

### Supabase

Create a project at [supabase.com](https://supabase.com), then run the SQL scripts listed in `supabase/README.md`.

### Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:5173

### Backend (optional)

```bash
cd backend
cp .env.example .env.local
npm install
npm start
```

## Deploy to Vercel

1. Import this repo in [Vercel](https://vercel.com) with **Root Directory** = `frontend`.
2. Add env vars from `frontend/.env.example`.
3. Connect Supabase, Auth0, Sentry, and Upstash as needed.

## Roles

- **Admin** — platform management and analytics
- **Vendor** — storefront, products, orders, employees
- **Customer** — browse, order, reviews
- **Guest** — browse marketplace only