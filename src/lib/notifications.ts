/**
 * Phase 13 — Notifications & Communication System Library
 *
 * Comprehensive notification utilities:
 * - Notification CRUD (create, read, update, delete, archive, pin)
 * - Realtime subscriptions via Supabase
 * - Push subscriptions (Web Push)
 * - Notification preferences (per category, per channel)
 * - Quiet hours
 * - Email/SMS/Delivery logs
 * - Admin notifications
 * - Notification templates with variable interpolation
 * - Summary/digest queue
 * - Helper functions (time formatting, icon mapping, color mapping)
 */

import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

// =========================================================================
// Types
// =========================================================================

export type NotificationCategory =
  | 'account' | 'listings' | 'offers' | 'messages' | 'saved_searches'
  | 'wishlist' | 'reviews' | 'orders' | 'payments' | 'delivery'
  | 'system' | 'security' | 'promotions' | 'admin';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationChannel = 'in_app' | 'push' | 'email' | 'sms';
export type NotificationFrequency = 'instant' | 'daily' | 'weekly' | 'disabled';
export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'bounced';

export interface Notification {
  id: string;
  user_id: string;
  category: NotificationCategory;
  notification_type: string;
  title: string;
  body: string | null;
  data: Record<string, any>;
  priority: NotificationPriority;
  is_read: boolean;
  is_archived: boolean;
  is_deleted: boolean;
  is_pinned: boolean;
  is_important: boolean;
  action_url: string | null;
  action_label: string | null;
  icon: string | null;
  image_url: string | null;
  related_listing_id: string | null;
  related_chat_id: string | null;
  related_order_id: string | null;
  related_offer_id: string | null;
  related_review_id: string | null;
  click_count: number;
  read_at: string | null;
  archived_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  category: NotificationCategory;
  in_app_enabled: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  frequency: NotificationFrequency;
  created_at: string;
  updated_at: string;
}

export interface QuietHours {
  id: string;
  user_id: string;
  is_enabled: boolean;
  start_time: string;
  end_time: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string | null;
  auth_key: string | null;
  platform: string;
  device_info: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PushSubscriptionInfo {
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  platform?: string;
  device_info?: Record<string, any>;
}

export interface EmailLog {
  id: string;
  user_id: string | null;
  notification_id: string | null;
  to_email: string;
  subject: string;
  html_body: string | null;
  template_key: string | null;
  status: DeliveryStatus;
  error_message: string | null;
  provider_message_id: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  created_at: string;
}

export interface SMSLog {
  id: string;
  user_id: string | null;
  notification_id: string | null;
  to_phone: string;
  message: string;
  template_key: string | null;
  status: DeliveryStatus;
  error_message: string | null;
  provider_message_id: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

export interface DeliveryLog {
  id: string;
  notification_id: string;
  channel: NotificationChannel;
  status: DeliveryStatus;
  provider: string | null;
  provider_message_id: string | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  scheduled_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
}

export interface AdminNotification {
  id: string;
  admin_id: string | null;
  notification_type: string;
  title: string;
  message: string;
  severity: string;
  data: Record<string, any>;
  is_read: boolean;
  read_at: string | null;
  action_url: string | null;
  created_at: string;
}

export interface NotificationTemplate {
  id: string;
  template_key: string;
  category: NotificationCategory;
  title_template: string;
  body_template: string;
  email_subject: string | null;
  email_html: string | null;
  sms_template: string | null;
  push_title: string | null;
  push_body: string | null;
  icon: string | null;
  action_url_pattern: string | null;
  action_label: string | null;
  language: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationSummary {
  total: number;
  unread: number;
  by_category: Record<string, number>;
  by_priority: Record<string, number>;
}

export interface NotificationListResult {
  notifications: Notification[];
  hasMore: boolean;
}

export interface SummaryQueueEntry {
  id: string;
  user_id: string;
  frequency: NotificationFrequency;
  notification_ids: string[];
  summary_data: Record<string, any>;
  status: string;
  scheduled_for: string | null;
  sent_at: string | null;
  created_at: string;
}

// =========================================================================
// Notification CRUD
// =========================================================================

export async function createNotification(params: {
  user_id: string;
  category: NotificationCategory;
  notification_type: string;
  title: string;
  body?: string;
  data?: Record<string, any>;
  priority?: NotificationPriority;
  action_url?: string;
  action_label?: string;
  icon?: string;
  image_url?: string;
  related_listing_id?: string;
  related_chat_id?: string;
  related_order_id?: string;
  related_offer_id?: string;
  related_review_id?: string;
  is_important?: boolean;
}): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('create_notification', {
      p_user_id: params.user_id,
      p_category: params.category,
      p_notification_type: params.notification_type,
      p_title: params.title,
      p_body: params.body ?? null,
      p_data: params.data ?? {},
      p_priority: params.priority ?? 'normal',
      p_action_url: params.action_url ?? null,
      p_action_label: params.action_label ?? null,
      p_icon: params.icon ?? null,
      p_image_url: params.image_url ?? null,
      p_related_listing_id: params.related_listing_id ?? null,
      p_related_chat_id: params.related_chat_id ?? null,
      p_related_order_id: params.related_order_id ?? null,
      p_related_offer_id: params.related_offer_id ?? null,
      p_related_review_id: params.related_review_id ?? null,
      p_is_important: params.is_important ?? false,
    });
    if (error) { console.error('createNotification:', error); return null; }
    return data as string;
  } catch (err) {
    console.error('createNotification:', err);
    return null;
  }
}

export async function getNotifications(
  userId: string,
  category: string = 'all',
  limit: number = 20,
  offset: number = 0,
): Promise<NotificationListResult> {
  try {
    const { data, error } = await supabase.rpc('get_notifications_by_category', {
      p_user_id: userId,
      p_category: category,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) { console.error('getNotifications:', error); return { notifications: [], hasMore: false }; }
    const notifications = (data as Notification[]) || [];
    return { notifications, hasMore: notifications.length === limit };
  } catch (err) {
    console.error('getNotifications:', err);
    return { notifications: [], hasMore: false };
  }
}

export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_unread_notification_count', { p_user_id: userId });
    if (error) { console.error('getUnreadCount:', error); return 0; }
    return (data as number) || 0;
  } catch (err) {
    console.error('getUnreadCount:', err);
    return 0;
  }
}

