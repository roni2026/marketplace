/**
 * Phase 6 — Marketplace Experience Library
 *
 * Comprehensive marketplace experience utilities:
 * - Extended favorites (listings, sellers, stores, brands, categories)
 * - Seller blocking
 * - Hidden listings
 * - Category following
 * - Seller reports
 * - Sponsored listings
 * - User activity tracking
 * - QR code scan tracking
 * - User preferences
 * - Server-side recently viewed
 * - Engagement statistics
 * - Share utilities (QR code, social platforms)
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  UserFavorite, UserFavoriteInsert, FavoriteEntityType,
  BlockedUser, HiddenListing, CategoryFollower,
  SellerReport, SellerReportInsert,
  SponsoredListing, SponsoredListingInsert,
  UserActivityRecord, ActivityType,
  UserPreferences, UserPreferencesUpdate,
  RecentlyViewedRecord, EngagementStats,
  SharePlatform, ShareOption,
} from '@/integrations/supabase/types_v6_marketplace';

// =========================================================================
// Share Options Configuration
// =========================================================================

export const SHARE_OPTIONS: ShareOption[] = [
  { platform: 'copy_link', label: 'Copy Link', icon: 'link', color: '#6b7280' },
  { platform: 'qr_code', label: 'QR Code', icon: 'qr-code', color: '#1f2937' },
  { platform: 'whatsapp', label: 'WhatsApp', icon: 'message-circle', color: '#25D366' },
  { platform: 'facebook', label: 'Facebook', icon: 'facebook', color: '#1877F2' },
  { platform: 'messenger', label: 'Messenger', icon: 'message', color: '#0084FF' },
  { platform: 'twitter', label: 'X (Twitter)', icon: 'twitter', color: '#000000' },
  { platform: 'telegram', label: 'Telegram', icon: 'send', color: '#0088CC' },
  { platform: 'email', label: 'Email', icon: 'mail', color: '#6b7280' },
  { platform: 'sms', label: 'SMS', icon: 'phone', color: '#10B981' },
  { platform: 'native', label: 'More...', icon: 'share-2', color: '#6b7280' },
];

export function getShareUrl(platform: SharePlatform, url: string, title: string, text?: string): string {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedText = encodeURIComponent(text || title);

  switch (platform) {
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`;
    case 'whatsapp':
      return `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
    case 'twitter':
      return `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;
    case 'telegram':
      return `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`;
    case 'email':
      return `mailto:?subject=${encodedTitle}&body=${encodedText}%0A%0A${encodedUrl}`;
    case 'sms':
      return `sms:?body=${encodedTitle}%20${encodedUrl}`;
    case 'messenger':
      return `https://www.facebook.com/dialog/send?link=${encodedUrl}&app_id=0&redirect_uri=${encodedUrl}`;
    case 'instagram':
      return url; // Instagram doesn't support web share URLs; return direct link
    default:
      return url;
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

export function generateQRCodeUrl(data: string, size: number = 300): string {
  // Using a public QR code generation API
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

export async function downloadQRCode(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  } catch {
    // Fallback: open in new tab
    window.open(url, '_blank');
  }
}

export function printQRCode(url: string, title: string): void {
  const printWindow = window.open('', '_blank', 'width=600,height=600');
  if (!printWindow) return;
  printWindow.document.write(`
    <html>
      <head><title>${title} - QR Code</title></head>
      <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:system-ui,sans-serif;">
        <h2>${title}</h2>
        <img src="${url}" alt="QR Code" style="width:300px;height:300px;" />
        <p style="color:#666;margin-top:16px;">Scan to view listing</p>
      </body>
    </html>
  `);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
}

// =========================================================================
// Extended Favorites
// =========================================================================

export async function addFavorite(userId: string, entityType: FavoriteEntityType, entityId: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_favorites')
    .insert({ user_id: userId, entity_type: entityType, entity_id: entityId });
  if (error) {
    if (error.code !== '23505') { // ignore duplicate
      console.error('addFavorite:', error);
      return false;
    }
  }
  await recordActivity(userId, 'favorite', entityType, entityId);
  return true;
}

export async function removeFavorite(userId: string, entityType: FavoriteEntityType, entityId: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);
  if (error) { console.error('removeFavorite:', error); return false; }
  await recordActivity(userId, 'unfavorite', entityType, entityId);
  return true;
}

export async function isFavorited(userId: string, entityType: FavoriteEntityType, entityId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .maybeSingle();
  return !!data;
}

export async function getFavoritesByType(userId: string, entityType: FavoriteEntityType): Promise<UserFavorite[]> {
  const { data, error } = await supabase
    .from('user_favorites')
    .select('*')
    .eq('user_id', userId)
    .eq('entity_type', entityType)
    .order('created_at', { ascending: false });
  if (error) { console.error('getFavoritesByType:', error); return []; }
  return (data as UserFavorite[]) || [];
}

export async function getAllFavorites(userId: string): Promise<UserFavorite[]> {
  const { data, error } = await supabase
    .from('user_favorites')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getAllFavorites:', error); return []; }
  return (data as UserFavorite[]) || [];
}

export async function getFavoriteListings(userId: string): Promise<any[]> {
  const favorites = await getFavoritesByType(userId, 'listing');
  if (favorites.length === 0) return [];
  const adIds = favorites.map(f => f.entity_id);
  const { data, error } = await supabase
    .from('ads')
    .select('*, ad_images(image_url), categories(name, slug)')
    .in('id', adIds)
    .in('status', ['approved', 'boosted', 'premium']);
  if (error) { console.error('getFavoriteListings:', error); return []; }
  return data || [];
}

export async function getFavoriteSellers(userId: string): Promise<any[]> {
  const favorites = await getFavoritesByType(userId, 'seller');
  if (favorites.length === 0) return [];
  const sellerIds = favorites.map(f => f.entity_id);
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, full_name, avatar_url, is_verified, division, district, created_at')
    .in('user_id', sellerIds);
  if (error) { console.error('getFavoriteSellers:', error); return []; }
  return data || [];
}

export async function getFavoriteStores(userId: string): Promise<any[]> {
  const favorites = await getFavoritesByType(userId, 'store');
  if (favorites.length === 0) return [];
  const storeIds = favorites.map(f => f.entity_id);
  const { data, error } = await supabase
    .from('shops')
    .select('id, name, slug, logo_url, is_verified, total_products, total_followers')
    .in('id', storeIds);
  if (error) { console.error('getFavoriteStores:', error); return []; }
  return data || [];
}

export async function getFavoriteBrands(userId: string): Promise<string[]> {
  const favorites = await getFavoritesByType(userId, 'brand');
  return favorites.map(f => f.entity_id);
}

export async function getFavoriteCategories(userId: string): Promise<any[]> {
  const favorites = await getFavoritesByType(userId, 'category');
  if (favorites.length === 0) return [];
  const catIds = favorites.map(f => f.entity_id);
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, icon')
    .in('id', catIds);
  if (error) { console.error('getFavoriteCategories:', error); return []; }
  return data || [];
}

// =========================================================================
// Seller Blocking
// =========================================================================

export async function blockSeller(userId: string, blockedUserId: string, reason?: string): Promise<boolean> {
  const { error } = await supabase
    .from('blocked_users')
    .insert({ user_id: userId, blocked_user_id: blockedUserId, reason: reason || null });
  if (error) {
    if (error.code !== '23505') { console.error('blockSeller:', error); return false; }
  }
  await recordActivity(userId, 'block_seller', 'seller', blockedUserId);
  toast.success('Seller blocked');
  return true;
}

export async function unblockSeller(userId: string, blockedUserId: string): Promise<boolean> {
  const { error } = await supabase
    .from('blocked_users')
    .delete()
    .eq('user_id', userId)
    .eq('blocked_user_id', blockedUserId);
  if (error) { console.error('unblockSeller:', error); return false; }
  await recordActivity(userId, 'unblock_seller', 'seller', blockedUserId);
  toast.success('Seller unblocked');
  return true;
}

export async function getBlockedUsers(userId: string): Promise<BlockedUser[]> {
  const { data, error } = await supabase
    .from('blocked_users')
    .select('*, blocked_user:profiles!blocked_users_blocked_user_id_fkey(full_name, avatar_url)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getBlockedUsers:', error); return []; }
  return (data as BlockedUser[]) || [];
}

export async function isBlocked(userId: string, blockedUserId: string): Promise<boolean> {
  const { data } = await supabase
    .from('blocked_users')
    .select('id')
    .eq('user_id', userId)
    .eq('blocked_user_id', blockedUserId)
    .maybeSingle();
  return !!data;
}

export async function getBlockedUserIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('blocked_users')
    .select('blocked_user_id')
    .eq('user_id', userId);
  if (error) { console.error('getBlockedUserIds:', error); return []; }
  return (data || []).map((d: any) => d.blocked_user_id);
}

// =========================================================================
// Hidden Listings
// =========================================================================

export async function hideListing(userId: string, adId: string, reason?: string): Promise<boolean> {
  const { error } = await supabase
    .from('hidden_listings')
    .insert({ user_id: userId, ad_id: adId, reason: reason || null });
  if (error) {
    if (error.code !== '23505') { console.error('hideListing:', error); return false; }
  }
  await recordActivity(userId, 'hide_listing', 'listing', adId);
  toast.success('Listing hidden');
  return true;
}

export async function unhideListing(userId: string, adId: string): Promise<boolean> {
  const { error } = await supabase
    .from('hidden_listings')
    .delete()
    .eq('user_id', userId)
    .eq('ad_id', adId);
  if (error) { console.error('unhideListing:', error); return false; }
  await recordActivity(userId, 'unhide_listing', 'listing', adId);
  toast.success('Listing unhidden');
  return true;
}

export async function getHiddenListings(userId: string): Promise<HiddenListing[]> {
  const { data, error } = await supabase
    .from('hidden_listings')
    .select('*, ad:ads(id, title, slug, price, price_type, ad_images(image_url))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getHiddenListings:', error); return []; }
  return (data as HiddenListing[]) || [];
}

export async function getHiddenAdIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('hidden_listings')
    .select('ad_id')
    .eq('user_id', userId);
  if (error) { console.error('getHiddenAdIds:', error); return []; }
  return (data || []).map((d: any) => d.ad_id);
}

// =========================================================================
// Category Following
// =========================================================================

export async function followCategory(userId: string, categoryId: string, notifyOnNew: boolean = true): Promise<boolean> {
  const { error } = await supabase
    .from('category_followers')
    .insert({ user_id: userId, category_id: categoryId, notify_on_new: notifyOnNew });
  if (error) {
    if (error.code !== '23505') { console.error('followCategory:', error); return false; }
  }
  await recordActivity(userId, 'follow_category', 'category', categoryId);
  toast.success('Category followed');
  return true;
}

export async function unfollowCategory(userId: string, categoryId: string): Promise<boolean> {
  const { error } = await supabase
    .from('category_followers')
    .delete()
    .eq('user_id', userId)
    .eq('category_id', categoryId);
  if (error) { console.error('unfollowCategory:', error); return false; }
  await recordActivity(userId, 'unfollow_category', 'category', categoryId);
  toast.success('Category unfollowed');
  return true;
}

export async function getFollowedCategories(userId: string): Promise<CategoryFollower[]> {
  const { data, error } = await supabase
    .from('category_followers')
    .select('*, category:categories(id, name, slug, icon)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getFollowedCategories:', error); return []; }
  return (data as CategoryFollower[]) || [];
}

export async function isFollowingCategory(userId: string, categoryId: string): Promise<boolean> {
  const { data } = await supabase
    .from('category_followers')
    .select('id')
    .eq('user_id', userId)
    .eq('category_id', categoryId)
    .maybeSingle();
  return !!data;
}

// =========================================================================
// Seller Reports
// =========================================================================

export async function createSellerReport(report: SellerReportInsert): Promise<SellerReport | null> {
  const { data, error } = await supabase
    .from('seller_reports')
    .insert(report)
    .select()
    .single();
  if (error) { toast.error('Failed to submit report'); console.error('createSellerReport:', error); return null; }
  await recordActivity(report.reporter_id, 'report_seller', 'seller', report.seller_id);
  toast.success('Report submitted. We will review it shortly.');
  return data as SellerReport;
}

export async function getUserSellerReports(userId: string): Promise<SellerReport[]> {
  const { data, error } = await supabase
    .from('seller_reports')
    .select('*')
    .eq('reporter_id', userId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getUserSellerReports:', error); return []; }
  return (data as SellerReport[]) || [];
}

export async function getAllSellerReports(): Promise<SellerReport[]> {
  const { data, error } = await supabase
    .from('seller_reports')
    .select('*, reporter:profiles!seller_reports_reporter_id_fkey(full_name), seller:profiles!seller_reports_seller_id_fkey(full_name)')
    .order('created_at', { ascending: false });
  if (error) { console.error('getAllSellerReports:', error); return []; }
  return (data as SellerReport[]) || [];
}

export async function updateSellerReportStatus(
  reportId: string,
  status: string,
  adminNotes?: string,
  resolvedBy?: string
): Promise<boolean> {
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (adminNotes !== undefined) updates.admin_notes = adminNotes;
  if (status === 'resolved' || status === 'dismissed') {
    updates.is_resolved = true;
    updates.resolved_at = new Date().toISOString();
    if (resolvedBy) updates.resolved_by = resolvedBy;
  }

  const { error } = await supabase
    .from('seller_reports')
    .update(updates)
    .eq('id', reportId);
  if (error) { console.error('updateSellerReportStatus:', error); return false; }
  return true;
}

// =========================================================================
// Listing Reports (enhanced from existing reports table)
// =========================================================================

export async function createListingReport(
  userId: string,
  adId: string,
  reason: string,
  reasonCode: string,
  description?: string
): Promise<boolean> {
  const { error } = await supabase
    .from('reports')
    .insert({
      user_id: userId,
      ad_id: adId,
      reason,
      reason_code: reasonCode,
      status: 'pending',
    });
  if (error) { toast.error('Failed to submit report'); console.error('createListingReport:', error); return false; }
  await recordActivity(userId, 'report_listing', 'listing', adId);
  toast.success('Report submitted. We will review it shortly.');
  return true;
}

export async function getUserListingReports(userId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*, ad:ads(title, slug)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getUserListingReports:', error); return []; }
  return data || [];
}

// =========================================================================
// Sponsored Listings
// =========================================================================

export async function getSponsoredListings(placement: string, limit: number = 5, categoryId?: string): Promise<any[]> {
  try {
    const { data } = await supabase.rpc('get_sponsored_listings', {
      p_placement: placement,
      p_limit: limit,
      p_category_id: categoryId || null,
    });
    return data || [];
  } catch (err) {
    console.error('getSponsoredListings:', err);
    return [];
  }
}

export async function createSponsoredListing(sponsored: SponsoredListingInsert): Promise<SponsoredListing | null> {
  const { data, error } = await supabase
    .from('sponsored_listings')
    .insert(sponsored)
    .select()
    .single();
  if (error) { toast.error('Failed to create sponsored listing'); console.error('createSponsoredListing:', error); return null; }
  toast.success('Sponsored listing created');
  return data as SponsoredListing;
}

export async function getAllSponsoredListings(): Promise<SponsoredListing[]> {
  const { data, error } = await supabase
    .from('sponsored_listings')
    .select('*, ad:ads(title, slug)')
    .order('created_at', { ascending: false });
  if (error) { console.error('getAllSponsoredListings:', error); return []; }
  return (data as SponsoredListing[]) || [];
}

export async function updateSponsoredListing(id: string, updates: Partial<SponsoredListingInsert>): Promise<boolean> {
  const { error } = await supabase
    .from('sponsored_listings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) { toast.error('Failed to update sponsored listing'); return false; }
  toast.success('Sponsored listing updated');
  return true;
}

export async function deleteSponsoredListing(id: string): Promise<boolean> {
  const { error } = await supabase.from('sponsored_listings').delete().eq('id', id);
  if (error) { toast.error('Failed to delete sponsored listing'); return false; }
  toast.success('Sponsored listing deleted');
  return true;
}

// =========================================================================
// User Activity Tracking
// =========================================================================

export async function recordActivity(
  userId: string | null,
  activityType: ActivityType,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (!userId) return;
  try {
    await supabase.rpc('record_user_activity', {
      p_user_id: userId,
      p_activity_type: activityType,
      p_entity_type: entityType || null,
      p_entity_id: entityId || null,
      p_metadata: metadata || {},
    });
  } catch {
    // Non-critical, ignore
  }
}

export async function getUserActivity(userId: string, limit: number = 50): Promise<UserActivityRecord[]> {
  const { data, error } = await supabase
    .from('user_activity')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { console.error('getUserActivity:', error); return []; }
  return (data as UserActivityRecord[]) || [];
}

export async function clearUserActivity(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_activity')
    .delete()
    .eq('user_id', userId);
  if (error) { console.error('clearUserActivity:', error); return false; }
  toast.success('Activity history cleared');
  return true;
}

// =========================================================================
// QR Code Scans
// =========================================================================

export async function recordQRScan(adId: string, scannedBy?: string): Promise<void> {
  try {
    await supabase.from('qr_code_scans').insert({
      ad_id: adId,
      scanned_by: scannedBy || null,
    });
    if (scannedBy) {
      await recordActivity(scannedBy, 'qr_scan', 'listing', adId);
    }
  } catch {
    // Non-critical
  }
}

export async function getQRScanCount(adId: string): Promise<number> {
  const { count, error } = await supabase
    .from('qr_code_scans')
    .select('id', { count: 'exact', head: true })
    .eq('ad_id', adId);
  if (error) { console.error('getQRScanCount:', error); return 0; }
  return count || 0;
}

// =========================================================================
// User Preferences
// =========================================================================

export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) { console.error('getUserPreferences:', error); return null; }
  if (!data) {
    // Create default preferences
    const { data: newPrefs, error: insertError } = await supabase
      .from('user_preferences')
      .insert({ user_id: userId })
      .select()
      .single();
    if (insertError) { console.error('getUserPreferences insert:', insertError); return null; }
    return newPrefs as UserPreferences;
  }
  return data as UserPreferences;
}

export async function updateUserPreferences(userId: string, updates: UserPreferencesUpdate): Promise<UserPreferences | null> {
  // Ensure preferences exist
  await getUserPreferences(userId);

  const { data, error } = await supabase
    .from('user_preferences')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single();
  if (error) { toast.error('Failed to update preferences'); console.error('updateUserPreferences:', error); return null; }
  toast.success('Preferences updated');
  return data as UserPreferences;
}

// =========================================================================
// Recently Viewed (server-side)
// =========================================================================

export async function recordRecentlyViewed(userId: string, adId: string): Promise<void> {
  try {
    await supabase.rpc('record_recently_viewed', {
      p_user_id: userId,
      p_ad_id: adId,
    });
    await recordActivity(userId, 'view', 'listing', adId);
  } catch {
    // Non-critical
  }
}

export async function getRecentlyViewed(userId: string, limit: number = 20): Promise<any[]> {
  const { data, error } = await supabase
    .from('recently_viewed')
    .select('*, ad:ads(*, ad_images(image_url), categories(name, slug))')
    .eq('user_id', userId)
    .order('viewed_at', { ascending: false })
    .limit(limit);
  if (error) { console.error('getRecentlyViewed:', error); return []; }
  return (data || []).map((r: any) => r.ad).filter(Boolean);
}

export async function removeRecentlyViewed(userId: string, adId: string): Promise<boolean> {
  const { error } = await supabase
    .from('recently_viewed')
    .delete()
    .eq('user_id', userId)
    .eq('ad_id', adId);
  if (error) { console.error('removeRecentlyViewed:', error); return false; }
  return true;
}

export async function clearRecentlyViewed(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('recently_viewed')
    .delete()
    .eq('user_id', userId);
  if (error) { console.error('clearRecentlyViewed:', error); return false; }
  toast.success('Recently viewed history cleared');
  return true;
}

// =========================================================================
// Engagement Statistics
// =========================================================================

export async function getEngagementStats(adId: string): Promise<EngagementStats> {
  const [viewsRes, favCountRes, shareCountRes, qrCountRes, contactClicksRes] = await Promise.all([
    supabase.from('ads').select('views_count, favorites_count').eq('id', adId).single(),
    supabase.from('user_favorites').select('id', { count: 'exact', head: true }).eq('entity_type', 'listing').eq('entity_id', adId),
    supabase.from('user_activity').select('id', { count: 'exact', head: true }).eq('activity_type', 'share').eq('entity_type', 'listing').eq('entity_id', adId),
    supabase.from('qr_code_scans').select('id', { count: 'exact', head: true }).eq('ad_id', adId),
    supabase.from('user_activity').select('id', { count: 'exact', head: true }).eq('activity_type', 'contact_seller').eq('entity_type', 'listing').eq('entity_id', adId),
  ]);

  const ad = viewsRes.data as any;
  return {
    views: ad?.views_count || 0,
    unique_visitors: ad?.views_count || 0, // Would need separate tracking for unique
    wishlist_count: 0, // Would need to count collection_items
    favorite_count: favCountRes.count || 0,
    share_count: shareCountRes.count || 0,
    compare_count: 0, // Would need to count product_comparisons
    qr_code_scans: qrCountRes.count || 0,
    contact_seller_clicks: contactClicksRes.count || 0,
    store_visits: 0,
  };
}

// =========================================================================
// Share Tracking
// =========================================================================

export async function trackShare(userId: string | null, adId: string, platform: string): Promise<void> {
  await recordActivity(userId, 'share', 'listing', adId, { platform });
}

export async function trackContactSeller(userId: string | null, adId: string): Promise<void> {
  await recordActivity(userId, 'contact_seller', 'listing', adId);
}

export async function trackVisitStore(userId: string | null, storeId: string): Promise<void> {
  await recordActivity(userId, 'visit_store', 'store', storeId);
}

export async function trackCompare(userId: string | null, adId: string): Promise<void> {
  await recordActivity(userId, 'compare', 'listing', adId);
}
