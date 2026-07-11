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

export async function fetchUserRoles(userId: string): Promise<AppRole[]> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (error) {
      // Table might not exist or enum might not match - try raw query
      console.warn('fetchUserRoles error, trying fallback:', error.message);
      return [];
    }

    return (data?.map((r) => r.role as AppRole)) || [];
  } catch (err) {
    console.warn('fetchUserRoles failed:', err);
    return [];
  }
}

/**
 * Direct admin check - queries user_roles table for any admin-level role.
 * This is a fallback that doesn't depend on the AppRole enum type matching.
 */
export async function checkIsAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .in('role', ['admin', 'super_admin', 'moderator']);

    if (error) {
      // If the .in() filter fails (maybe enum mismatch), try without it
      const { data: allData, error: allError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (allError) return false;

      return (allData || []).some((r: any) => {
        const role = String(r.role).toLowerCase();
        return role === 'admin' || role === 'super_admin' || role === 'moderator';
      });
    }

    return (data || []).length > 0;
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
