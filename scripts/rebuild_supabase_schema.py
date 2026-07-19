#!/usr/bin/env python3
"""
Drop and recreate all BazarBD public schema objects from supabase/01..19 SQL files.

NEVER paste keys in chat. Use env vars:

  SUPABASE_DB_URL   — preferred
    postgres://postgres.[ref]:[PASSWORD]@aws-0-...pooler.supabase.com:6543/postgres
    (Supabase → Project Settings → Database → Connection string URI, use pooler or direct)

  OR:
  SUPABASE_DB_PASSWORD + SUPABASE_PROJECT_REF  (builds a direct URL)
  SUPABASE_DB_HOST (optional override)

  ADMIN_USER_UUID   — auth user UUID to grant super_admin after rebuild
  DRY_RUN=1         — print plan only

Usage:
  python3 scripts/rebuild_supabase_schema.py
"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path

try:
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
except ImportError:
    print("Installing psycopg2-binary…")
    os.system(f"{sys.executable} -m pip install -q psycopg2-binary")
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

ROOT = Path(__file__).resolve().parents[1]
SQL_DIR = ROOT / "supabase"

ORDER = [
    "01_schema.sql",
    "02_schema_v2_social.sql",
    "02_schema_v2_profiles.sql",  # if present; some repos use 03 for profiles
    "03_schema_v2_profiles.sql",
    "03_schema_v2_social.sql",
    "04_schema_v2_trust.sql",
    "05_schema_v2_listings.sql",
    "06_schema_v2_cms.sql",
    "07_schema_v2_system.sql",
    "08_schema_v3_shops.sql",
    "09_schema_v4_listing_management.sql",
    "10_schema_v5_search_discovery.sql",
    "11_schema_v6_marketplace_experience.sql",
    "12_schema_v8_messaging.sql",
    "13_schema_v13_notifications.sql",
    "14_schema_v14_admin_portal.sql",
    "16_fix_permissions.sql",
    "17_schema_v15_catalog_rbac_customer.sql",
    "18_fix_super_admin_access.sql",
    "19_admin_bootstrap_and_cloudinary_notes.sql",
    "19_schema_v19_enterprise_moderation.sql",
    "20_fix_review_moderation_rls.sql",
    "21_phase20_admin_permissions_ad_search.sql",
    "22_ad_promotion_system.sql",
]


def db_url() -> str:
    url = os.environ.get("SUPABASE_DB_URL") or os.environ.get("DATABASE_URL")
    if url:
        return url
    password = os.environ.get("SUPABASE_DB_PASSWORD") or os.environ.get("POSTGRES_PASSWORD")
    ref = os.environ.get("SUPABASE_PROJECT_REF") or os.environ.get("SUPABASE_REF")
    host = os.environ.get("SUPABASE_DB_HOST")
    if password and ref:
        # Direct connection host pattern
        host = host or f"db.{ref}.supabase.co"
        return f"postgresql://postgres:{password}@{host}:5432/postgres"
    raise SystemExit(
        "Missing DB connection. Set SUPABASE_DB_URL "
        "(Supabase → Settings → Database → Connection string URI) "
        "or SUPABASE_DB_PASSWORD + SUPABASE_PROJECT_REF"
    )


def drop_public_schema(cur) -> None:
    print("→ Dropping public schema objects (CASCADE)…")
    # Keep extensions in other schemas; wipe public tables/views/functions/types carefully
    cur.execute(
        """
        DO $$
        DECLARE r record;
        BEGIN
          -- drop views
          FOR r IN (SELECT viewname FROM pg_views WHERE schemaname = 'public') LOOP
            EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(r.viewname) || ' CASCADE';
          END LOOP;
          -- drop materialized views
          FOR r IN (SELECT matviewname FROM pg_matviews WHERE schemaname = 'public') LOOP
            EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS public.' || quote_ident(r.matviewname) || ' CASCADE';
          END LOOP;
          -- drop tables
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
            EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
          END LOOP;
          -- drop sequences
          FOR r IN (
            SELECT sequence_name FROM information_schema.sequences
            WHERE sequence_schema = 'public'
          ) LOOP
            EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(r.sequence_name) || ' CASCADE';
          END LOOP;
          -- drop functions / procedures
          FOR r IN (
            SELECT p.oid::regprocedure AS sig
            FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public'
          ) LOOP
            EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig || ' CASCADE';
          END LOOP;
          -- drop custom types (enums etc.)
          FOR r IN (
            SELECT t.typname
            FROM pg_type t
            JOIN pg_namespace n ON n.oid = t.typnamespace
            WHERE n.nspname = 'public'
              AND t.typtype IN ('e', 'c')  -- enums + composites
              AND t.typname NOT LIKE 'pg_%'
          ) LOOP
            EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
          END LOOP;
        END $$;
        """
    )
    print("  public schema cleared.")


def run_sql_file(cur, path: Path) -> None:
    sql = path.read_text(encoding="utf-8")
    # Replace placeholder UIDs if ADMIN_USER_UUID set
    uid = os.environ.get("ADMIN_USER_UUID", "").strip()
    if uid and uid != "YOUR-USER-UID-HERE":
        sql = sql.replace("YOUR-USER-UID-HERE", uid)
        sql = sql.replace("YOUR-AUTH-USER-UUID", uid)
        sql = sql.replace("YOUR-REAL-UUID-HERE", uid)
    print(f"→ Running {path.name} ({len(sql)} bytes)…")
    try:
        cur.execute(sql)
        print(f"  OK {path.name}")
    except Exception as e:
        print(f"  ERROR in {path.name}: {e}")
        # Continue for idempotent partial failures? Better fail hard on core schema
        if path.name.startswith("01_") or path.name.startswith("16_"):
            raise
        print("  (continuing after non-fatal error)")


def grant_admin(cur, uid: str) -> None:
    print(f"→ Granting super_admin + admin to {uid}")
    cur.execute(
        """
        INSERT INTO public.user_roles (user_id, role)
        VALUES (%s::uuid, 'super_admin'::public.app_role)
        ON CONFLICT (user_id, role) DO NOTHING;
        INSERT INTO public.user_roles (user_id, role)
        VALUES (%s::uuid, 'admin'::public.app_role)
        ON CONFLICT (user_id, role) DO NOTHING;
        """,
        (uid, uid),
    )
    cur.execute(
        "SELECT role::text FROM public.user_roles WHERE user_id = %s::uuid",
        (uid,),
    )
    roles = [r[0] for r in cur.fetchall()]
    print("  roles now:", roles)


def main() -> int:
    dry = os.environ.get("DRY_RUN", "").strip() in ("1", "true", "yes")
    url = db_url()
    # redact password in log
    safe = re.sub(r":([^:@/]+)@", ":***@", url)
    print("DB:", safe)

    files = []
    seen = set()
    for name in ORDER:
        p = SQL_DIR / name
        if p.exists() and p.name not in seen:
            files.append(p)
            seen.add(p.name)
    # any other numbered files
    for p in sorted(SQL_DIR.glob("[0-9][0-9]_*.sql")):
        if p.name not in seen:
            files.append(p)
            seen.add(p.name)

    print("Will run", len(files), "SQL files:")
    for p in files:
        print(" ", p.name)

    if dry:
        print("DRY_RUN=1 — exiting before changes")
        return 0

    confirm = os.environ.get("CONFIRM_DROP", "")
    if confirm != "YES_DROP_ALL":
        print(
            "Refusing to drop. Set CONFIRM_DROP=YES_DROP_ALL to proceed "
            "(this DELETES all public tables/data)."
        )
        return 2

    conn = psycopg2.connect(url)
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()

    drop_public_schema(cur)

    for p in files:
        run_sql_file(cur, p)

    uid = os.environ.get("ADMIN_USER_UUID", "").strip()
    if uid and uid not in ("YOUR-USER-UID-HERE", ""):
        try:
            grant_admin(cur, uid)
        except Exception as e:
            print("grant_admin failed:", e)

    # verify core tables
    cur.execute(
        """
        SELECT tablename FROM pg_tables
        WHERE schemaname='public'
        ORDER BY tablename
        """
    )
    tables = [r[0] for r in cur.fetchall()]
    print("Tables now:", len(tables))
    for t in tables[:40]:
        print(" ", t)
    if len(tables) > 40:
        print(" …")

    need = ["profiles", "user_roles", "ads", "categories"]
    missing = [t for t in need if t not in tables]
    if missing:
        print("MISSING core tables:", missing)
        return 1

    print("\nDONE. Next:")
    print("1) Render env: VITE_ADMIN_USER_IDS=" + (uid or "<your-uuid>"))
    print("2) SPA rewrite: /* → /index.html (200 Rewrite)")
    print("3) Redeploy frontend")
    print("4) Open /admin hard refresh")
    cur.close()
    conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
