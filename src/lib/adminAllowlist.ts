/**
 * Emergency admin allowlist — works even when user_roles RLS/RPCs fail.
 *
 * Set on Render (comma-separated auth user UUIDs):
 *   VITE_ADMIN_USER_IDS=uuid1,uuid2
 *
 * Optional emails:
 *   VITE_ADMIN_EMAILS=you@example.com
 */
function parseList(raw: string | undefined): string[] {
  return String(raw || '')
    .split(/[\s,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

const ID_LIST = parseList(import.meta.env.VITE_ADMIN_USER_IDS as string | undefined);
const EMAIL_LIST = parseList(import.meta.env.VITE_ADMIN_EMAILS as string | undefined);

export function isAllowlistedAdmin(user?: { id?: string | null; email?: string | null } | null): boolean {
  if (!user) return false;
  const id = String(user.id || '').trim().toLowerCase();
  const email = String(user.email || '').trim().toLowerCase();
  if (id && ID_LIST.includes(id)) return true;
  if (email && EMAIL_LIST.includes(email)) return true;
  return false;
}

export function allowlistConfigured(): boolean {
  return ID_LIST.length > 0 || EMAIL_LIST.length > 0;
}