export async function markAsRead(notificationId: string, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('mark_notification_read', {
      p_notification_id: notificationId,
      p_user_id: userId,
    });
    if (error) { console.error('markAsRead:', error); return false; }
    return data as boolean;
  } catch (err) {
    console.error('markAsRead:', err);
    return false;
  }
}

export async function markAllAsRead(userId: string, category: string = 'all'): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('mark_all_notifications_read', {
      p_user_id: userId,
      p_category: category,
    });
    if (error) { console.error('markAllAsRead:', error); return 0; }
    return (data as number) || 0;
  } catch (err) {
    console.error('markAllAsRead:', err);
    return 0;
  }
}

export async function archiveNotification(notificationId: string, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('archive_notification', {
      p_notification_id: notificationId,
      p_user_id: userId,
    });
    if (error) { console.error('archiveNotification:', error); return false; }
    return data as boolean;
  } catch (err) {
    console.error('archiveNotification:', err);
    return false;
  }
}

export async function deleteNotification(notificationId: string, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('delete_notification', {
      p_notification_id: notificationId,
      p_user_id: userId,
    });
    if (error) { console.error('deleteNotification:', error); return false; }
    return data as boolean;
  } catch (err) {
    console.error('deleteNotification:', err);
    return false;
  }
}

export async function pinNotification(notificationId: string, userId: string, pinned: boolean): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('pin_notification', {
      p_notification_id: notificationId,
      p_user_id: userId,
      p_pin: pinned,
    });
    if (error) { console.error('pinNotification:', error); return false; }
    return data as boolean;
  } catch (err) {
    console.error('pinNotification:', err);
    return false;
  }
}

export async function trackClick(notificationId: string): Promise<void> {
  try {
    await supabase.rpc('track_notification_click', { p_notification_id: notificationId });
  } catch (err) {
    console.error('trackClick:', err);
  }
}

// =========================================================================
// Realtime subscriptions
// =========================================================================

