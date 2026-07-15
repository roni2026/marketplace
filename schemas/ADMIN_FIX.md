# /admin Not Working — Diagnosis & Fix

## Root Cause Analysis

After reviewing the entire codebase, the `/admin` route has **three layers** that must all work. If any one fails, you see a blank page or "nothing comes up."

### Layer 1: SPA Hosting Rewrite (most common cause)

The app is a **Vite + React Router SPA**. The route `/admin` only exists in JavaScript — there is no physical `/admin` file on the server. When you type `/admin` in the browser, the hosting platform must serve `index.html` (with HTTP 200, not a 301 redirect) so React Router can take over.

**The repo already has all the config files:**
- `vercel.json` → rewrites `/* → /index.html`
- `netlify.toml` → redirects `/* → /index.html` status 200
- `public/_redirects` → `/* /index.html 200`
- `render.yaml` → rewrite `/* → /index.html`

**But the issue is hosting-specific:**

| Host | Fix |
|------|-----|
| **Render Static Site** | Make sure `render.yaml` is being used. In Render dashboard → Settings → check "Static Site" with `dist` as publish path. The `routes` section with the rewrite MUST be present. |
| **Render Web Service** | `render.yaml` uses `runtime: static` which is correct. If you switched to a Web Service, you need a custom server with SPA fallback (e.g., `serve dist --single`). |
| **Vercel** | `vercel.json` should work automatically. |
| **Netlify** | `public/_redirects` + `netlify.toml` should work. |
| **Other hosts** | You need a catch-all rewrite to `/index.html` with 200 status. |

**How to test if this is the problem:**
1. Open browser DevTools → Network tab
2. Navigate to `/admin`
3. Look at the first request — if it returns 404 or redirects to `/`, the SPA rewrite is missing
4. If it returns 200 with HTML content, the rewrite is working — move to Layer 2

### Layer 2: Supabase RLS / Role Check

Even if the SPA loads, `/admin` will show **"Access Denied"** or a **blank loader** if the app can't verify you're an admin.

The flow is:
1. `AdminRoute` component checks `useAuth().isAdmin`
2. `useAuth` calls `fetchUserRoles(userId)` → tries `get_my_roles()` RPC, then direct table select
3. If roles are empty, falls back to `checkIsAdmin(userId)` → tries `am_i_admin()` RPC, then `is_admin()` RPC, then table select
4. If all fail, shows Access Denied

**Common failures:**
- `user_roles` table has no RLS policy allowing users to read their own rows → the SELECT returns empty
- `get_my_roles()` or `am_i_admin()` functions don't exist or aren't granted EXECUTE
- The user has no `super_admin` / `admin` row in `user_roles`

**The fix is in `schemas/17_admin_access.sql`** — run it in Supabase SQL Editor with your UUID.

### Layer 3: Environment Variables (emergency fallback)

If Supabase RLS is completely broken, you can bypass it with an env var:

```
VITE_ADMIN_USER_IDS=your-auth-user-uuid
```

Set this on Render (or your host) → Environment → Redeploy. The app checks this allowlist before even querying the database.

---

## Step-by-Step Fix

### Step 1: Verify the SPA rewrite is working

On your deployed site, open DevTools → Network → go to `/admin`:
- If you see a 404 or redirect → **fix your hosting rewrite** (see table above)
- If you see 200 with HTML → continue to Step 2

### Step 2: Run the admin access SQL

1. Go to **Supabase Dashboard → SQL Editor**
2. Open `schemas/17_admin_access.sql`
3. Replace `YOUR-USER-UID-HERE` with your actual UUID (from Authentication → Users)
4. Run the query
5. You should see: `NOTICE: Granted super_admin + admin to <your-uuid>`

### Step 3: Run the permissions SQL

1. In Supabase SQL Editor, open `schemas/16_permissions.sql`
2. Run it — this grants table access to `anon` and `authenticated` roles
3. You should see a table showing `anon_can_select` and `auth_can_select` as `true`

### Step 4: Verify in the browser

1. Clear your browser cache / local storage
2. Go to `/admin`
3. You should see the admin login form
4. Sign in with your admin credentials
5. You should see the admin dashboard

### Step 5: Emergency fallback (if Steps 2-3 don't work)

Set this environment variable on your hosting platform:

```
VITE_ADMIN_USER_IDS=your-auth-user-uuid
```

Redeploy. This bypasses all database role checks.

---

## What Was Fixed in This Repo

The latest commit (`ae5bd7a`) already includes:
1. ✅ SPA rewrite configs for all hosts (vercel.json, netlify.toml, render.yaml, _redirects)
2. ✅ `AdminRoute` component that shows a login form instead of redirecting
3. ✅ `AccessDenied` panel that stays on `/admin` (no silent redirect)
4. ✅ Emergency allowlist via `VITE_ADMIN_USER_IDS`
5. ✅ Security-definer functions (`is_admin`, `get_my_roles`, `am_i_admin`)
6. ✅ RLS policy allowing users to read their own `user_roles` rows

The new `schemas/` folder consolidates all 19 old SQL files into 17 clean files with a proper README.
