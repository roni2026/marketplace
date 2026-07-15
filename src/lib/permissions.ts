import { supabase } from '@/integrations/supabase/client';

export type AppRole =
  | 'super_admin'
  | 'admin'
  | 'moderator'
  | 'customer_support'
  | 'seller'
  | 'buyer';

export type Permission =
  | 'ads.view_all'
  | 'ads.approve'
  | 'ads.reject'
  | 'ads.delete_any'
  | 'ads.feature'
  | 'ads.boost'
  | 'ads.premium'
  | 'users.view_all'
  | 'users.suspend'
  | 'users.unsuspend'
  | 'users.verify'
  | 'users.delete'
  | 'users.export'
  | 'users.manage_roles'
  | 'categories.manage'
  | 'reports.view_all'
  | 'reports.resolve'
  | 'reports.dismiss'
  | 'audit.view'
  | 'analytics.view'
  | 'settings.manage'
  | 'tickets.view_all'
  | 'tickets.assign'
  | 'tickets.resolve'
  | 'ads.create'
  | 'ads.edit_own'
  | 'ads.delete_own'
  | 'offers.make'
  | 'offers.accept'
  | 'offers.reject'
  | 'messages.send'
  | 'searches.save'
  | 'profile.edit_own';

const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  super_admin: [
    'ads.view_all', 'ads.approve', 'ads.reject', 'ads.delete_any', 'ads.feature', 'ads.boost', 'ads.premium',
    'users.view_all', 'users.suspend', 'users.unsuspend', 'users.verify', 'users.delete', 'users.export', 'users.manage_roles',
    'categories.manage', 'reports.view_all', 'reports.resolve', 'reports.dismiss',
    'audit.view', 'analytics.view', 'settings.manage',
    'tickets.view_all', 'tickets.assign', 'tickets.resolve',
    'ads.create', 'ads.edit_own', 'ads.delete_own',
    'offers.make', 'offers.accept', 'offers.reject',
    'messages.send', 'searches.save', 'profile.edit_own',
  ],
  admin: [
    'ads.view_all', 'ads.approve', 'ads.reject', 'ads.delete_any', 'ads.feature', 'ads.boost', 'ads.premium',
    'users.view_all', 'users.suspend', 'users.unsuspend', 'users.verify', 'users.delete', 'users.export',
    'categories.manage', 'reports.view_all', 'reports.resolve', 'reports.dismiss',
    'audit.view', 'analytics.view', 'settings.manage',
    'tickets.view_all', 'tickets.assign', 'tickets.resolve',
    'ads.create', 'ads.edit_own', 'ads.delete_own',
    'offers.make', 'offers.accept', 'offers.reject',
    'messages.send', 'searches.save', 'profile.edit_own',
  ],
  moderator: [
    'ads.view_all', 'ads.approve', 'ads.reject', 'ads.feature',
    'reports.view_all', 'reports.resolve', 'reports.dismiss',
    'ads.create', 'ads.edit_own', 'ads.delete_own',
    'offers.make', 'offers.accept', 'offers.reject',
    'messages.send', 'searches.save', 'profile.edit_own',
  ],
  customer_support: [
    'tickets.view_all', 'tickets.assign', 'tickets.resolve',
    'reports.view_all',
    'users.view_all',
    'ads.create', 'ads.edit_own', 'ads.delete_own',
    'offers.make', 'offers.accept', 'offers.reject',
    'messages.send', 'searches.save', 'profile.edit_own',
  ],
  seller: [
    'ads.create', 'ads.edit_own', 'ads.delete_own',
    'offers.accept', 'offers.reject',
    'messages.send', 'searches.save', 'profile.edit_own',
  ],
  buyer: [
    'ads.create', 'ads.edit_own', 'ads.delete_own',
    'offers.make', 'offers.accept', 'offers.reject',
    'messages.send', 'searches.save', 'profile.edit_own',
  ],
};