export function subscribeToNotifications(
  userId: string,
  onInsert: (notification: Notification) => void,
  onUpdate: (notification: Notification) => void,
  onDelete: (id: string) => void,
): () => void {
  const channelName = `notifications:${userId}`;
  try { supabase.removeChannel(supabase.channel(channelName)); } catch {}
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      (payload) => onInsert(payload.new as Notification),
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      (payload) => onUpdate(payload.new as Notification),
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      (payload) => onDelete(payload.old.id as string),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// =========================================================================
// Push subscriptions
// =========================================================================

export async function savePushSubscription(userId: string, sub: PushSubscriptionInfo): Promise<boolean> {
  try {
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh_key: sub.p256dh_key,
      auth_key: sub.auth_key,
      platform: sub.platform ?? 'web',
      device_info: sub.device_info ?? {},
      is_active: true,
    });
    if (error) { console.error('savePushSubscription:', error); return false; }
    return true;
  } catch (err) {
    console.error('savePushSubscription:', err);
    return false;
  }
}

export async function removePushSubscription(endpoint: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
    if (error) { console.error('removePushSubscription:', error); return false; }
    return true;
  } catch (err) {
    console.error('removePushSubscription:', err);
    return false;
  }
}

export async function getPushSubscriptions(userId: string): Promise<PushSubscription[]> {
  try {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);
    if (error) { console.error('getPushSubscriptions:', error); return []; }
    return (data as PushSubscription[]) || [];
  } catch (err) {
    console.error('getPushSubscriptions:', err);
    return [];
  }
}

// =========================================================================
// Notification preferences
// =========================================================================

const ALL_CATEGORIES: NotificationCategory[] = [
  'account', 'listings', 'offers', 'messages', 'saved_searches',
  'wishlist', 'reviews', 'orders', 'payments', 'delivery',
  'system', 'security', 'promotions',
];

export async function getPreferences(userId: string): Promise<NotificationPreference[]> {
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId);
    if (error) { console.error('getPreferences:', error); return []; }
    return (data as NotificationPreference[]) || [];
  } catch (err) {
    console.error('getPreferences:', err);
    return [];
  }
}

export async function updatePreference(
  userId: string,
  category: NotificationCategory,
  updates: Partial<NotificationPreference>,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notification_preferences')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('category', category);
    if (error) { console.error('updatePreference:', error); return false; }
    return true;
  } catch (err) {
    console.error('updatePreference:', err);
    return false;
  }
}

export async function initializeDefaultPreferences(userId: string): Promise<void> {
  try {
    const existing = await getPreferences(userId);
    if (existing.length > 0) return;
    const defaults = ALL_CATEGORIES.map((category) => ({
      user_id: userId,
      category,
      in_app_enabled: true,
      push_enabled: category !== 'promotions',
      email_enabled: ['account', 'security', 'listings', 'offers', 'orders', 'payments', 'delivery'].includes(category),
      sms_enabled: ['security', 'orders', 'payments', 'delivery'].includes(category),
      frequency: 'instant' as NotificationFrequency,
    }));
    const { error } = await supabase.from('notification_preferences').insert(defaults);
    if (error) console.error('initializeDefaultPreferences:', error);
  } catch (err) {
    console.error('initializeDefaultPreferences:', err);
  }
}

// =========================================================================
// Quiet hours
// =========================================================================

export async function getQuietHours(userId: string): Promise<QuietHours | null> {
  try {
    const { data, error } = await supabase
      .from('quiet_hours')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) { console.error('getQuietHours:', error); return null; }
    if (!data) {
      // Create default
      const { data: newData, error: insertError } = await supabase
        .from('quiet_hours')
        .insert({ user_id: userId, is_enabled: false, start_time: '22:00', end_time: '07:00', timezone: 'Asia/Dhaka' })
        .select()
        .single();
      if (insertError) { console.error('getQuietHours insert:', insertError); return null; }
      return newData as QuietHours;
    }
    return data as QuietHours;
  } catch (err) {
    console.error('getQuietHours:', err);
    return null;
  }
}

export async function updateQuietHours(userId: string, updates: Partial<QuietHours>): Promise<boolean> {
  try {
    await getQuietHours(userId); // Ensure exists
    const { error } = await supabase
      .from('quiet_hours')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    if (error) { console.error('updateQuietHours:', error); return false; }
    return true;
  } catch (err) {
    console.error('updateQuietHours:', err);
    return false;
  }
}

export async function isInQuietHours(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_in_quiet_hours', { p_user_id: userId });
    if (error) { console.error('isInQuietHours:', error); return false; }
    return data as boolean;
  } catch (err) {
    console.error('isInQuietHours:', err);
    return false;
  }
}

