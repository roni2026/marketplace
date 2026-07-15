# Rebuild all Supabase tables (drop + recreate)

This **deletes all data** in the `public` schema, then re-runs SQL files `01` → `19`.

## 1) Get a database connection string

Supabase Dashboard → **Project Settings** → **Database** → **Connection string** → **URI**

Example:

```
postgresql://postgres.[PROJECT_REF]:[YOUR-DB-PASSWORD]@aws-0-....pooler.supabase.com:6543/postgres
```

Or direct:

```
postgresql://postgres:[YOUR-DB-PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

## 2) Get your Auth user UUID

**Authentication → Users → copy UUID** (this becomes super_admin).

## 3) Run (locally or in agent sandbox)

```bash
export SUPABASE_DB_URL='postgresql://...'
export ADMIN_USER_UUID='your-auth-uuid'
export CONFIRM_DROP=YES_DROP_ALL
python3 scripts/rebuild_supabase_schema.py
```

Dry run (no changes):

```bash
DRY_RUN=1 python3 scripts/rebuild_supabase_schema.py
```

## 4) Frontend env (Render)

```
VITE_SUPABASE_URL=https://YOUR_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_ADMIN_USER_IDS=your-auth-uuid
```

Redeploy after setting env (Vite bakes env at build).

## 5) SPA rewrite (required for /admin)

Render Static Site → Redirects/Rewrites:

| Source | Destination | Type |
|--------|-------------|------|
| `/*` | `/index.html` | **Rewrite** (200) |

Without this, `/admin` never loads React and the path disappears.

## Safety

- Never put **service role** or **DB password** in `VITE_*` variables.
- Never paste secrets into GitHub issues/chat; use env / secret manager only.
