import { supabase } from '@/integrations/supabase/client';
import { AppRole, fetchUserRoles } from '@/lib/permissions';

// ============================================
// Advanced Permission Constants (25+ permissions)
// ============================================

export const CAN_APPROVE_ADS = 'can_approve_ads';
export const CAN_REJECT_ADS = 'can_reject_ads';
export const CAN_DELETE_USERS = 'can_delete_users';
export const CAN_RESTORE_USERS = 'can_restore_users';
export const CAN_EDIT_CATEGORIES = 'can_edit_categories';
export const CAN_VIEW_ANALYTICS = 'can_view_analytics';
export const CAN_EXPORT_REPORTS = 'can_export_reports';
export const CAN_ACCESS_AUDIT_LOGS = 'can_access_audit_logs';
export const CAN_IMPERSONATE_USERS = 'can_impersonate_users';
export const CAN_MANAGE_MODERATORS = 'can_manage_moderators';
export const CAN_MANAGE_SETTINGS = 'can_manage_settings';
export const CAN_MODERATE_REVIEWS = 'can_moderate_reviews';
export const CAN_MODERATE_MESSAGES = 'can_moderate_messages';
export const CAN_MANAGE_CMS = 'can_manage_cms';
export const CAN_VIEW_FINANCIAL_REPORTS = 'can_view_financial_reports';
export const CAN_ASSIGN_PERMISSIONS = 'can_assign_permissions';
export const CAN_BAN_USERS = 'can_ban_users';
export const CAN_VERIFY_BUSINESS = 'can_verify_business';
export const CAN_MANAGE_BLACKLIST = 'can_manage_blacklist';
export const CAN_VIEW_FRAUD_ALERTS = 'can_view_fraud_alerts';
export const CAN_MANAGE_WORKFLOW = 'can_manage_workflow';
export const CAN_MANAGE_SEO = 'can_manage_seo';
export const CAN_MANAGE_API_KEYS = 'can_manage_api_keys';
export const CAN_MANAGE_BACKUPS = 'can_manage_backups';
export const CAN_MANAGE_FEATURE_FLAGS = 'can_manage_feature_flags';

export type AdvancedPermission = typeof CAN_APPROVE_ADS
  | typeof CAN_REJECT_ADS
  | typeof CAN_DELETE_USERS
  | typeof CAN_RESTORE_USERS
  | typeof CAN_EDIT_CATEGORIES
  | typeof CAN_VIEW_ANALYTICS
  | typeof CAN_EXPORT_REPORTS
  | typeof CAN_ACCESS_AUDIT_LOGS
  | typeof CAN_IMPERSONATE_USERS
  | typeof CAN_MANAGE_MODERATORS
  | typeof CAN_MANAGE_SETTINGS
  | typeof CAN_MODERATE_REVIEWS
  | typeof CAN_MODERATE_MESSAGES
  | typeof CAN_MANAGE_CMS
  | typeof CAN_VIEW_FINANCIAL_REPORTS
  | typeof CAN_ASSIGN_PERMISSIONS
  | typeof CAN_BAN_USERS
  | typeof CAN_VERIFY_BUSINESS
  | typeof CAN_MANAGE_BLACKLIST
  | typeof CAN_VIEW_FRAUD_ALERTS
  | typeof CAN_MANAGE_WORKFLOW
  | typeof CAN_MANAGE_SEO
  | typeof CAN_MANAGE_API_KEYS
  | typeof CAN_MANAGE_BACKUPS
  | typeof CAN_MANAGE_FEATURE_FLAGS;

