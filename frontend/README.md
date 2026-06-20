# Market and Shop Full-Stack Frontend (React + Vite)

**Note:** The backend now includes a proper SQL backup system. See the root `README.md` for backup/restore instructions.

**Major Progress - All Suggested Features Added:**

## Connected to Real Backend (with live data + forms)

- **Marketplace**: Full cart system (add/remove), real "Place Order" that creates orders in DB.
- **Tasks**: Interactive status updates that persist via PATCH.
- **Invoices**: Real list + beautiful details modal with status change forms.
- **Documents**: Upload form + list connected to backend.
- **Support**: Submit issues form + resolve buttons (full CRUD).
- **Orders / Favorites**: Real user-specific data from backend.
- **Dashboard**: Real counts + visual bar charts (no extra deps).
- **Users Management**: Admin can approve users and change roles (real PATCH).
- **Vendor Product Page**: Beautiful tabbed storefront (Menu / About / Reviews) with real data.
- **Vendor Dashboard**: Personalized with real menu/tasks data.

## Full Cart System
- Global cart via React Context (persisted in localStorage).
- Works across Marketplace and can be extended.

## Other Pages
All listed pages from the Softr spec now have good structure:
- Home, Top Vendors, Customer Portal, Vendor Sign Up, Customer Sign Up, Onboarding Flow, FAQ, Customer Use Agreement, Account Settings, Storefront Settings, etc.
- All utility pages (Login, Forgot Password, 404, 403, etc.).

## How to Run
1. `cd backend && npm install && npm start`
2. `cd frontend && npm install && npm run dev`

The app is now a very complete, usable full-stack vendor/customer portal with real data flows.

Next possible steps (if wanted): Add real-time updates, payments simulation, better charts with Chart.js, image uploads, etc.