const ADMIN_ROLES: AppRole[] = ['super_admin', 'admin', 'moderator'];
const STAFF_ROLES: AppRole[] = ['super_admin', 'admin', 'moderator', 'customer_support'];

export function getRolePermissions(role: AppRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

export function hasPermission(roles: AppRole[], permission: Permission): boolean {
  return roles.some((role) => ROLE_PERMISSIONS[role]?.includes(permission));
}

export function hasAnyPermission(roles: AppRole[], permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(roles, p));
}

export function isAdminRole(roles: AppRole[]): boolean {
  return roles.some((r) => ADMIN_ROLES.includes(r));
}

export function isStaffRole(roles: AppRole[]): boolean {
  return roles.some((r) => STAFF_ROLES.includes(r));
}

function normalizeRoles(rows: Array<{ role?: unknown } | string | null | undefined> | unknown): AppRole[] {
  const out: AppRole[] = [];
  const list: any[] = Array.isArray(rows)
    ? rows
    : rows && typeof rows === 'object'
      ? Object.values(rows as object)
      : [];
  for (const row of list) {
    let raw: unknown = row;
    if (row && typeof row === 'object') {
      raw = (row as any).role ?? (row as any).get_my_roles ?? (row as any).is_admin ?? null;
    }
    if (raw == null || raw === true || raw === false) continue;
    const role = String(raw).trim().toLowerCase() as AppRole;
    if (role && !out.includes(role) && role.length < 64) out.push(role);
  }
  return out;
}

/**
 * Load roles for the signed-in user.
 * Prefer security-definer RPC `get_my_roles()` (bypasses RLS chicken-and-egg),
 * then fall back to a direct table select.
 */
export async function fetchUserRoles(userId: string): Promise<AppRole[]> {
  // 1) Preferred: RPC that always returns the caller's own roles
  try {
    const { data, error } = await supabase.rpc('get_my_roles');
    if (!error && Array.isArray(data) && data.length > 0) {
      return normalizeRoles(data as any[]);
    }
    // empty array can be legitimate (no roles) — still try table path once
    if (!error && Array.isArray(data) && data.length === 0) {
      // continue to table path for diagnostics / older installs without role yet
    }
    if (error) {
      console.warn('fetchUserRoles rpc get_my_roles:', error.message);
    }
  } catch (err) {
    console.warn('fetchUserRoles rpc failed:', err);
  }

  // 2) Direct table select (requires users_select_own_roles policy)
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (error) {
      console.warn('fetchUserRoles table select:', error.message);
      return [];
    }

    return normalizeRoles((data as any[]) || []);
  } catch (err) {
    console.warn('fetchUserRoles failed:', err);
    return [];
  }
}

const ADMIN_ROLE_NAMES = new Set(['super_admin', 'admin', 'moderator']);

const ADMIN_CACHE_KEY = 'bazarbd_is_admin_v1';

