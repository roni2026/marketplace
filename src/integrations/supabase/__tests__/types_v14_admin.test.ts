import { describe, it, expect } from 'vitest';
import type {
  AdminDashboardWidget, AdminActivityLogRecord, SystemHealthMetric,
  AdminNotification, AdminBulkOperation, AdminPreferences,
  ChartDataPoint, WidgetType, BulkOperationType, SystemHealthStatus,
} from '@/integrations/supabase/types_v14_admin';
import { DEFAULT_WIDGETS } from '@/integrations/supabase/types_v14_admin';

describe('Phase 14 Type Definitions', () => {
  it('AdminDashboardWidget has all fields', () => {
    const w: AdminDashboardWidget = {
      id: 'w-1', user_id: 'u-1', widget_key: 'total_users',
      widget_type: 'stat', title: 'Total Users', config: null,
      position_x: 0, position_y: 0, width: 1, height: 1,
      is_visible: true, sort_order: 0,
      created_at: '2024-01-01', updated_at: '2024-01-01',
    };
    expect(w.widget_key).toBe('total_users');
    expect(w.widget_type).toBe('stat');
  });

  it('AdminActivityLogRecord has all fields', () => {
    const log: AdminActivityLogRecord = {
      id: 'l-1', admin_id: 'u-1', action: 'approve_listing',
      resource_type: 'ad', resource_id: 'ad-1',
      details: { reason: 'ok' }, ip_address: '127.0.0.1',
      user_agent: 'browser', created_at: '2024-01-01',
    };
    expect(log.action).toBe('approve_listing');
  });

  it('SystemHealthMetric has all fields', () => {
    const m: SystemHealthMetric = {
      id: 'm-1', metric_name: 'cpu_usage', metric_value: 45.5,
      metric_unit: '%', status: 'healthy',
      threshold_warning: 70, threshold_critical: 90,
      metadata: null, recorded_at: '2024-01-01',
    };
    expect(m.status).toBe('healthy');
  });

  it('AdminNotification has all fields', () => {
    const n: AdminNotification = {
      id: 'n-1', admin_id: 'u-1', type: 'alert', title: 'Test',
      message: 'Test message', severity: 'info', data: null,
      is_read: false, read_at: null, action_url: '/admin',
      created_at: '2024-01-01',
    };
    expect(n.is_read).toBe(false);
  });

  it('AdminBulkOperation has all fields', () => {
    const op: AdminBulkOperation = {
      id: 'op-1', admin_id: 'u-1', operation_type: 'approve_listings',
      target_ids: ['ad-1', 'ad-2'], parameters: null, status: 'completed',
      total_count: 2, success_count: 2, failure_count: 0,
      error_details: [], started_at: '2024-01-01', completed_at: '2024-01-01',
      created_at: '2024-01-01',
    };
    expect(op.operation_type).toBe('approve_listings');
    expect(op.success_count).toBe(2);
  });

  it('AdminPreferences has all fields', () => {
    const p: AdminPreferences = {
      id: 'p-1', user_id: 'u-1', theme: 'dark', sidebar_collapsed: true,
      density: 'compact', default_page: '/admin/ads',
      notification_email: true, notification_push: true,
      notification_critical: true, notification_warning: true,
      notification_info: false, language: 'en',
      created_at: '2024-01-01', updated_at: '2024-01-01',
    };
    expect(p.theme).toBe('dark');
    expect(p.density).toBe('compact');
  });

  it('ChartDataPoint has date and count', () => {
    const p: ChartDataPoint = { date: '2024-01-01', count: 42 };
    expect(p.date).toBe('2024-01-01');
    expect(p.count).toBe(42);
  });

  it('WidgetType supports all 5 types', () => {
    const types: WidgetType[] = ['stat', 'chart', 'table', 'alert', 'custom'];
    expect(types).toHaveLength(5);
  });

  it('BulkOperationType supports all 14 types', () => {
    const types: BulkOperationType[] = [
      'approve_listings', 'reject_listings', 'delete_listings', 'feature_listings',
      'boost_listings', 'suspend_users', 'verify_users', 'delete_users',
      'assign_role', 'update_settings', 'export_data', 'import_data',
      'send_notification', 'cleanup_expired',
    ];
    expect(types).toHaveLength(14);
  });

  it('SystemHealthStatus supports all 4 statuses', () => {
    const statuses: SystemHealthStatus[] = ['healthy', 'warning', 'critical', 'down'];
    expect(statuses).toHaveLength(4);
  });

  it('DEFAULT_WIDGETS has 10 entries', () => {
    expect(DEFAULT_WIDGETS).toHaveLength(10);
  });

  it('DEFAULT_WIDGETS entries have correct structure', () => {
    DEFAULT_WIDGETS.forEach(w => {
      expect(w.key).toBeTruthy();
      expect(w.type).toBeTruthy();
      expect(w.title).toBeTruthy();
      expect(w.width).toBeGreaterThan(0);
      expect(w.height).toBeGreaterThan(0);
    });
  });
});
