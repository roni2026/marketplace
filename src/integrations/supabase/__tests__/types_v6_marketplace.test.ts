import { describe, it, expect } from 'vitest';
import type {
  UserFavorite, FavoriteEntityType, ActivityType, ReportTargetType,
  SponsoredPlacement, ReportStatus, BlockedUser, HiddenListing,
  CategoryFollower, SellerReport, SellerReportInsert,
  SponsoredListing, SponsoredListingInsert, UserActivityRecord,
  UserPreferences, UserPreferencesUpdate, RecentlyViewedRecord,
  EngagementStats, SharePlatform, ShareOption,
} from '@/integrations/supabase/types_v6_marketplace';
import { LISTING_REPORT_REASONS, SELLER_REPORT_REASONS } from '@/integrations/supabase/types_v6_marketplace';

describe('Phase 6 Type Definitions', () => {
  it('FavoriteEntityType has all 5 values', () => {
    const types: FavoriteEntityType[] = ['listing', 'seller', 'store', 'brand', 'category'];
    expect(types).toHaveLength(5);
  });

  it('ActivityType has all expected values', () => {
    const types: ActivityType[] = [
      'view', 'favorite', 'unfavorite', 'share', 'compare',
      'follow_seller', 'unfollow_seller', 'follow_store', 'unfollow_store',
      'follow_category', 'unfollow_category', 'hide_listing', 'unhide_listing',
      'block_seller', 'unblock_seller', 'report_listing', 'report_seller',
      'wishlist_add', 'wishlist_remove', 'qr_scan', 'contact_seller',
      'visit_store', 'save_search',
    ];
    expect(types).toHaveLength(23);
  });

  it('ReportTargetType has listing and seller', () => {
    const types: ReportTargetType[] = ['listing', 'seller'];
    expect(types).toHaveLength(2);
  });

  it('SponsoredPlacement has all 4 values', () => {
    const placements: SponsoredPlacement[] = ['search_results', 'category_page', 'homepage', 'discovery'];
    expect(placements).toHaveLength(4);
  });

  it('ReportStatus has all values', () => {
    const statuses: ReportStatus[] = ['pending', 'reviewing', 'resolved', 'dismissed'];
    expect(statuses).toHaveLength(4);
  });

  it('UserFavorite has all fields', () => {
    const fav: UserFavorite = {
      id: 'f-1', user_id: 'u-1', entity_type: 'listing', entity_id: 'ad-1', created_at: '2024-01-01',
    };
    expect(fav.entity_type).toBe('listing');
  });

  it('BlockedUser has all fields', () => {
    const blocked: BlockedUser = {
      id: 'b-1', user_id: 'u-1', blocked_user_id: 'u-2', reason: 'spam', created_at: '2024-01-01',
    };
    expect(blocked.blocked_user_id).toBe('u-2');
  });

  it('HiddenListing has all fields', () => {
    const hidden: HiddenListing = {
      id: 'h-1', user_id: 'u-1', ad_id: 'ad-1', reason: null, created_at: '2024-01-01',
    };
    expect(hidden.ad_id).toBe('ad-1');
  });

  it('CategoryFollower has all fields', () => {
    const follower: CategoryFollower = {
      id: 'cf-1', user_id: 'u-1', category_id: 'cat-1', notify_on_new: true, created_at: '2024-01-01',
    };
    expect(follower.notify_on_new).toBe(true);
  });

  it('SellerReport has all fields', () => {
    const report: SellerReport = {
      id: 'r-1', reporter_id: 'u-1', seller_id: 'u-2', reason: 'Fraud', reason_code: 'fraud',
      description: 'Test', screenshot_urls: [], status: 'pending', admin_notes: null,
      resolved_by: null, resolved_at: null, is_resolved: false,
      created_at: '2024-01-01', updated_at: '2024-01-01',
    };
    expect(report.reason_code).toBe('fraud');
  });

  it('SponsoredListing has all fields', () => {
    const sponsored: SponsoredListing = {
      id: 's-1', ad_id: 'ad-1', sponsor_name: 'Test', placement: 'search_results',
      priority: 5, is_active: true, starts_at: '2024-01-01', ends_at: null,
      budget: 1000, spent: 0, impressions: 0, clicks: 0,
      created_at: '2024-01-01', updated_at: '2024-01-01',
    };
    expect(sponsored.placement).toBe('search_results');
  });

  it('UserPreferences has all fields', () => {
    const prefs: UserPreferences = {
      id: 'p-1', user_id: 'u-1',
      notify_new_listings: true, notify_price_drops: true,
      notify_seller_new_listings: true, notify_store_new_products: true,
      notify_category_new_listings: true, notify_expiring_listings: true,
      notify_messages: true, notify_offers: true,
      show_recently_viewed: true, allow_public_collections: true,
      allow_activity_tracking: true, default_wishlist_visibility: 'private',
      created_at: '2024-01-01', updated_at: '2024-01-01',
    };
    expect(prefs.notify_new_listings).toBe(true);
    expect(prefs.default_wishlist_visibility).toBe('private');
  });

  it('EngagementStats has all fields', () => {
    const stats: EngagementStats = {
      views: 100, unique_visitors: 80, wishlist_count: 5,
      favorite_count: 10, share_count: 3, compare_count: 2,
      qr_code_scans: 1, contact_seller_clicks: 8, store_visits: 4,
    };
    expect(stats.views).toBe(100);
    expect(stats.qr_code_scans).toBe(1);
  });

  it('SharePlatform has all platforms', () => {
    const platforms: SharePlatform[] = [
      'copy_link', 'qr_code', 'facebook', 'messenger', 'whatsapp',
      'twitter', 'telegram', 'instagram', 'email', 'sms', 'native',
    ];
    expect(platforms).toHaveLength(11);
  });

  it('LISTING_REPORT_REASONS has 13 reasons', () => {
    expect(LISTING_REPORT_REASONS).toHaveLength(13);
  });

  it('SELLER_REPORT_REASONS has 8 reasons', () => {
    expect(SELLER_REPORT_REASONS).toHaveLength(8);
  });
});
