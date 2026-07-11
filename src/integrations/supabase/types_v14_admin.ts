/**
 * TypeScript types for Phase 14: Admin Portal.
 */

export type WidgetType = 'stat' | 'chart' | 'table' | 'alert' | 'custom';
export type BulkOperationType =
  | 'approve_listings' | 'reject_listings' | 'delete_listings' | 'feature_listings'
  | 'boost_listings' | 'suspend_users' | 'verify_users' | 'delete_users'
  | 'assign_role' | 'update_settings' | 'export_data' | 'import_data'
  | 'send_notification' | 'cleanup_expired';
export type SystemHealthStatus = 'healthy' | 'warning' | 'critical' | 'down';

// =========================================================================
// Dashboard Widgets
// =========================================================================

export interface AdminDashboardWidget {
  id: string;
  user_id: string;
  widget_key: string;
  widget_type: WidgetType;
  title: string;
  config: Record<string, unknown> | null;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AdminDashboardWidgetInsert {
  user_id: string;
  widget_key: string;
  widget_type?: WidgetType;
  title: string;
  config?: Record<string, unknown>;
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
  is_visible?: boolean;
  sort_order?: number;
}

// =========================================================================
// Admin Activity Log
// =========================================================================

export interface AdminActivityLogRecord {
  id: string;
  admin_id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// =========================================================================
// System Health Metrics
// =========================================================================

export interface SystemHealthMetric {
  id: string;
  metric_name: string;
  metric_value: number | null;
  metric_unit: string | null;
  status: SystemHealthStatus;
  threshold_warning: number | null;
  threshold_critical: number | null;
  metadata: Record<string, unknown> | null;
  recorded_at: string;
}

// =========================================================================
// Admin Notifications
// =========================================================================

export interface AdminNotification {
  id: string;
  admin_id: string | null;
  type: string;
  title: string;
  message: string;
  severity: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  action_url: string | null;
  created_at: string;
}

// =========================================================================
// Bulk Operations
// =========================================================================

export interface AdminBulkOperation {
  id: string;
  admin_id: string;
  operation_type: BulkOperationType;
  target_ids: string[];
  parameters: Record<string, unknown> | null;
  status: string;
  total_count: number;
  success_count: number;
  failure_count: number;
  error_details: Array<{ id: string; error: string }>;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface AdminBulkOperationInsert {
  admin_id: string;
  operation_type: BulkOperationType;
  target_ids: string[];
  parameters?: Record<string, unknown>;
}

// =========================================================================
// Admin Preferences
// =========================================================================

export interface AdminPreferences {
  id: string;
  user_id: string;
  theme: string;
  sidebar_collapsed: boolean;
  density: string;
  default_page: string;
  notification_email: boolean;
  notification_push: boolean;
  notification_critical: boolean;
  notification_warning: boolean;
  notification_info: boolean;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface AdminPreferencesUpdate {
  theme?: string;
  sidebar_collapsed?: boolean;
  density?: string;
  default_page?: string;
  notification_email?: boolean;
  notification_push?: boolean;
  notification_critical?: boolean;
  notification_warning?: boolean;
  notification_info?: boolean;
  language?: string;
}

// =========================================================================
// Dashboard Stats
// =========================================================================

export interface DashboardStats {
  total_users: number;
  active_users: number;
  online_users: number;
  new_users_today: number;
  new_users_this_week: number;
  new_users_this_month: number;
  total_listings: number;
  active_listings: number;
  pending_listings: number;
  sold_listings: number;
  expired_listings: number;
  total_revenue: number;
  total_transactions: number;
  pending_reports: number;
  pending_seller_reports: number;
  pending_message_reports: number;
  total_shops: number;
  verified_shops: number;
  total_messages: number;
  total_favorites: number;
  total_offers: number;
  sponsored_active: number;
}

// =========================================================================
// Chart Data
// =========================================================================

export interface ChartDataPoint {
  date: string;
  count: number;
}

// =========================================================================
// Default Widget Keys
// =========================================================================

export const DEFAULT_WIDGETS = [
  { key: 'total_users', type: 'stat' as WidgetType, title: 'Total Users', width: 1, height: 1 },
  { key: 'active_users', type: 'stat' as WidgetType, title: 'Active Users', width: 1, height: 1 },
  { key: 'online_users', type: 'stat' as WidgetType, title: 'Online Now', width: 1, height: 1 },
  { key: 'new_users_today', type: 'stat' as WidgetType, title: 'New Users Today', width: 1, height: 1 },
  { key: 'total_listings', type: 'stat' as WidgetType, title: 'Total Listings', width: 1, height: 1 },
  { key: 'pending_listings', type: 'stat' as WidgetType, title: 'Pending Listings', width: 1, height: 1 },
  { key: 'total_revenue', type: 'stat' as WidgetType, title: 'Total Revenue', width: 1, height: 1 },
  { key: 'pending_reports', type: 'stat' as WidgetType, title: 'Pending Reports', width: 1, height: 1 },
  { key: 'user_growth', type: 'chart' as WidgetType, title: 'User Growth (30 days)', width: 2, height: 1 },
  { key: 'listing_growth', type: 'chart' as WidgetType, title: 'Listing Growth (30 days)', width: 2, height: 1 },
] as const;