// =========================================================================
// Email logs
// =========================================================================

export async function getEmailLogs(userId: string, limit: number = 20, offset: number = 0): Promise<EmailLog[]> {
  try {
    const { data, error } = await supabase
      .from('email_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) { console.error('getEmailLogs:', error); return []; }
    return (data as EmailLog[]) || [];
  } catch (err) {
    console.error('getEmailLogs:', err);
    return [];
  }
}

// =========================================================================
// SMS logs
// =========================================================================

export async function getSMSLogs(userId: string, limit: number = 20, offset: number = 0): Promise<SMSLog[]> {
  try {
    const { data, error } = await supabase
      .from('sms_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) { console.error('getSMSLogs:', error); return []; }
    return (data as SMSLog[]) || [];
  } catch (err) {
    console.error('getSMSLogs:', err);
    return [];
  }
}

// =========================================================================
// Delivery logs
// =========================================================================

export async function getDeliveryLogs(
  notificationId: string,
  channel?: NotificationChannel,
  status?: DeliveryStatus,
): Promise<DeliveryLog[]> {
  try {
    let query = supabase
      .from('notification_delivery_logs')
      .select('*')
      .eq('notification_id', notificationId)
      .order('created_at', { ascending: false });
    if (channel) query = query.eq('channel', channel);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) { console.error('getDeliveryLogs:', error); return []; }
    return (data as DeliveryLog[]) || [];
  } catch (err) {
    console.error('getDeliveryLogs:', err);
    return [];
  }
}

// =========================================================================
// Admin notifications
// =========================================================================

export async function getAdminNotifications(adminId: string, limit: number = 20): Promise<AdminNotification[]> {
  try {
    const { data, error } = await supabase
      .from('admin_notifications_v13')
      .select('*')
      .or(`admin_id.eq.${adminId},admin_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) { console.error('getAdminNotifications:', error); return []; }
    return (data as AdminNotification[]) || [];
  } catch (err) {
    console.error('getAdminNotifications:', err);
    return [];
  }
}

export async function markAdminNotificationRead(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('admin_notifications_v13')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { console.error('markAdminNotificationRead:', error); return false; }
    return true;
  } catch (err) {
    console.error('markAdminNotificationRead:', err);
    return false;
  }
}

export async function createAdminNotification(
  type: string,
  title: string,
  message: string,
  severity: string = 'info',
  data?: Record<string, any>,
  actionUrl?: string,
): Promise<string | null> {
  try {
    const { data: result, error } = await supabase.rpc('create_admin_notification_v13', {
      p_notification_type: type,
      p_title: title,
      p_message: message,
      p_severity: severity,
      p_data: data ?? {},
      p_action_url: actionUrl ?? null,
    });
    if (error) { console.error('createAdminNotification:', error); return null; }
    return result as string;
  } catch (err) {
    console.error('createAdminNotification:', err);
    return null;
  }
}

// =========================================================================
// Notification templates
// =========================================================================

export async function getTemplate(templateKey: string, language: string = 'en'): Promise<NotificationTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('template_key', templateKey)
      .eq('language', language)
      .eq('is_active', true)
      .maybeSingle();
    if (error) { console.error('getTemplate:', error); return null; }
    return data as NotificationTemplate;
  } catch (err) {
    console.error('getTemplate:', err);
    return null;
  }
}

export async function getTemplatesByCategory(category: NotificationCategory): Promise<NotificationTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .order('template_key');
    if (error) { console.error('getTemplatesByCategory:', error); return []; }
    return (data as NotificationTemplate[]) || [];
  } catch (err) {
    console.error('getTemplatesByCategory:', err);
    return [];
  }
}

export function renderTemplate(template: string, variables: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = variables[key];
    return value !== undefined ? String(value) : '';
  });
}

// =========================================================================
// Summary / Digest
// =========================================================================

export async function getNotificationSummary(userId: string): Promise<NotificationSummary> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('category, priority, is_read')
      .eq('user_id', userId)
      .eq('is_deleted', false);
    if (error) { console.error('getNotificationSummary:', error); return { total: 0, unread: 0, by_category: {}, by_priority: {} }; }
    const rows = data || [];
    const byCategory: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let unread = 0;
    for (const row of rows) {
      byCategory[row.category] = (byCategory[row.category] || 0) + 1;
      byPriority[row.priority] = (byPriority[row.priority] || 0) + 1;
      if (!row.is_read) unread++;
    }
    return { total: rows.length, unread, by_category: byCategory, by_priority: byPriority };
  } catch (err) {
    console.error('getNotificationSummary:', err);
    return { total: 0, unread: 0, by_category: {}, by_priority: {} };
  }
}

export async function createSummaryQueueEntry(
  userId: string,
  frequency: NotificationFrequency,
  notificationIds: string[],
  scheduledFor?: string,
): Promise<boolean> {
  try {
    const { error } = await supabase.from('notification_summary_queue').insert({
      user_id: userId,
      frequency,
      notification_ids: notificationIds,
      scheduled_for: scheduledFor ?? new Date().toISOString(),
      status: 'pending',
    });
    if (error) { console.error('createSummaryQueueEntry:', error); return false; }
    return true;
  } catch (err) {
    console.error('createSummaryQueueEntry:', err);
    return false;
  }
}

// =========================================================================
// Helper functions
// =========================================================================

export function formatNotificationTime(timestamp: string): string {
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    return '';
  }
}

export function getNotificationIcon(notificationType: string): string {
  const iconMap: Record<string, string> = {
    // Account
    welcome: 'user-plus', email_verified: 'badge-check', phone_verified: 'badge-check',
    password_changed: 'lock', login_new_device: 'smartphone', account_suspended: 'ban',
    account_restored: 'check-circle',
    // Listings
    listing_approved: 'check-circle', listing_rejected: 'x-circle', listing_published: 'package',
    listing_updated: 'edit', listing_expires_soon: 'clock', listing_expired: 'x-circle',
    listing_renewed: 'refresh-cw', listing_sold: 'shopping-bag', listing_removed: 'trash-2',
    listing_reported: 'flag', listing_boosted: 'zap', featured_expired: 'star',
    // Offers
    offer_received: 'tag', offer_accepted: 'check-circle', offer_rejected: 'x-circle',
    counter_offer_received: 'tag', offer_expired: 'clock', offer_withdrawn: 'x',
    // Messages
    new_message: 'message-square', new_image_received: 'image', voice_message_received: 'mic',
    file_received: 'file', mentioned_in_chat: 'at-sign', read_receipt: 'check-check',
    conversation_archived: 'archive',
    // Saved searches
    saved_search_match: 'search', saved_search_price: 'dollar-sign',
    saved_search_category: 'folder', saved_search_location: 'map-pin',
    // Wishlist
    wishlist_price_drop: 'trending-down', wishlist_available: 'check-circle',
    wishlist_sold: 'shopping-bag', wishlist_updated: 'edit',
    // Reviews
    review_received: 'star', seller_replied: 'message-square', buyer_replied: 'message-square',
    // Orders
    new_order: 'shopping-cart', order_accepted: 'check-circle', order_cancelled: 'x-circle',
    order_completed: 'check-circle',
    // Payments
    payment_received: 'dollar-sign', payment_pending: 'clock', payment_failed: 'x-circle',
    refund_completed: 'rotate-ccw', refund_rejected: 'x-circle',
    // Delivery
    order_packed: 'package', courier_assigned: 'truck', order_shipped: 'truck',
    out_for_delivery: 'truck', delivered: 'check-circle', delivery_failed: 'x-circle',
    returned: 'rotate-ccw',
    // System
    system_maintenance: 'wrench', system_update: 'zap',
    // Promotions
    promotion: 'gift',
  };
  return iconMap[notificationType] || 'bell';
}

export function getCategoryColor(category: NotificationCategory): {
  text: string; bg: string; border: string;
} {
  const colorMap: Record<string, { text: string; bg: string; border: string }> = {
    account: { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    listings: { text: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
    offers: { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    messages: { text: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    saved_searches: { text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    wishlist: { text: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
    reviews: { text: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
    orders: { text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
    payments: { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    delivery: { text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
    system: { text: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
    security: { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    promotions: { text: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
    admin: { text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  };
  return colorMap[category] || colorMap.system;
}

export function shouldSendNotification(
  userId: string,
  category: NotificationCategory,
  channel: NotificationChannel,
): Promise<boolean> {
  return supabase.rpc('should_send_notification', {
    p_user_id: userId,
    p_category: category,
    p_channel: channel,
  }).then(({ data }) => data as boolean).catch(() => false);
}
