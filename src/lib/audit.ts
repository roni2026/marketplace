import { supabase } from '@/integrations/supabase/client';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'approve'
  | 'reject'
  | 'suspend'
  | 'unsuspend'
  | 'verify'
  | 'export'
  | 'bulk_action'
  | 'settings_change';

interface AuditLogParams {
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
}

export async function logAudit({ action, resourceType, resourceId, details }: AuditLogParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action,
      resource_type: resourceType,
      resource_id: resourceId || null,
      details: details || null,
    });
  } catch (error) {
    console.error('Failed to log audit entry:', error);
  }
}

export async function logLogin(userId: string): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: 'login',
      resource_type: 'auth',
      resource_id: userId,
    });
  } catch (error) {
    console.error('Failed to log login:', error);
  }
}

export async function logLogout(userId: string): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: 'logout',
      resource_type: 'auth',
      resource_id: userId,
    });
  } catch (error) {
    console.error('Failed to log logout:', error);
  }
}

export async function logLoginAttempt(email: string, success: boolean, failureReason?: string): Promise<void> {
  try {
    await supabase.from('login_attempts').insert({
      email,
      success,
      failure_reason: failureReason || null,
    });
  } catch (error) {
    console.error('Failed to log login attempt:', error);
  }
}

export async function logAdAction(action: AuditAction, adId: string, details?: Record<string, unknown>): Promise<void> {
  await logAudit({ action, resourceType: 'ad', resourceId: adId, details });
}

export async function logUserAction(action: AuditAction, targetUserId: string, details?: Record<string, unknown>): Promise<void> {
  await logAudit({ action, resourceType: 'user', resourceId: targetUserId, details });
}

export async function logReportAction(action: AuditAction, reportId: string, details?: Record<string, unknown>): Promise<void> {
  await logAudit({ action, resourceType: 'report', resourceId: reportId, details });
}

export async function logSettingsChange(setting: string, oldValue: unknown, newValue: unknown): Promise<void> {
  await logAudit({
    action: 'settings_change',
    resourceType: 'settings',
    resourceId: setting,
    details: { old_value: oldValue, new_value: newValue },
  });
}
