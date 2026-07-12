# BazarBD — Marketplace

A free classifieds marketplace for buying and selling anything in Bangladesh — electronics, vehicles, property, jobs, fashion and more. Built with React, TypeScript, Tailwind CSS, shadcn/ui and Supabase.

The native Android app built on top of this project lives in a companion repo: **[marketplaceapp](https://github.com/roni2026/marketplaceapp)** (Capacitor wrapper + native Android project).

## ✨ Features

- Browse, search and filter ads by category, subcategory, division/district, price range and condition
- Sort listings by newest or price
- Post ads with drag-and-drop multi-image upload, reordering and a live URL/slug preview
- Favorites, "My Ads" management (edit/mark sold/delete), and a full admin panel (moderation, categories, users, reports)
- Ad detail pages with a swipeable/lightbox image gallery, native share, WhatsApp & call contact buttons, similar-ads recommendations and view counts
- "Recently viewed" ads tracked client-side (no extra backend calls)
- Light/dark theme, installable PWA with an in-app "Add to Home Screen" prompt
- Mobile bottom tab navigation for an app-like feel on phones (and inside the Android WebView shell)
- Row Level Security-backed Supabase schema (see [`supabase/`](./supabase/README.md) — ordered, idempotent migrations `01…16`)

## 🧱 Tech Stack

React 18 · TypeScript · Vite · Tailwind CSS · shadcn/ui (Radix primitives) · TanStack Query · React Router · Supabase (Postgres, Auth, Storage) · Recharts

## 🚀 Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase

Create a project at [supabase.com](https://supabase.com), then:

1. Run the numbered SQL files in [`supabase/`](./supabase/README.md) **in order (`01_schema.sql` → `16_fix_permissions.sql`)** in the SQL editor to create tables, enums, RLS policies and a starter category list. The files are idempotent, so re-running them is safe.
2. Create two **public** storage buckets: `ad-images` and `avatars`.
3. Copy your project URL and anon/publishable key into a `.env` file:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-public-key
```

### 3. Run the dev server

```bash
npm run dev
```

The app is served at `http://localhost:8080`.

### 4. Build for production

```bash
npm run build
npm run preview
```

## 👤 Making yourself an admin

After signing up, grant your account the `admin` role so you can access `/admin`:

```sql
insert into public.user_roles (user_id, role)
values ('<your-auth-user-id>', 'admin');
```

## 📱 Android app

This web app is also shipped as a native Android app via [Capacitor](https://capacitorjs.com/) in the [`marketplaceapp`](https://github.com/roni2026/marketplaceapp) repository, which bundles this same UI in a native WebView shell with access to native APIs (share sheet, status bar, splash screen, back-button handling, etc). See that repo's README for build instructions.

## 📂 Project Structure

```
src/
  components/    Reusable UI (shadcn/ui primitives, ads, home, layout, theme, pwa)
  hooks/         useAuth, useRecentlyViewed, use-toast, use-mobile
  integrations/  Supabase client + generated types
  lib/           Constants (divisions/districts, price formatting) and utils
  pages/         Route-level pages, including pages/admin/*
supabase/
  01..16_*.sql   Ordered, idempotent DB migrations (schema, RLS, seed data)
  README.md      Run order and notes for the migrations
```

## 📄 License

See [LICENSE](./LICENSE).
