# /admin access fix

## Why /admin "redirects"

This app is a **SPA** (Vite + React Router). The route `/admin` only exists in JavaScript.

If the host does **not** rewrite unknown paths to `index.html`, the browser never loads React for `/admin` — the host returns 404/home. That feels like a redirect.

### Keep the SPA rewrite

| Host | File / setting |
|------|----------------|
| Netlify / some static hosts | `public/_redirects` → `/* /index.html 200` |
| Vercel | `vercel.json` rewrites |
| Render Static Site | `render.yaml` rewrite `/* → /index.html` |
| Render Web Service | serve `dist` with fallback to `index.html` |

**Do not remove** the rewrite if you want deep links (`/admin`, `/profile`, …) to work on refresh or direct open.

## Why Access Denied with super_admin in DB

The browser must **read** `user_roles` (or call `is_admin` / `get_my_roles`). If RLS/grants block that, the app sees zero roles.

### Fast fix (no SQL)

On Render → Environment:

```
VITE_ADMIN_USER_IDS=<your-auth-uuid>
```

Copy UUID from Supabase → Authentication → Users. Redeploy.

### Proper fix (SQL)

Run `supabase/19_admin_bootstrap_and_cloudinary_notes.sql` in Supabase SQL Editor after pasting your UUID. Also run `16_fix_permissions.sql` if tables 403.


## Symptom: typing /admin removes "admin" from the URL

That is **not** React Router hiding the page. The host never served `index.html` for `/admin`, so the browser left the SPA (or got redirected to `/`).

Fix: **Rewrite** `/*` → `/index.html` with status **200** (not a 301 Redirect).

Also: many admin sub-pages used to call `navigate('/')` when `isAdmin === false`, which made the URL jump home even when the SPA loaded. Those silent bounces are removed; `/admin` itself uses `AdminRoute` + `AdminDashboardV2` and should stay on `/admin` (login or Access Denied).