export function readAdminCache(userId: string): boolean | null {
  try {
    const raw = sessionStorage.getItem(ADMIN_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { userId?: string; isAdmin?: boolean; at?: number };
    if (parsed.userId !== userId) return null;
    // 12h cache — SQL grants rarely change mid-session
    if (parsed.at && Date.now() - parsed.at > 12 * 60 * 60 * 1000) return null;
    return typeof parsed.isAdmin === 'boolean' ? parsed.isAdmin : null;
  } catch {
    return null;
  }
}

export function writeAdminCache(userId: string, isAdmin: boolean) {
  try {
    sessionStorage.setItem(
      ADMIN_CACHE_KEY,
      JSON.stringify({ userId, isAdmin, at: Date.now() }),
    );
  } catch {
    /* private mode */
  }
}

export function clearAdminCache() {
  try {
    sessionStorage.removeItem(ADMIN_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Direct admin check - queries user_roles for any admin-level role.
 * Uses RPC first so RLS cannot hide the caller's own super_admin row.
 */
export async function checkIsAdmin(userId: string): Promise<boolean> {
  if (!userId) return false;

  const finish = (ok: boolean) => {
    writeAdminCache(userId, ok);
    return ok;
  };

  // Instant path: previous successful check this session
  const cached = readAdminCache(userId);
  if (cached === true) return true;

  try {
    // 0) am_i_admin() — current JWT, no args
    try {
      const { data, error } = await supabase.rpc('am_i_admin' as any);
      if (!error && data === true) return finish(true);
    } catch {
      // continue
    }

    // 1) is_admin(uuid)
    try {
      const { data, error } = await supabase.rpc('is_admin', { _user_id: userId });
      if (!error && data === true) return finish(true);
      if (error) {
        const alt = await supabase.rpc('is_admin', { user_id: userId } as any);
        if (!alt.error && alt.data === true) return finish(true);
      }
    } catch {
      // continue
    }

    // 2) has_role for each admin role
    for (const role of ['super_admin', 'admin', 'moderator'] as const) {
      try {
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: userId,
          _role: role,
        });
        if (!error && data === true) return finish(true);
      } catch {
        // continue
      }
    }

    // 3) get_my_roles()
    try {
      const { data, error } = await supabase.rpc('get_my_roles');
      if (!error && data != null) {
        const roles = normalizeRoles(data as any);
        if (roles.some((r) => ADMIN_ROLE_NAMES.has(String(r).toLowerCase()))) {
          return finish(true);
        }
      }
    } catch {
      // continue
    }

    // 4) Direct table select
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (error) {
      console.warn('checkIsAdmin table select:', error.message);
      // Keep prior cache if any (avoid locking user out on transient errors)
      if (cached === true) return true;
      return finish(false);
    }

    const ok = ((data as any[]) || []).some((r) => {
      const role = String(r.role ?? '').toLowerCase();
      return ADMIN_ROLE_NAMES.has(role);
    });
    return finish(ok);
  } catch (err) {
    console.warn('checkIsAdmin failed:', err);
    if (cached === true) return true;
    return finish(false);
  }
}

export const ALL_PERMISSIONS = Object.keys(ROLE_PERMISSIONS) as Permission[];

export const PERMISSION_LABELS: Record<Permission, string> = {
  'ads.view_all': 'View all ads',
  'ads.approve': 'Approve ads',
  'ads.reject': 'Reject ads',
  'ads.delete_any': 'Delete any ad',
  'ads.feature': 'Feature ads',
  'ads.boost': 'Boost ads',
  'ads.premium': 'Set premium ads',
  'users.view_all': 'View all users',
  'users.suspend': 'Suspend users',
  'users.unsuspend': 'Unsuspend users',
  'users.verify': 'Verify users',
  'users.delete': 'Delete users',
  'users.export': 'Export users',
  'users.manage_roles': 'Manage user roles',
  'categories.manage': 'Manage categories',
  'reports.view_all': 'View all reports',
  'reports.resolve': 'Resolve reports',
  'reports.dismiss': 'Dismiss reports',
  'audit.view': 'View audit logs',
  'analytics.view': 'View analytics',
  'settings.manage': 'Manage settings',
  'tickets.view_all': 'View all tickets',
  'tickets.assign': 'Assign tickets',
  'tickets.resolve': 'Resolve tickets',
  'ads.create': 'Create ads',
  'ads.edit_own': 'Edit own ads',
  'ads.delete_own': 'Delete own ads',
  'offers.make': 'Make offers',
  'offers.accept': 'Accept offers',
  'offers.reject': 'Reject offers',
  'messages.send': 'Send messages',
  'searches.save': 'Save searches',
  'profile.edit_own': 'Edit own profile',
};

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  moderator: 'Moderator',
  customer_support: 'Customer Support',
  seller: 'Seller',
  buyer: 'Buyer',
};