export const ALL_ADVANCED_PERMISSIONS: AdvancedPermission[] = [
  CAN_APPROVE_ADS,
  CAN_REJECT_ADS,
  CAN_DELETE_USERS,
  CAN_RESTORE_USERS,
  CAN_EDIT_CATEGORIES,
  CAN_VIEW_ANALYTICS,
  CAN_EXPORT_REPORTS,
  CAN_ACCESS_AUDIT_LOGS,
  CAN_IMPERSONATE_USERS,
  CAN_MANAGE_MODERATORS,
  CAN_MANAGE_SETTINGS,
  CAN_MODERATE_REVIEWS,
  CAN_MODERATE_MESSAGES,
  CAN_MANAGE_CMS,
  CAN_VIEW_FINANCIAL_REPORTS,
  CAN_ASSIGN_PERMISSIONS,
  CAN_BAN_USERS,
  CAN_VERIFY_BUSINESS,
  CAN_MANAGE_BLACKLIST,
  CAN_VIEW_FRAUD_ALERTS,
  CAN_MANAGE_WORKFLOW,
  CAN_MANAGE_SEO,
  CAN_MANAGE_API_KEYS,
  CAN_MANAGE_BACKUPS,
  CAN_MANAGE_FEATURE_FLAGS,
];

// ============================================
// Permission Labels & Groups
// ============================================

export const PERMISSION_LABELS: Record<AdvancedPermission, string> = {
  [CAN_APPROVE_ADS]: 'Approve Ads',
  [CAN_REJECT_ADS]: 'Reject Ads',
  [CAN_DELETE_USERS]: 'Delete Users',
  [CAN_RESTORE_USERS]: 'Restore Users',
  [CAN_EDIT_CATEGORIES]: 'Edit Categories',
  [CAN_VIEW_ANALYTICS]: 'View Analytics',
  [CAN_EXPORT_REPORTS]: 'Export Reports',
  [CAN_ACCESS_AUDIT_LOGS]: 'Access Audit Logs',
  [CAN_IMPERSONATE_USERS]: 'Impersonate Users',
  [CAN_MANAGE_MODERATORS]: 'Manage Moderators',
  [CAN_MANAGE_SETTINGS]: 'Manage Settings',
  [CAN_MODERATE_REVIEWS]: 'Moderate Reviews',
  [CAN_MODERATE_MESSAGES]: 'Moderate Messages',
  [CAN_MANAGE_CMS]: 'Manage CMS',
  [CAN_VIEW_FINANCIAL_REPORTS]: 'View Financial Reports',
  [CAN_ASSIGN_PERMISSIONS]: 'Assign Permissions',
  [CAN_BAN_USERS]: 'Ban Users',
  [CAN_VERIFY_BUSINESS]: 'Verify Business',
  [CAN_MANAGE_BLACKLIST]: 'Manage Blacklist',
  [CAN_VIEW_FRAUD_ALERTS]: 'View Fraud Alerts',
  [CAN_MANAGE_WORKFLOW]: 'Manage Workflow',
  [CAN_MANAGE_SEO]: 'Manage SEO',
  [CAN_MANAGE_API_KEYS]: 'Manage API Keys',
  [CAN_MANAGE_BACKUPS]: 'Manage Backups',
  [CAN_MANAGE_FEATURE_FLAGS]: 'Manage Feature Flags',
};

export interface PermissionGroup {
  label: string;
  permissions: AdvancedPermission[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: 'Ads',
    permissions: [CAN_APPROVE_ADS, CAN_REJECT_ADS],
  },
  {
    label: 'Users',
    permissions: [CAN_DELETE_USERS, CAN_RESTORE_USERS, CAN_BAN_USERS, CAN_IMPERSONATE_USERS, CAN_MANAGE_MODERATORS],
  },
  {
    label: 'Content',
    permissions: [CAN_EDIT_CATEGORIES, CAN_MODERATE_REVIEWS, CAN_MODERATE_MESSAGES, CAN_MANAGE_CMS],
  },
  {
    label: 'Reports & Analytics',
    permissions: [CAN_VIEW_ANALYTICS, CAN_EXPORT_REPORTS, CAN_VIEW_FINANCIAL_REPORTS, CAN_ACCESS_AUDIT_LOGS],
  },
  {
    label: 'Trust & Safety',
    permissions: [CAN_VERIFY_BUSINESS, CAN_MANAGE_BLACKLIST, CAN_VIEW_FRAUD_ALERTS],
  },
  {
    label: 'System',
    permissions: [CAN_MANAGE_SETTINGS, CAN_ASSIGN_PERMISSIONS, CAN_MANAGE_WORKFLOW, CAN_MANAGE_SEO, CAN_MANAGE_API_KEYS, CAN_MANAGE_BACKUPS, CAN_MANAGE_FEATURE_FLAGS],
  },
];

