/**
 * Phase 6 — Marketplace Experience Hook
 *
 * Reactive wrapper for all Phase 6 marketplace experience features:
 * - Extended favorites (listings, sellers, stores, brands, categories)
 * - Seller blocking
 * - Hidden listings
 * - Category following
 * - Seller reports
 * - Sponsored listings
 * - User activity tracking
 * - User preferences
 * - Server-side recently viewed
 * - Engagement statistics
 * - Share utilities
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  addFavorite, removeFavorite, isFavorited, getAllFavorites,
  getFavoriteListings, getFavoriteSellers, getFavoriteStores,
  getFavoriteBrands, getFavoriteCategories,
  blockSeller, unblockSeller, getBlockedUsers, isBlocked, getBlockedUserIds,
  hideListing, unhideListing, getHiddenListings, getHiddenAdIds,
  followCategory, unfollowCategory, getFollowedCategories, isFollowingCategory,
  createSellerReport, getUserSellerReports, getAllSellerReports, updateSellerReportStatus,
  createListingReport, getUserListingReports,
  getSponsoredListings, createSponsoredListing, getAllSponsoredListings, updateSponsoredListing, deleteSponsoredListing,
  recordActivity, getUserActivity, clearUserActivity,
  recordQRScan, getQRScanCount,
  getUserPreferences, updateUserPreferences,
  recordRecentlyViewed, getRecentlyViewed, removeRecentlyViewed, clearRecentlyViewed,
  getEngagementStats, trackShare, trackContactSeller, trackVisitStore, trackCompare,
  getShareUrl, copyToClipboard, generateQRCodeUrl, downloadQRCode, printQRCode,
  SHARE_OPTIONS,
} from '@/lib/marketplaceExperience';
import type {
  UserFavorite, FavoriteEntityType, BlockedUser, HiddenListing,
  CategoryFollower, SellerReport, SellerReportInsert,
  SponsoredListing, SponsoredListingInsert,
  UserActivityRecord, ActivityType,
  UserPreferences, UserPreferencesUpdate,
  EngagementStats, SharePlatform,
} from '@/integrations/supabase/types_v6_marketplace';

export function useMarketplaceExperience() {
  const { user } = useAuth();

  const [favorites, setFavorites] = useState<UserFavorite[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [hiddenListings, setHiddenListings] = useState<HiddenListing[]>([]);
  const [followedCategories, setFollowedCategories] = useState<CategoryFollower[]>([]);
  const [sellerReports, setSellerReports] = useState<SellerReport[]>([]);
  const [listingReports, setListingReports] = useState<any[]>([]);
  const [sponsoredListings, setSponsoredListings] = useState<SponsoredListing[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivityRecord[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Favorites
  const fetchFavorites = useCallback(async () => {
    if (!user) return;
    const data = await getAllFavorites(user.id);
    setFavorites(data);
  }, [user]);

  const handleAddFavorite = useCallback(async (entityType: FavoriteEntityType, entityId: string) => {
    if (!user) return false;
    const success = await addFavorite(user.id, entityType, entityId);
    if (success) setFavorites(prev => [...prev, { id: 'temp', user_id: user.id, entity_type: entityType, entity_id: entityId, created_at: new Date().toISOString() }]);
    return success;
  }, [user]);

  const handleRemoveFavorite = useCallback(async (entityType: FavoriteEntityType, entityId: string) => {
    if (!user) return false;
    const success = await removeFavorite(user.id, entityType, entityId);
    if (success) setFavorites(prev => prev.filter(f => !(f.entity_type === entityType && f.entity_id === entityId)));
    return success;
  }, [user]);

  const checkIsFavorited = useCallback(async (entityType: FavoriteEntityType, entityId: string) => {
    if (!user) return false;
    return isFavorited(user.id, entityType, entityId);
  }, [user]);

  const isFavoritedState = useCallback((entityType: FavoriteEntityType, entityId: string) => {
    return favorites.some(f => f.entity_type === entityType && f.entity_id === entityId);
  }, [favorites]);

  // Blocked users
  const fetchBlockedUsers = useCallback(async () => {
    if (!user) return;
    const data = await getBlockedUsers(user.id);
    setBlockedUsers(data);
  }, [user]);

  const handleBlockSeller = useCallback(async (blockedUserId: string, reason?: string) => {
    if (!user) return false;
    const success = await blockSeller(user.id, blockedUserId, reason);
    if (success) fetchBlockedUsers();
    return success;
  }, [user, fetchBlockedUsers]);

  const handleUnblockSeller = useCallback(async (blockedUserId: string) => {
    if (!user) return false;
    const success = await unblockSeller(user.id, blockedUserId);
    if (success) fetchBlockedUsers();
    return success;
  }, [user, fetchBlockedUsers]);

  // Hidden listings
  const fetchHiddenListings = useCallback(async () => {
    if (!user) return;
    const data = await getHiddenListings(user.id);
    setHiddenListings(data);
  }, [user]);

  const handleHideListing = useCallback(async (adId: string, reason?: string) => {
    if (!user) return false;
    const success = await hideListing(user.id, adId, reason);
    if (success) fetchHiddenListings();
    return success;
  }, [user, fetchHiddenListings]);

  const handleUnhideListing = useCallback(async (adId: string) => {
    if (!user) return false;
    const success = await unhideListing(user.id, adId);
    if (success) fetchHiddenListings();
    return success;
  }, [user, fetchHiddenListings]);

  // Category following
  const fetchFollowedCategories = useCallback(async () => {
    if (!user) return;
    const data = await getFollowedCategories(user.id);
    setFollowedCategories(data);
  }, [user]);

  const handleFollowCategory = useCallback(async (categoryId: string, notifyOnNew?: boolean) => {
    if (!user) return false;
    const success = await followCategory(user.id, categoryId, notifyOnNew);
    if (success) fetchFollowedCategories();
    return success;
  }, [user, fetchFollowedCategories]);

  const handleUnfollowCategory = useCallback(async (categoryId: string) => {
    if (!user) return false;
    const success = await unfollowCategory(user.id, categoryId);
    if (success) fetchFollowedCategories();
    return success;
  }, [user, fetchFollowedCategories]);

  // Reports
  const fetchSellerReports = useCallback(async () => {
    if (!user) return;
    const data = await getUserSellerReports(user.id);
    setSellerReports(data);
  }, [user]);

  const fetchListingReports = useCallback(async () => {
    if (!user) return;
    const data = await getUserListingReports(user.id);
    setListingReports(data);
  }, [user]);

  const handleCreateSellerReport = useCallback(async (report: Omit<SellerReportInsert, 'reporter_id'>) => {
    if (!user) return null;
    const result = await createSellerReport({ ...report, reporter_id: user.id });
    if (result) fetchSellerReports();
    return result;
  }, [user, fetchSellerReports]);

  const handleCreateListingReport = useCallback(async (adId: string, reason: string, reasonCode: string, description?: string) => {
    if (!user) return false;
    const success = await createListingReport(user.id, adId, reason, reasonCode, description);
    if (success) fetchListingReports();
    return success;
  }, [user, fetchListingReports]);

  // Sponsored listings (admin)
  const fetchAllSponsoredListings = useCallback(async () => {
    const data = await getAllSponsoredListings();
    setSponsoredListings(data);
  }, []);

  const handleCreateSponsored = useCallback(async (data: SponsoredListingInsert) => {
    const result = await createSponsoredListing(data);
    if (result) fetchAllSponsoredListings();
    return result;
  }, [fetchAllSponsoredListings]);

  const handleUpdateSponsored = useCallback(async (id: string, updates: Partial<SponsoredListingInsert>) => {
    const success = await updateSponsoredListing(id, updates);
    if (success) fetchAllSponsoredListings();
    return success;
  }, [fetchAllSponsoredListings]);

  const handleDeleteSponsored = useCallback(async (id: string) => {
    const success = await deleteSponsoredListing(id);
    if (success) fetchAllSponsoredListings();
    return success;
  }, [fetchAllSponsoredListings]);

  // User activity
  const fetchUserActivity = useCallback(async (limit?: number) => {
    if (!user) return;
    const data = await getUserActivity(user.id, limit);
    setUserActivity(data);
  }, [user]);

  const handleClearActivity = useCallback(async () => {
    if (!user) return false;
    const success = await clearUserActivity(user.id);
    if (success) setUserActivity([]);
    return success;
  }, [user]);

  // Preferences
  const fetchPreferences = useCallback(async () => {
    if (!user) return;
    const data = await getUserPreferences(user.id);
    setPreferences(data);
  }, [user]);

  const handleUpdatePreferences = useCallback(async (updates: UserPreferencesUpdate) => {
    if (!user) return null;
    const result = await updateUserPreferences(user.id, updates);
    if (result) setPreferences(result);
    return result;
  }, [user]);

  // Recently viewed
  const fetchRecentlyViewed = useCallback(async (limit?: number) => {
    if (!user) return;
    const data = await getRecentlyViewed(user.id, limit);
    setRecentlyViewed(data);
  }, [user]);

  const handleRecordView = useCallback(async (adId: string) => {
    if (!user) return;
    await recordRecentlyViewed(user.id, adId);
  }, [user]);

  const handleRemoveRecentlyViewed = useCallback(async (adId: string) => {
    if (!user) return false;
    const success = await removeRecentlyViewed(user.id, adId);
    if (success) setRecentlyViewed(prev => prev.filter((r: any) => r.id !== adId));
    return success;
  }, [user]);

  const handleClearRecentlyViewed = useCallback(async () => {
    if (!user) return false;
    const success = await clearRecentlyViewed(user.id);
    if (success) setRecentlyViewed([]);
    return success;
  }, [user]);

  // Share
  const handleShare = useCallback(async (platform: SharePlatform, url: string, title: string, text?: string, adId?: string) => {
    if (adId && user) await trackShare(user.id, adId, platform);
    if (platform === 'copy_link') {
      const success = await copyToClipboard(url);
      if (success) return true;
      return false;
    }
    if (platform === 'native') {
      if (navigator.share) {
        try { await navigator.share({ title, text, url }); return true; } catch { return false; }
      }
      return false;
    }
    const shareUrl = getShareUrl(platform, url, title, text);
    if (platform === 'email' || platform === 'sms') {
      window.location.href = shareUrl;
    } else {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
    return true;
  }, [user]);

  const handleQRScan = useCallback(async (adId: string) => {
    await recordQRScan(adId, user?.id);
  }, [user]);

  return {
    // State
    favorites, blockedUsers, hiddenListings, followedCategories,
    sellerReports, listingReports, sponsoredListings, userActivity,
    preferences, recentlyViewed, isLoading,

    // Favorites
    fetchFavorites, addFavorite: handleAddFavorite, removeFavorite: handleRemoveFavorite,
    checkIsFavorited, isFavoritedState,
    getFavoriteListings, getFavoriteSellers, getFavoriteStores,
    getFavoriteBrands, getFavoriteCategories,

    // Blocked users
    fetchBlockedUsers, blockSeller: handleBlockSeller, unblockSeller: handleUnblockSeller,
    isBlocked, getBlockedUserIds,

    // Hidden listings
    fetchHiddenListings, hideListing: handleHideListing, unhideListing: handleUnhideListing,
    getHiddenAdIds,

    // Category following
    fetchFollowedCategories, followCategory: handleFollowCategory,
    unfollowCategory: handleUnfollowCategory, isFollowingCategory,

    // Reports
    fetchSellerReports, fetchListingReports,
    createSellerReport: handleCreateSellerReport, createListingReport: handleCreateListingReport,
    getAllSellerReports, updateSellerReportStatus,

    // Sponsored listings
    getSponsoredListings, fetchAllSponsoredListings,
    createSponsoredListing: handleCreateSponsored, updateSponsoredListing: handleUpdateSponsored,
    deleteSponsoredListing: handleDeleteSponsored,

    // User activity
    recordActivity, fetchUserActivity, clearUserActivity: handleClearActivity,

    // QR code
    recordQRScan: handleQRScan, getQRScanCount,

    // Preferences
    fetchPreferences, updatePreferences: handleUpdatePreferences,

    // Recently viewed
    fetchRecentlyViewed, recordRecentlyViewed: handleRecordView,
    removeRecentlyViewed: handleRemoveRecentlyViewed, clearRecentlyViewed: handleClearRecentlyViewed,

    // Engagement
    getEngagementStats,

    // Share
    share: handleShare, getShareUrl, copyToClipboard,
    generateQRCodeUrl, downloadQRCode, printQRCode, SHARE_OPTIONS,
    trackShare, trackContactSeller, trackVisitStore, trackCompare,
  };
}
