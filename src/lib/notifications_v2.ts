import { supabase } from '@/integrations/supabase/client';
import type {
  NotificationPreferences,
  NotificationPreferencesUpdate,
  NotificationSchedule,
  NotificationScheduleInsert,
} from '@/integrations/supabase/types_v2_cms';

// -------------------------------------------------------------------------
// Notification Preferences
// -------------------------------------------------------------------------

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('Failed to fetch notification preferences:', error);
    return null;
  }
  return data as NotificationPreferences | null;
}

export async function updateNotificationPreferences(
  userId: string,
  prefs: NotificationPreferencesUpdate
): Promise<NotificationPreferences | null> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert({ user_id: userId, ...prefs }, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) {
    console.error('Failed to update notification preferences:', error);
    return null;
  }
  return data as NotificationPreferences;
}

// -------------------------------------------------------------------------
// Notification Scheduling
// -------------------------------------------------------------------------

export async function scheduleNotification(
  notificationId: string,
  scheduledFor: string
): Promise<NotificationSchedule | null> {
  const payload: NotificationScheduleInsert = {
    notification_id: notificationId,
    scheduled_for: scheduledFor,
    sent: false,
  };
  const { data, error } = await supabase
    .from('notification_schedule')
    .insert(payload)
    .select()
    .single();
  if (error) {
    console.error('Failed to schedule notification:', error);
    return null;
  }
  return data as NotificationSchedule;
}

// -------------------------------------------------------------------------
// Browser Push Notifications
// -------------------------------------------------------------------------

export async function sendBrowserNotification(
  userId: string,
  title: string,
  body: string
): Promise<void> {
  try {
    const prefs = await getNotificationPreferences(userId);
    if (prefs && !prefs.browser_enabled) return;

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }

    // Also insert an in-app notification record
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'system',
      title,
      message: body,
    });
  } catch (error) {
    console.error('Failed to send browser notification:', error);
  }
}

// -------------------------------------------------------------------------
// Digest Email
// -------------------------------------------------------------------------

export async function sendDigestEmail(userId: string): Promise<void> {
  try {
    const prefs = await getNotificationPreferences(userId);
    if (prefs && !prefs.digest_email_enabled) return;

    // Fetch recent unread notifications
    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!notifications || notifications.length === 0) return;

    // In a real implementation this would trigger an edge function to send email.
    // For now we mark notifications as part of a digest.
    console.log(`Digest email prepared for user ${userId} with ${notifications.length} notifications`);
  } catch (error) {
    console.error('Failed to send digest email:', error);
  }
}

// -------------------------------------------------------------------------
// Category Alerts
// -------------------------------------------------------------------------

export async function sendCategoryAlert(userId: string, categoryId: string): Promise<void> {
  try {
    const prefs = await getNotificationPreferences(userId);
    if (prefs && !prefs.category_alerts) return;

    const { data: category } = await supabase
      .from('categories')
      .select('name')
      .eq('id', categoryId)
      .single();

    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'system',
      title: 'New Listing in Your Category',
      message: `A new listing was posted in ${category?.name || 'a category you follow'}.`,
      data: { category_id: categoryId },
    });
  } catch (error) {
    console.error('Failed to send category alert:', error);
  }
}

// -------------------------------------------------------------------------
// Saved Search Alerts
// -------------------------------------------------------------------------

export async function sendSavedSearchAlert(userId: string, searchId: string): Promise<void> {
  try {
    const prefs = await getNotificationPreferences(userId);
    if (prefs && !prefs.saved_search_alerts) return;

    const { data: search } = await supabase
      .from('saved_searches')
      .select('name')
      .eq('id', searchId)
      .single();

    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'system',
      title: 'Saved Search Alert',
      message: `New results matched your saved search "${search?.name || 'Untitled'}".`,
      data: { search_id: searchId },
    });
  } catch (error) {
    console.error('Failed to send saved search alert:', error);
  }
}

// -------------------------------------------------------------------------
// Wishlist Alerts
// -------------------------------------------------------------------------

export async function sendWishlistAlert(userId: string, adId: string): Promise<void> {
  try {
    const prefs = await getNotificationPreferences(userId);
    if (prefs && !prefs.wishlist_alerts) return;

    const { data: ad } = await supabase
      .from('ads')
      .select('title')
      .eq('id', adId)
      .single();

    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'system',
      title: 'Wishlist Item Update',
      message: `An item on your wishlist "${ad?.title || 'Unknown'}" has been updated.`,
      data: { ad_id: adId },
    });
  } catch (error) {
    console.error('Failed to send wishlist alert:', error);
  }
}

// -------------------------------------------------------------------------
// Seller Alerts
// -------------------------------------------------------------------------

export async function sendSellerAlert(
  userId: string,
  type: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const prefs = await getNotificationPreferences(userId);
    if (prefs && !prefs.seller_alerts) return;

    const titles: Record<string, string> = {
      new_offer: 'New Offer Received',
      offer_accepted: 'Offer Accepted',
      offer_rejected: 'Offer Rejected',
      new_message: 'New Message',
      ad_approved: 'Your Ad Was Approved',
      ad_rejected: 'Your Ad Was Rejected',
      ad_expiring: 'Your Ad Is Expiring Soon',
    };

    await supabase.from('notifications').insert({
      user_id: userId,
      type: type in ['ad_approved', 'ad_rejected', 'ad_expiring', 'new_message', 'new_offer', 'offer_accepted', 'offer_rejected']
        ? type
        : 'system',
      title: titles[type] || 'Seller Alert',
      message: data.message || 'You have a new seller notification.',
      data,
    });
  } catch (error) {
    console.error('Failed to send seller alert:', error);
  }
}

// -------------------------------------------------------------------------
// Admin Announcements
// -------------------------------------------------------------------------

export async function sendAdminAnnouncement(userId: string, message: string): Promise<void> {
  try {
    const prefs = await getNotificationPreferences(userId);
    if (prefs && !prefs.admin_announcements) return;

    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'system',
      title: 'Admin Announcement',
      message,
    });
  } catch (error) {
    console.error('Failed to send admin announcement:', error);
  }
}

// -------------------------------------------------------------------------
// Process Scheduled Notifications (for cron)
// -------------------------------------------------------------------------

export async function processScheduledNotifications(): Promise<number> {
  try {
    const now = new Date().toISOString();
    const { data: pending, error } = await supabase
      .from('notification_schedule')
      .select('*, notifications(*)')
      .eq('sent', false)
      .lte('scheduled_for', now)
      .limit(100);

    if (error || !pending) {
      console.error('Failed to fetch scheduled notifications:', error);
      return 0;
    }

    let processed = 0;
    for (const item of pending) {
      const notification = (item as Record<string, unknown>).notifications as
        | { user_id: string; title: string; message: string }
        | null;
      if (notification) {
        await sendBrowserNotification(notification.user_id, notification.title, notification.message);
      }
      await supabase
        .from('notification_schedule')
        .update({ sent: true, sent_at: now })
        .eq('id', item.id);
      processed++;
    }

    return processed;
  } catch (error) {
    console.error('Failed to process scheduled notifications:', error);
    return 0;
  }
}
