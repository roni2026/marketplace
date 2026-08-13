# BazarBD — Marketplace

A free classifieds marketplace for buying and selling anything in Bangladesh — electronics, vehicles, property, jobs, fashion and more. Built with React, TypeScript, Tailwind CSS, shadcn/ui and Supabase.

The native Android app built on top of this same codebase lives in a companion repo: [`marketplaceapp`](https://github.com/roni2026/marketplaceapp).

## Features

- Browse, search and filter ads by category, subcategory, division/district, price range and condition
- Sort listings by newest or price
- Post ads with drag-and-drop multi-image upload, reordering and a live URL/slug preview
- Favorites and a "My Ads" panel for editing, marking sold, or deleting your own listings
- Full admin panel for moderation, category management, users and reports
- Ad detail pages with a swipeable image gallery, native share, WhatsApp & call contact buttons, similar-ads recommendations, and view counts
- Locally tracked "recently viewed" ads — no extra backend calls needed
- Light/dark theme and an installable PWA with an in-app "Add to Home Screen" prompt
- Mobile bottom tab navigation so it feels like an app on phones (and inside the Android WebView shell)
- Row Level Security-backed Supabase schema — see the numbered migrations under `supabase/`

## Tech stack

React 18 · TypeScript · Vite · Tailwind CSS · shadcn/ui (Radix primitives) · TanStack Query · React Router · Supabase (Postgres, Auth, Storage) · Recharts

## Getting started

**1. Install dependencies**

```bash
npm install
```

**2. Set up Supabase**

Create a project at [supabase.com](https://supabase.com), then:

- Run the numbered SQL files under `supabase/` in order (`01_schema.sql` → `16_fix_permissions.sql`) in the SQL editor — they set up tables, enums, RLS policies and a starter category list, and are safe to re-run since they're idempotent.
- Create two public storage buckets: `ad-images` and `avatars`.
- Copy `.env.example` to `.env` and fill in your project URL and anon key:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-public-key
```

**3. Run it**

```bash
npm run dev
```

The app serves at `http://localhost:8080`.

**4. Build for production**

```bash
npm run build
npm run preview
```
