/**
 * Phase 14 — Admin Portal Library
 *
 * Comprehensive admin portal utilities:
 * - Dashboard stats and charts
 * - Customizable dashboard widgets
 * - Admin activity logging
 * - System health metrics
 * - Admin notifications
 * - Bulk operations
 * - Admin preferences
 * - User management (suspend, verify, delete, role assignment)
 * - Listing moderation (bulk approve/reject/delete/feature/boost)
 * - System settings management
 * - Export/import data
 * - Admin search across all entities
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  AdminDashboardWidget, AdminDashboardWidgetInsert,
  AdminActivityLogRecord,
  SystemHealthMetric,
  AdminNotification,
  AdminBulkOperation, AdminBulkOperationInsert,
  AdminPreferences, AdminPreferencesUpdate,
  DashboardStats, ChartDataPoint,
  BulkOperationType, WidgetType,
} from '@/integrations/supabase/types_v14_admin';
import { DEFAULT_WIDGETS } from '@/integrations/supabase/types_v14_admin';

// =========================================================================
// Dashboard Stats
// =========================================================================

export async function getDashboardStats(): Promise<DashboardStats | null> {
  try {
    const { data, error } = await supabase.rpc('get_dashboard_stats');
    if (error) { console.error('getDashboardStats:', error); return null; }
    return data as DashboardStats;
  } catch (err) {
    console.error('getDashboardStats:', err);
    return null;
  }
}

export async function getUserGrowthChart(days: number = 30): Promise<ChartDataPoint[]> {
  try {
    const { data, error } = await supabase.rpc('get_user_growth_chart', { p_days: days });
    if (error) { console.error('getUserGrowthChart:', error); return []; }
    return (data as ChartDataPoint[]) || [];
  } catch (err) {
    console.error('getUserGrowthChart:', err);
    return [];
  }
}

export async function getListingGrowthChart(days: number = 30): Promise<ChartDataPoint[]> {
  try {
    const { data, error } = await supabase.rpc('get_listing_growth_chart', { p_days: days });
    if (error) { console.error('getListingGrowthChart:', error); return []; }
    return (data as ChartDataPoint[]) || [];
  } catch (err) {
    console.error('getListingGrowthChart:', err);
    return [];
  }
}

// =========================================================================
// Dashboard Widgets
// =========================================================================

export async function getDashboardWidgets(userId: string): Promise<AdminDashboardWidget[]> {
  const { data, error } = await supabase
    .from('admin_dashboard_widgets')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });
  if (error) { console.error('getDashboardWidgets:', error); return []; }
  return (data as AdminDashboardWidget[]) || [];
}

export async function initializeDefaultWidgets(userId: string): Promise<void> {
  const existing = await getDashboardWidgets(userId);
  if (existing.length > 0) return;

  const widgets: AdminDashboardWidgetInsert[] = DEFAULT_WIDGETS.map((w, i) => ({
    user_id: userId,
    widget_key: w.key,
    widget_type: w.type,
    title: w.title,
    width: w.width,
    height: w.height,
    sort_order: i,
    position_x: i % 4,
    position_y: Math.floor(i / 4),
  }));

  const { error } = await supabase.from('admin_dashboard_widgets').insert(widgets);
  if (error) console.error('initializeDefaultWidgets:', error);
}

export async function updateWidget(id: string, updates: Partial<AdminDashboardWidget>): Promise<boolean> {
  const { error } = await supabase
    .from('admin_dashboard_widgets')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) { console.error('updateWidget:', error); return false; }
  return true;
}

export async function toggleWidgetVisibility(id: string, visible: boolean): Promise<boolean> {
  return updateWidget(id, { is_visible: visible });
}

export async function deleteWidget(id: string): Promise<boolean> {
  const { error } = await supabase.from('admin_dashboard_widgets').delete().eq('id', id);
  if (error) { console.error('deleteWidget:', error); return false; }
  return true;
}

export async function addWidget(widget: AdminDashboardWidgetInsert): Promise<AdminDashboardWidget | null> {
  const { data, error } = await supabase
    .from('admin_dashboard_widgets')
    .insert(widget)
    .select()
    .single();
  if (error) { toast.error('Failed to add widget'); console.error('addWidget:', error); return null; }
  return data as AdminDashboardWidget;
}

export async function resetDashboard(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('admin_dashboard_widgets')
    .delete()
    .eq('user_id', userId);
  if (error) { console.error('resetDashboard:', error); return false; }
  await initializeDefaultWidgets(userId);
  toast.success('Dashboard reset to default');
  return true;
}

// =========================================================================
// Admin Activity Log
// =========================================================================

export async function logAdminActivity(
  adminId: string,
  action: string,
  resourceType?: string,
  resourceId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.rpc('log_admin_activity', {
      p_admin_id: adminId,
      p_action: action,
      p_resource_type: resourceType || null,
      p_resource_id: resourceId || null,
      p_details: details || {},
    });
  } catch {
    // Non-critical
  }
}

export async function getAdminActivityLog(limit: number = 50, offset: number = 0): Promise<AdminActivityLogRecord[]> {
  const { data, error } = await supabase
    .from('admin_activity_log')
    .select('*, admin:profiles!admin_activity_log_admin_id_fkey(full_name, avatar_url)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) { console.error('getAdminActivityLog:', error); return []; }
  return (data as AdminActivityLogRecord[]) || [];
}

export async function getAdminActivityCount(): Promise<number> {
  const { count, error } = await supabase
    .from('admin_activity_log')
    .select('id', { count: 'exact', head: true });
  if (error) { console.error('getAdminActivityCount:', error); return 0; }
  return count || 0;
}

// =========================================================================
// System Health Metrics
// =========================================================================

export async function getSystemHealthMetrics(): Promise<SystemHealthMetric[]> {
  const { data, error } = await supabase
    .from('system_health_metrics')
    .select('*')
    .order('recorded_at', { ascending: false })
    .limit(20);
  if (error) { console.error('getSystemHealthMetrics:', error); return []; }
  return (data as SystemHealthMetric[]) || [];
}

export async function getSystemHealthSummary(): Promise<{ status: string; metrics: SystemHealthMetric[] }> {
  const metrics = await getSystemHealthMetrics();
  const hasCritical = metrics.some(m => m.status === 'critical' || m.status === 'down');
  const hasWarning = metrics.some(m => m.status === 'warning');
  const status = hasCritical ? 'critical' : hasWarning ? 'warning' : 'healthy';
  return { status, metrics };
}

// =========================================================================
// Admin Notifications
// =========================================================================

export async function getAdminNotifications(adminId: string, unreadOnly: boolean = false): Promise<AdminNotification[]> {
  let query = supabase
    .from('admin_notifications')
    .select('*')
    .or(`admin_id.eq.${adminId},admin_id.is.null`)
    .order('created_at', { ascending: false })
    .limit(50);
  if (unreadOnly) query = query.eq('is_read', false);
  const { data, error } = await query;
  if (error) { console.error('getAdminNotifications:', error); return []; }
  return (data as AdminNotification[]) || [];
}

export async function markAdminNotificationRead(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('admin_notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id);
  if (error) { console.error('markAdminNotificationRead:', error); return false; }
  return true;
}

export async function markAllAdminNotificationsRead(adminId: string): Promise<boolean> {
  const { error } = await supabase
    .from('admin_notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .or(`admin_id.eq.${adminId},admin_id.is.null`)
    .eq('is_read', false);
  if (error) { console.error('markAllAdminNotificationsRead:', error); return false; }
  return true;
}

export async function getUnreadAdminNotificationCount(adminId: string): Promise<number> {
  const { count, error } = await supabase
    .from('admin_notifications')
    .select('id', { count: 'exact', head: true })
    .or(`admin_id.eq.${adminId},admin_id.is.null`)
    .eq('is_read', false);
  if (error) { console.error('getUnreadAdminNotificationCount:', error); return 0; }
  return count || 0;
}

// =========================================================================
// Bulk Operations
// =========================================================================

export async function executeBulkOperation(
  adminId: string,
  operationType: BulkOperationType,
  targetIds: string[],
  parameters?: Record<string, unknown>
): Promise<AdminBulkOperation | null> {
  // Create operation record
  const { data: opRecord, error: opError } = await supabase
    .from('admin_bulk_operations')
    .insert({
      admin_id: adminId,
      operation_type: operationType,
      target_ids: targetIds,
      parameters: parameters || {},
      status: 'processing',
      total_count: targetIds.length,
      success_count: 0,
      failure_count: 0,
    })
    .select()
    .single();

  if (opError) { toast.error('Failed to start bulk operation'); console.error('executeBulkOperation:', opError); return null; }

  let successCount = 0;
  let failureCount = 0;
  const errorDetails: Array<{ id: string; error: string }> = [];

  for (const targetId of targetIds) {
    try {
      let success = false;
      switch (operationType) {
        case 'approve_listings':
          const { error: approveErr } = await supabase.from('ads').update({ status: 'approved', updated_at: new Date().toISOString() }).eq('id', targetId);
          success = !approveErr;
          break;
        case 'reject_listings':
          const { error: rejectErr } = await supabase.from('ads').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', targetId);
          success = !rejectErr;
          break;
        case 'delete_listings':
          const { error: deleteErr } = await supabase.from('ads').update({ deleted_at: new Date().toISOString(), status: 'archived' }).eq('id', targetId);
          success = !deleteErr;
          break;
        case 'feature_listings':
          const { error: featureErr } = await supabase.from('ads').update({ is_featured: true, updated_at: new Date().toISOString() }).eq('id', targetId);
          success = !featureErr;
          break;
        case 'boost_listings':
          const { error: boostErr } = await supabase.from('ads').update({ is_boosted: true, boosted_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date().toISOString() }).eq('id', targetId);
          success = !boostErr;
          break;
        case 'suspend_users':
          const { error: suspendErr } = await supabase.from('profiles').update({ is_suspended: true, suspended_at: new Date().toISOString(), suspended_reason: (parameters?.reason as string) || 'Admin action' }).eq('user_id', targetId);
          success = !suspendErr;
          break;
        case 'verify_users':
          const { error: verifyErr } = await supabase.from('profiles').update({ is_verified: true }).eq('user_id', targetId);
          success = !verifyErr;
          break;
        case 'delete_users':
          const { error: deleteUserErr } = await supabase.from('profiles').update({ deleted_at: new Date().toISOString() }).eq('user_id', targetId);
          success = !deleteUserErr;
          break;
        case 'assign_role':
          const role = parameters?.role as string;
          if (role) {
            const { error: roleErr } = await supabase.from('user_roles').upsert({ user_id: targetId, role: role });
            success = !roleErr;
          }
          break;
        case 'cleanup_expired':
          const { error: cleanupErr } = await supabase.from('ads').update({ status: 'expired' }).eq('id', targetId).lt('expires_at', new Date().toISOString());
          success = !cleanupErr;
          break;
        default:
          break;
      }

      if (success) {
        successCount++;
      } else {
        failureCount++;
        errorDetails.push({ id: targetId, error: 'Operation failed' });
      }
    } catch (err) {
      failureCount++;
      errorDetails.push({ id: targetId, error: String(err) });
    }
  }

  // Update operation record
  const { data: updatedRecord, error: updateError } = await supabase
    .from('admin_bulk_operations')
    .update({
      status: failureCount === 0 ? 'completed' : (successCount === 0 ? 'failed' : 'partial'),
      success_count: successCount,
      failure_count: failureCount,
      error_details: errorDetails,
      completed_at: new Date().toISOString(),
    })
    .eq('id', opRecord.id)
    .select()
    .single();

  if (updateError) console.error('executeBulkOperation update:', updateError);

  // Log activity
  await logAdminActivity(adminId, `bulk_${operationType}`, 'bulk', opRecord.id, { total: targetIds.length, success: successCount, failure: failureCount });

  if (failureCount === 0) {
    toast.success(`Bulk operation completed: ${successCount} items processed`);
  } else if (successCount === 0) {
    toast.error(`Bulk operation failed: ${failureCount} items failed`);
  } else {
    toast.info(`Bulk operation partial: ${successCount} succeeded, ${failureCount} failed`);
  }

  return (updatedRecord as AdminBulkOperation) || (opRecord as AdminBulkOperation);
}

export async function getBulkOperations(adminId: string, limit: number = 20): Promise<AdminBulkOperation[]> {
  const { data, error } = await supabase
    .from('admin_bulk_operations')
    .select('*')
    .eq('admin_id', adminId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { console.error('getBulkOperations:', error); return []; }
  return (data as AdminBulkOperation[]) || [];
}

// =========================================================================
// Admin Preferences
// =========================================================================

export async function getAdminPreferences(userId: string): Promise<AdminPreferences | null> {
  const { data, error } = await supabase
    .from('admin_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) { console.error('getAdminPreferences:', error); return null; }
  if (!data) {
    // Create default preferences
    const { data: newPrefs, error: insertError } = await supabase
      .from('admin_preferences')
      .insert({ user_id: userId })
      .select()
      .single();
    if (insertError) { console.error('getAdminPreferences insert:', insertError); return null; }
    return newPrefs as AdminPreferences;
  }
  return data as AdminPreferences;
}

export async function updateAdminPreferences(userId: string, updates: AdminPreferencesUpdate): Promise<AdminPreferences | null> {
  await getAdminPreferences(userId); // Ensure exists
  const { data, error } = await supabase
    .from('admin_preferences')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single();
  if (error) { toast.error('Failed to update preferences'); console.error('updateAdminPreferences:', error); return null; }
  return data as AdminPreferences;
}

// =========================================================================
// Admin Search (across all entities)
// =========================================================================

export async function adminSearch(query: string): Promise<{
  users: any[];
  listings: any[];
  shops: any[];
  reports: any[];
}> {
  const results = { users: [] as any[], listings: [] as any[], shops: [] as any[], reports: [] as any[] };

  if (!query || query.trim().length < 2) return results;

  const [usersRes, listingsRes, shopsRes] = await Promise.all([
    supabase.from('profiles').select('user_id, full_name, avatar_url, is_verified, is_suspended, created_at').ilike('full_name', `%${query}%`).limit(10),
    supabase.from('ads').select('id, title, slug, status, price, created_at').ilike('title', `%${query}%`).limit(10),
    supabase.from('shops').select('id, name, slug, is_verified, is_featured').ilike('name', `%${query}%`).limit(10),
  ]);

  if (usersRes.data) results.users = usersRes.data;
  if (listingsRes.data) results.listings = listingsRes.data;
  if (shopsRes.data) results.shops = shopsRes.data;

  return results;
}

// =========================================================================
// System Settings
// =========================================================================

export async function getSystemSettings(): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .order('key', { ascending: true });
  if (error) { console.error('getSystemSettings:', error); return {}; }
  const settings: Record<string, unknown> = {};
  (data || []).forEach((s: any) => { settings[s.key] = s.value; });
  return settings;
}

export async function updateSystemSetting(key: string, value: unknown, adminId: string): Promise<boolean> {
  const { error } = await supabase
    .from('system_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) { toast.error('Failed to update setting'); console.error('updateSystemSetting:', error); return false; }
  await logAdminActivity(adminId, 'update_setting', 'system_setting', key, { value });
  toast.success('Setting updated');
  return true;
}

// =========================================================================
// Export Data
// =========================================================================

export async function exportData(table: string, format: 'csv' | 'json' = 'csv'): Promise<string | null> {
  const { data, error } = await supabase.from(table).select('*').limit(10000);
  if (error) { toast.error('Failed to export data'); console.error('exportData:', error); return null; }

  if (format === 'json') {
    return JSON.stringify(data, null, 2);
  }

  // CSV format
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const csvLines = [headers.join(',')];
  for (const row of data) {
    csvLines.push(headers.map(h => {
      const val = (row as any)[h];
      if (val === null || val === undefined) return '';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    }).join(','));
  }
  return csvLines.join('\n');
}

export function downloadExport(data: string, filename: string, format: 'csv' | 'json' = 'csv'): void {
  const blob = new Blob([data], { type: format === 'csv' ? 'text/csv' : 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// =========================================================================
// Quick Actions
// =========================================================================

export async function quickApproveListing(adId: string, adminId: string): Promise<boolean> {
  const { error } = await supabase.from('ads').update({ status: 'approved', updated_at: new Date().toISOString() }).eq('id', adId);
  if (error) { toast.error('Failed to approve listing'); return false; }
  await logAdminActivity(adminId, 'approve_listing', 'ad', adId);
  toast.success('Listing approved');
  return true;
}

export async function quickRejectListing(adId: string, adminId: string, reason?: string): Promise<boolean> {
  const { error } = await supabase.from('ads').update({ status: 'rejected', rejection_message: reason || 'Rejected by admin', updated_at: new Date().toISOString() }).eq('id', adId);
  if (error) { toast.error('Failed to reject listing'); return false; }
  await logAdminActivity(adminId, 'reject_listing', 'ad', adId, { reason });
  toast.success('Listing rejected');
  return true;
}

export async function quickSuspendUser(userId: string, adminId: string, reason?: string): Promise<boolean> {
  const { error } = await supabase.from('profiles').update({ is_suspended: true, suspended_at: new Date().toISOString(), suspended_reason: reason || 'Suspended by admin' }).eq('user_id', userId);
  if (error) { toast.error('Failed to suspend user'); return false; }
  await logAdminActivity(adminId, 'suspend_user', 'user', userId, { reason });
  toast.success('User suspended');
  return true;
}

export async function quickUnsuspendUser(userId: string, adminId: string): Promise<boolean> {
  const { error } = await supabase.from('profiles').update({ is_suspended: false, suspended_at: null, suspended_reason: null }).eq('user_id', userId);
  if (error) { toast.error('Failed to unsuspend user'); return false; }
  await logAdminActivity(adminId, 'unsuspend_user', 'user', userId);
  toast.success('User unsuspended');
  return true;
}

export async function quickVerifyUser(userId: string, adminId: string): Promise<boolean> {
  const { error } = await supabase.from('profiles').update({ is_verified: true }).eq('user_id', userId);
  if (error) { toast.error('Failed to verify user'); return false; }
  await logAdminActivity(adminId, 'verify_user', 'user', userId);
  toast.success('User verified');
  return true;
}

export async function quickFeatureListing(adId: string, adminId: string): Promise<boolean> {
  const { error } = await supabase.from('ads').update({ is_featured: true, updated_at: new Date().toISOString() }).eq('id', adId);
  if (error) { toast.error('Failed to feature listing'); return false; }
  await logAdminActivity(adminId, 'feature_listing', 'ad', adId);
  toast.success('Listing featured');
  return true;
}

export async function quickBoostListing(adId: string, adminId: string, days: number = 7): Promise<boolean> {
  const { error } = await supabase.from('ads').update({ is_boosted: true, boosted_until: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date().toISOString() }).eq('id', adId);
  if (error) { toast.error('Failed to boost listing'); return false; }
  await logAdminActivity(adminId, 'boost_listing', 'ad', adId, { days });
  toast.success('Listing boosted');
  return true;
}
