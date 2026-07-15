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

const ADMIN_ROLES: AppRole[] = ['super_admin', 'admin'];
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

function normalizeRoles(rows: Array<{ role?: unknown } | string | null | undefined>): AppRole[] {
  const out: AppRole[] = [];
  for (const row of rows || []) {
    const raw = typeof row === 'string' ? row : (row as any)?.role;
    if (raw == null) continue;
    const role = String(raw).trim().toLowerCase() as AppRole;
    if (role && !out.includes(role)) out.push(role);
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

/**
 * Direct admin check - queries user_roles for any admin-level role.
 * Uses RPC first so RLS cannot hide the caller's own super_admin row.
 */
export async function checkIsAdmin(userId: string): Promise<boolean> {
  try {
    // RPC path (security definer)
    try {
      const { data, error } = await supabase.rpc('get_my_roles');
      if (!error && Array.isArray(data)) {
        const roles = normalizeRoles(data as any[]);
        if (roles.some((r) => ADMIN_ROLE_NAMES.has(String(r).toLowerCase()))) return true;
        // if RPC works and returns empty, user truly has no roles
        if (data.length === 0) {
          // still try table once in case RPC is stale/mis-deployed
        }
      }
    } catch {
      // continue
    }

    // is_admin(uuid) helper if present
    try {
      const { data, error } = await supabase.rpc('is_admin', { _user_id: userId });
      if (!error && data === true) return true;
    } catch {
      // continue
    }

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (error) {
      console.warn('checkIsAdmin table select:', error.message);
      return false;
    }

    return ((data as any[]) || []).some((r) => {
      const role = String(r.role ?? '').toLowerCase();
      return ADMIN_ROLE_NAMES.has(role);
    });
  } catch {
    return false;
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
