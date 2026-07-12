/**
 * Phase 13 — useNotifications Hook
 *
 * Reactive wrapper for the notification system:
 * - Real-time notification updates via Supabase Realtime
 * - Unread count tracking
 * - Notification CRUD (mark read, archive, delete, pin)
 * - Push subscription management
 * - Notification preferences
 * - Quiet hours
 * - Admin notifications
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  type Notification,
  type NotificationPreference,
  type QuietHours,
  type AdminNotification,
  type PushSubscriptionInfo,
  type NotificationCategory,
  type NotificationFrequency,
  getNotifications as libGetNotifications,
  getUnreadCount as libGetUnreadCount,
  markAsRead as libMarkAsRead,
  markAllAsRead as libMarkAllAsRead,
  archiveNotification as libArchiveNotification,
  deleteNotification as libDeleteNotification,
  pinNotification as libPinNotification,
  trackClick as libTrackClick,
  savePushSubscription as libSavePushSubscription,
  removePushSubscription as libRemovePushSubscription,
  getPreferences as libGetPreferences,
  updatePreference as libUpdatePreference,
  initializeDefaultPreferences as libInitPrefs,
  getQuietHours as libGetQuietHours,
  updateQuietHours as libUpdateQuietHours,
  getAdminNotifications as libGetAdminNotifications,
  markAdminNotificationRead as libMarkAdminRead,
  subscribeToNotifications as libSubscribe,
} from '@/lib/notifications';

export function useNotifications(userId?: string) {
  const { user } = useAuth();
  const resolvedUserId = userId ?? user?.id ?? null;
  const userIdRef = useRef(resolvedUserId);
  userIdRef.current = resolvedUserId;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [quietHours, setQuietHours] = useState<QuietHours | null>(null);
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [adminUnreadCount, setAdminUnreadCount] = useState(0);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  const PAGE_SIZE = 20;

  // ---- Fetch notifications ----
  const fetchNotifications = useCallback(async (category: string = 'all', append: boolean = false) => {
    if (!resolvedUserId) return;
    setLoading(true);
    const result = await libGetNotifications(resolvedUserId, category, PAGE_SIZE, append ? offset : 0);
    if (append) {
      setNotifications(prev => [...prev, ...result.notifications]);
    } else {
      setNotifications(result.notifications);
      setOffset(0);
    }
    setHasMore(result.hasMore);
    setLoading(false);
  }, [resolvedUserId, offset]);

  // ---- Fetch unread count ----
  const fetchUnreadCount = useCallback(async () => {
    if (!resolvedUserId) return;
    const count = await libGetUnreadCount(resolvedUserId);
    setUnreadCount(count);
  }, [resolvedUserId]);

  // ---- Mark as read ----
  const markAsRead = useCallback(async (id: string) => {
    if (!resolvedUserId) return;
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    await libMarkAsRead(id, resolvedUserId);
  }, [resolvedUserId]);

  // ---- Mark all as read ----
  const markAllAsRead = useCallback(async (category?: string) => {
    if (!resolvedUserId) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
    setUnreadCount(0);
    await libMarkAllAsRead(resolvedUserId, category ?? 'all');
  }, [resolvedUserId]);

  // ---- Archive ----
  const archiveNotification = useCallback(async (id: string) => {
    if (!resolvedUserId) return;
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_archived: true, archived_at: new Date().toISOString() } : n));
    await libArchiveNotification(id, resolvedUserId);
  }, [resolvedUserId]);

  // ---- Delete ----
  const deleteNotification = useCallback(async (id: string) => {
    if (!resolvedUserId) return;
    setNotifications(prev => prev.filter(n => n.id !== id));
    await libDeleteNotification(id, resolvedUserId);
  }, [resolvedUserId]);

  // ---- Pin ----
  const pinNotification = useCallback(async (id: string, pinned: boolean) => {
    if (!resolvedUserId) return;
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_pinned: pinned } : n));
    await libPinNotification(id, resolvedUserId, pinned);
  }, [resolvedUserId]);

  // ---- Track click ----
  const trackClick = useCallback(async (id: string) => {
    await libTrackClick(id);
  }, []);

  // ---- Push subscriptions ----
  const savePushSubscription = useCallback(async (sub: PushSubscriptionInfo) => {
    if (!resolvedUserId) return false;
    return libSavePushSubscription(resolvedUserId, sub);
  }, [resolvedUserId]);

  const removePushSubscription = useCallback(async (endpoint: string) => {
    return libRemovePushSubscription(endpoint);
  }, []);

  // ---- Preferences ----
  const fetchPreferences = useCallback(async () => {
    if (!resolvedUserId) return;
    await libInitPrefs(resolvedUserId);
    const prefs = await libGetPreferences(resolvedUserId);
    setPreferences(prefs);
  }, [resolvedUserId]);

  const updatePreference = useCallback(async (category: NotificationCategory, updates: Partial<NotificationPreference>) => {
    if (!resolvedUserId) return;
    setPreferences(prev => prev.map(p => p.category === category ? { ...p, ...updates } : p));
    await libUpdatePreference(resolvedUserId, category, updates);
  }, [resolvedUserId]);

  // ---- Quiet hours ----
  const fetchQuietHours = useCallback(async () => {
    if (!resolvedUserId) return;
    const qh = await libGetQuietHours(resolvedUserId);
    setQuietHours(qh);
  }, [resolvedUserId]);

  const updateQuietHours = useCallback(async (updates: Partial<QuietHours>) => {
    if (!resolvedUserId) return;
    setQuietHours(prev => prev ? { ...prev, ...updates } : prev);
    await libUpdateQuietHours(resolvedUserId, updates);
  }, [resolvedUserId]);

  // ---- Admin notifications ----
  const fetchAdminNotifications = useCallback(async () => {
    if (!resolvedUserId) return;
    const notifs = await libGetAdminNotifications(resolvedUserId);
    setAdminNotifications(notifs);
    setAdminUnreadCount(notifs.filter(n => !n.is_read).length);
  }, [resolvedUserId]);

  const markAdminNotificationRead = useCallback(async (id: string) => {
    setAdminNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n));
    setAdminUnreadCount(prev => Math.max(0, prev - 1));
    await libMarkAdminRead(id);
  }, []);

  // ---- Load more (infinite scroll) ----
  const loadMore = useCallback(async (category: string = 'all') => {
    if (!hasMore || loading) return;
    const newOffset = offset + PAGE_SIZE;
    setOffset(newOffset);
    const result = await libGetNotifications(resolvedUserId!, category, PAGE_SIZE, newOffset);
    setNotifications(prev => [...prev, ...result.notifications]);
    setHasMore(result.hasMore);
  }, [resolvedUserId, offset, hasMore, loading]);

  // ---- Realtime subscription ----
  const subscribeToRealtime = useCallback(() => {
    if (!resolvedUserId) return;
    const unsubscribe = libSubscribe(
      resolvedUserId,
      // onInsert
      (notif) => {
        setNotifications(prev => [notif, ...prev]);
        if (!notif.is_read) setUnreadCount(prev => prev + 1);
      },
      // onUpdate
      (notif) => {
        setNotifications(prev => prev.map(n => n.id === notif.id ? notif : n));
        setUnreadCount(prev => prev + (notif.is_read ? -1 : 1));
      },
      // onDelete
      (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      },
    );
    setIsRealtimeConnected(true);
    return unsubscribe;
  }, [resolvedUserId]);

  // ---- Auto-init effects ----
  useEffect(() => {
    if (!resolvedUserId) return;
    fetchUnreadCount();
    fetchPreferences();
    fetchQuietHours();
  }, [resolvedUserId, fetchUnreadCount, fetchPreferences, fetchQuietHours]);

  useEffect(() => {
    if (!resolvedUserId) return;
    const unsubscribe = subscribeToRealtime();
    return () => {
      if (unsubscribe) {
        unsubscribe();
        setIsRealtimeConnected(false);
      }
    };
  }, [resolvedUserId, subscribeToRealtime]);

  return {
    // State
    notifications,
    unreadCount,
    loading,
    hasMore,
    preferences,
    quietHours,
    adminNotifications,
    adminUnreadCount,
    isRealtimeConnected,

    // Functions
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    deleteNotification,
    pinNotification,
    trackClick,
    savePushSubscription,
    removePushSubscription,
    fetchPreferences,
    updatePreference,
    fetchQuietHours,
    updateQuietHours,
    fetchAdminNotifications,
    markAdminNotificationRead,
    loadMore,
    subscribeToRealtime,
  };
}
