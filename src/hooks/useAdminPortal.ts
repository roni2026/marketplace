/**
 * Phase 14 — Admin Portal Hook
 *
 * Reactive wrapper for all Phase 14 admin portal features:
 * - Dashboard stats and charts
 * - Customizable dashboard widgets
 * - Admin activity log
 * - System health metrics
 * - Admin notifications
 * - Bulk operations
 * - Admin preferences
 * - Admin search
 * - Quick actions
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  getDashboardStats, getUserGrowthChart, getListingGrowthChart,
  getDashboardWidgets, initializeDefaultWidgets, updateWidget,
  toggleWidgetVisibility, deleteWidget, addWidget, resetDashboard,
  logAdminActivity, getAdminActivityLog, getAdminActivityCount,
  getSystemHealthMetrics, getSystemHealthSummary,
  getAdminNotifications, markAdminNotificationRead, markAllAdminNotificationsRead,
  getUnreadAdminNotificationCount,
  executeBulkOperation, getBulkOperations,
  getAdminPreferences, updateAdminPreferences,
  adminSearch,
  getSystemSettings, updateSystemSetting,
  exportData, downloadExport,
  quickApproveListing, quickRejectListing, quickSuspendUser, quickUnsuspendUser,
  quickVerifyUser, quickFeatureListing, quickBoostListing,
} from '@/lib/adminPortal';
import type {
  AdminDashboardWidget, AdminDashboardWidgetInsert,
  AdminActivityLogRecord, SystemHealthMetric,
  AdminNotification, AdminBulkOperation, AdminBulkOperationInsert,
  AdminPreferences, AdminPreferencesUpdate,
  DashboardStats, ChartDataPoint, BulkOperationType,
} from '@/integrations/supabase/types_v14_admin';

export function useAdminPortal() {
  const { user } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [userGrowth, setUserGrowth] = useState<ChartDataPoint[]>([]);
  const [listingGrowth, setListingGrowth] = useState<ChartDataPoint[]>([]);
  const [widgets, setWidgets] = useState<AdminDashboardWidget[]>([]);
  const [activityLog, setActivityLog] = useState<AdminActivityLogRecord[]>([]);
  const [activityCount, setActivityCount] = useState(0);
  const [healthMetrics, setHealthMetrics] = useState<SystemHealthMetric[]>([]);
  const [healthStatus, setHealthStatus] = useState('healthy');
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [bulkOperations, setBulkOperations] = useState<AdminBulkOperation[]>([]);
  const [preferences, setPreferences] = useState<AdminPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dashboard
  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const [statsData, userGrowthData, listingGrowthData, widgetsData] = await Promise.all([
      getDashboardStats(),
      getUserGrowthChart(30),
      getListingGrowthChart(30),
      getDashboardWidgets(user.id),
    ]);
    setStats(statsData);
    setUserGrowth(userGrowthData);
    setListingGrowth(listingGrowthData);
    if (widgetsData.length === 0) {
      await initializeDefaultWidgets(user.id);
      const newWidgets = await getDashboardWidgets(user.id);
      setWidgets(newWidgets);
    } else {
      setWidgets(widgetsData);
    }
    setIsLoading(false);
  }, [user]);

  // Widgets
  const handleUpdateWidget = useCallback(async (id: string, updates: Partial<AdminDashboardWidget>) => {
    const success = await updateWidget(id, updates);
    if (success && user) {
      const data = await getDashboardWidgets(user.id);
      setWidgets(data);
    }
    return success;
  }, [user]);

  const handleToggleWidget = useCallback(async (id: string, visible: boolean) => {
    return handleUpdateWidget(id, { is_visible: visible });
  }, [handleUpdateWidget]);

  const handleDeleteWidget = useCallback(async (id: string) => {
    const success = await deleteWidget(id);
    if (success) setWidgets(prev => prev.filter(w => w.id !== id));
    return success;
  }, []);

  const handleAddWidget = useCallback(async (widget: AdminDashboardWidgetInsert) => {
    const result = await addWidget(widget);
    if (result && user) {
      const data = await getDashboardWidgets(user.id);
      setWidgets(data);
    }
    return result;
  }, [user]);

  const handleResetDashboard = useCallback(async () => {
    if (!user) return false;
    const success = await resetDashboard(user.id);
    if (success) {
      const data = await getDashboardWidgets(user.id);
      setWidgets(data);
    }
    return success;
  }, [user]);

  // Activity Log
  const fetchActivityLog = useCallback(async (limit?: number, offset?: number) => {
    const data = await getAdminActivityLog(limit || 50, offset || 0);
    setActivityLog(data);
    const count = await getAdminActivityCount();
    setActivityCount(count);
  }, []);

  // Health
  const fetchHealthMetrics = useCallback(async () => {
    const summary = await getSystemHealthSummary();
    setHealthMetrics(summary.metrics);
    setHealthStatus(summary.status);
  }, []);

  // Notifications
  const fetchNotifications = useCallback(async (unreadOnly?: boolean) => {
    if (!user) return;
    const data = await getAdminNotifications(user.id, unreadOnly);
    setNotifications(data);
    const count = await getUnreadAdminNotificationCount(user.id);
    setUnreadNotifications(count);
  }, [user]);

  const handleMarkNotificationRead = useCallback(async (id: string) => {
    await markAdminNotificationRead(id);
    if (user) fetchNotifications();
  }, [user, fetchNotifications]);

  const handleMarkAllNotificationsRead = useCallback(async () => {
    if (!user) return;
    await markAllAdminNotificationsRead(user.id);
    fetchNotifications();
  }, [user, fetchNotifications]);

  // Bulk Operations
  const handleBulkOperation = useCallback(async (
    operationType: BulkOperationType,
    targetIds: string[],
    parameters?: Record<string, unknown>
  ): Promise<AdminBulkOperation | null> => {
    if (!user) return null;
    const result = await executeBulkOperation(user.id, operationType, targetIds, parameters);
    if (result) {
      const ops = await getBulkOperations(user.id);
      setBulkOperations(ops);
    }
    return result;
  }, [user]);

  const fetchBulkOperations = useCallback(async () => {
    if (!user) return;
    const data = await getBulkOperations(user.id);
    setBulkOperations(data);
  }, [user]);

  // Preferences
  const fetchPreferences = useCallback(async () => {
    if (!user) return;
    const data = await getAdminPreferences(user.id);
    setPreferences(data);
  }, [user]);

  const handleUpdatePreferences = useCallback(async (updates: AdminPreferencesUpdate) => {
    if (!user) return null;
    const result = await updateAdminPreferences(user.id, updates);
    if (result) setPreferences(result);
    return result;
  }, [user]);

  // Search
  const handleSearch = useCallback(async (query: string) => {
    return adminSearch(query);
  }, []);

  // Quick Actions
  const handleQuickApprove = useCallback(async (adId: string) => {
    if (!user) return false;
    return quickApproveListing(adId, user.id);
  }, [user]);

  const handleQuickReject = useCallback(async (adId: string, reason?: string) => {
    if (!user) return false;
    return quickRejectListing(adId, user.id, reason);
  }, [user]);

  const handleQuickSuspend = useCallback(async (userId: string, reason?: string) => {
    if (!user) return false;
    return quickSuspendUser(userId, user.id, reason);
  }, [user]);

  const handleQuickUnsuspend = useCallback(async (userId: string) => {
    if (!user) return false;
    return quickUnsuspendUser(userId, user.id);
  }, [user]);

  const handleQuickVerify = useCallback(async (userId: string) => {
    if (!user) return false;
    return quickVerifyUser(userId, user.id);
  }, [user]);

  const handleQuickFeature = useCallback(async (adId: string) => {
    if (!user) return false;
    return quickFeatureListing(adId, user.id);
  }, [user]);

  const handleQuickBoost = useCallback(async (adId: string, days?: number) => {
    if (!user) return false;
    return quickBoostListing(adId, user.id, days);
  }, [user]);

  // Log activity helper
  const handleLogActivity = useCallback(async (action: string, resourceType?: string, resourceId?: string, details?: Record<string, unknown>) => {
    if (!user) return;
    await logAdminActivity(user.id, action, resourceType, resourceId, details);
  }, [user]);

  return {
    // State
    stats, userGrowth, listingGrowth, widgets, activityLog, activityCount,
    healthMetrics, healthStatus, notifications, unreadNotifications,
    bulkOperations, preferences, isLoading, error,

    // Dashboard
    fetchDashboardData,

    // Widgets
    updateWidget: handleUpdateWidget, toggleWidget: handleToggleWidget,
    deleteWidget: handleDeleteWidget, addWidget: handleAddWidget,
    resetDashboard: handleResetDashboard,

    // Activity Log
    fetchActivityLog, logActivity: handleLogActivity,

    // Health
    fetchHealthMetrics,

    // Notifications
    fetchNotifications, markNotificationRead: handleMarkNotificationRead,
    markAllNotificationsRead: handleMarkAllNotificationsRead,

    // Bulk Operations
    bulkOperation: handleBulkOperation, fetchBulkOperations,

    // Preferences
    fetchPreferences, updatePreferences: handleUpdatePreferences,

    // Search
    adminSearch: handleSearch,

    // Settings
    getSystemSettings, updateSystemSetting,

    // Export
    exportData, downloadExport,

    // Quick Actions
    quickApprove: handleQuickApprove, quickReject: handleQuickReject,
    quickSuspend: handleQuickSuspend, quickUnsuspend: handleQuickUnsuspend,
    quickVerify: handleQuickVerify, quickFeature: handleQuickFeature,
    quickBoost: handleQuickBoost,
  };
}