// ============================================
// Role-Permission Mapping
// ============================================

const ROLE_DEFAULT_PERMISSIONS: Record<AppRole, AdvancedPermission[]> = {
  super_admin: [...ALL_ADVANCED_PERMISSIONS],
  admin: [
    CAN_APPROVE_ADS, CAN_REJECT_ADS, CAN_DELETE_USERS, CAN_RESTORE_USERS,
    CAN_EDIT_CATEGORIES, CAN_VIEW_ANALYTICS, CAN_EXPORT_REPORTS, CAN_ACCESS_AUDIT_LOGS,
    CAN_MANAGE_SETTINGS, CAN_MODERATE_REVIEWS, CAN_MODERATE_MESSAGES, CAN_MANAGE_CMS,
    CAN_VIEW_FINANCIAL_REPORTS, CAN_BAN_USERS, CAN_VERIFY_BUSINESS, CAN_MANAGE_BLACKLIST,
    CAN_VIEW_FRAUD_ALERTS, CAN_MANAGE_WORKFLOW, CAN_MANAGE_SEO, CAN_MANAGE_FEATURE_FLAGS,
  ],
  moderator: [
    CAN_APPROVE_ADS, CAN_REJECT_ADS, CAN_MODERATE_REVIEWS, CAN_MODERATE_MESSAGES,
    CAN_VIEW_FRAUD_ALERTS, CAN_BAN_USERS, CAN_VIEW_ANALYTICS,
  ],
  customer_support: [
    CAN_MODERATE_MESSAGES, CAN_MODERATE_REVIEWS, CAN_VIEW_FRAUD_ALERTS,
  ],
  seller: [],
  buyer: [],
};

// ============================================
// Permission Functions
// ============================================

/**
 * Get default permissions for a role
 */
export function getDefaultPermissionsForRole(role: AppRole): AdvancedPermission[] {
  return ROLE_DEFAULT_PERMISSIONS[role] || [];
}

/**
 * Check if user has a specific permission (checks role defaults + individual overrides)
 */
export async function hasPermission(userId: string, permission: AdvancedPermission): Promise<boolean> {
  // Check individual overrides first
  const { data: override } = await supabase
    .from('permission_overrides')
    .select('granted')
    .eq('user_id', userId)
    .eq('permission', permission)
    .maybeSingle();

  if (override) {
    return override.granted;
  }

  // Fall back to role defaults
  const roles = await fetchUserRoles(userId);
  return roles.some((role) => ROLE_DEFAULT_PERMISSIONS[role]?.includes(permission));
}

/**
 * Grant an individual permission to a user
 */
export async function grantPermission(
  userId: string,
  permission: AdvancedPermission,
  grantedBy: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('permission_overrides')
      .upsert({
        user_id: userId,
        permission,
        granted: true,
        granted_by: grantedBy,
      }, { onConflict: 'user_id,permission' });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Revoke an individual permission from a user
 */
export async function revokePermission(
  userId: string,
  permission: AdvancedPermission,
  grantedBy: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('permission_overrides')
      .upsert({
        user_id: userId,
        permission,
        granted: false,
        granted_by: grantedBy,
      }, { onConflict: 'user_id,permission' });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Get all permissions for a user (role defaults + overrides)
 */
export async function getPermissionsForUser(userId: string): Promise<Record<AdvancedPermission, boolean>> {
  const roles = await fetchUserRoles(userId);

  // Start with role defaults
  const result = {} as Record<AdvancedPermission, boolean>;
  for (const perm of ALL_ADVANCED_PERMISSIONS) {
    result[perm] = roles.some((role) => ROLE_DEFAULT_PERMISSIONS[role]?.includes(perm));
  }

  // Apply overrides
  const { data: overrides } = await supabase
    .from('permission_overrides')
    .select('permission, granted')
    .eq('user_id', userId);

  if (overrides) {
    for (const override of overrides) {
      result[override.permission as AdvancedPermission] = override.granted;
    }
  }

  return result;
}
