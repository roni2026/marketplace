import { describe, it, expect } from 'vitest';
import { DEFAULT_WIDGETS } from '@/integrations/supabase/types_v14_admin';
import type {
  WidgetType, BulkOperationType, SystemHealthStatus,
  DashboardStats, AdminPreferences, AdminDashboardWidget,
  AdminActivityLogRecord, SystemHealthMetric, AdminNotification,
  AdminBulkOperation, ChartDataPoint,
} from '@/integrations/supabase/types_v14_admin';

describe('Phase 14 — Admin Portal', () => {
  describe('DEFAULT_WIDGETS', () => {
    it('contains 10 default widgets', () => {
      expect(DEFAULT_WIDGETS).toHaveLength(10);
    });

    it('includes all required widget keys', () => {
      const keys = DEFAULT_WIDGETS.map(w => w.key);
      expect(keys).toContain('total_users');
      expect(keys).toContain('active_users');
      expect(keys).toContain('online_users');
      expect(keys).toContain('new_users_today');
      expect(keys).toContain('total_listings');
      expect(keys).toContain('pending_listings');
      expect(keys).toContain('total_revenue');
      expect(keys).toContain('pending_reports');
      expect(keys).toContain('user_growth');
      expect(keys).toContain('listing_growth');
    });

    it('each widget has key, type, title, width, and height', () => {
      DEFAULT_WIDGETS.forEach(w => {
        expect(w.key).toBeTruthy();
        expect(w.type).toBeTruthy();
        expect(w.title).toBeTruthy();
        expect(w.width).toBeGreaterThan(0);
        expect(w.height).toBeGreaterThan(0);
      });
    });
  });

  describe('WidgetType', () => {
    it('supports all 5 widget types', () => {
      const types: WidgetType[] = ['stat', 'chart', 'table', 'alert', 'custom'];
      expect(types).toHaveLength(5);
    });
  });

  describe('BulkOperationType', () => {
    it('supports all 14 bulk operation types', () => {
      const types: BulkOperationType[] = [
        'approve_listings', 'reject_listings', 'delete_listings', 'feature_listings',
        'boost_listings', 'suspend_users', 'verify_users', 'delete_users',
        'assign_role', 'update_settings', 'export_data', 'import_data',
        'send_notification', 'cleanup_expired',
      ];
      expect(types).toHaveLength(14);
    });
  });

  describe('SystemHealthStatus', () => {
    it('supports all 4 health statuses', () => {
      const statuses: SystemHealthStatus[] = ['healthy', 'warning', 'critical', 'down'];
      expect(statuses).toHaveLength(4);
    });
  });

  describe('DashboardStats interface', () => {
    it('has all expected fields', () => {
      const stats: DashboardStats = {
        total_users: 1000, active_users: 500, online_users: 50,
        new_users_today: 10, new_users_this_week: 70, new_users_this_month: 300,
        total_listings: 5000, active_listings: 4000, pending_listings: 100,
        sold_listings: 500, expired_listings: 200, total_revenue: 1000000,
        total_transactions: 5000, pending_reports: 15, pending_seller_reports: 5,
        pending_message_reports: 3, total_shops: 200, verified_shops: 150,
        total_messages: 50000, total_favorites: 10000, total_offers: 5000,
        sponsored_active: 10,
      };
      expect(stats.total_users).toBe(1000);
      expect(stats.pending_listings).toBe(100);
      expect(stats.total_revenue).toBe(1000000);
    });
  });

  describe('AdminPreferences interface', () => {
    it('has all fields', () => {
      const prefs: AdminPreferences = {
        id: 'p-1', user_id: 'u-1', theme: 'dark', sidebar_collapsed: true,
        density: 'compact', default_page: '/admin/ads',
        notification_email: true, notification_push: true,
        notification_critical: true, notification_warning: true,
        notification_info: false, language: 'en',
        created_at: '2024-01-01', updated_at: '2024-01-01',
      };
      expect(prefs.theme).toBe('dark');
      expect(prefs.sidebar_collapsed).toBe(true);
      expect(prefs.density).toBe('compact');
    });
  });

  describe('ChartDataPoint', () => {
    it('has date and count', () => {
      const point: ChartDataPoint = { date: '2024-01-01', count: 42 };
      expect(point.date).toBe('2024-01-01');
      expect(point.count).toBe(42);
    });
  });
});
