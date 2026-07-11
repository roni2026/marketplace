/**
 * Shop CRUD and management functions for Phase 3.
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logAudit } from '@/lib/audit';
import { sanitizeText, validateSlug } from '@/lib/validation';
import { generateSlug } from '@/lib/constants';
import type {
  Shop,
  ShopInsert,
  ShopUpdate,
  ShopFollower,
  ShopCollection,
  ShopCollectionInsert,
  ShopCategory,
  ShopCategoryInsert,
  ShopCoupon,
  ShopCouponInsert,
  ShopAnnouncement,
  ShopAnnouncementInsert,
  ShopReview,
  ShopReviewInsert,
  ShopStaff,
  ShopStaffInsert,
} from '@/integrations/supabase/types_v3_shops';

// -------------------------------------------------------------------------
// Shop CRUD
// -------------------------------------------------------------------------

export async function createShop(userId: string, data: ShopInsert): Promise<Shop | null> {
  try {
    const slug = data.slug || generateSlug(data.name);

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from('shops')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (existing) {
      toast.error('A shop with this URL already exists. Please choose a different name.');
      return null;
    }

    const { data: shop, error } = await supabase
      .from('shops')
      .insert({ ...data, slug, owner_id: userId })
      .select()
      .single();

    if (error) throw error;

    // Create default membership
    await supabase
      .from('shop_memberships')
      .insert({
        shop_id: shop.id,
        user_id: userId,
        tier: 'basic',
        listing_limit: 50,
        is_active: true,
        monthly_fee: 0,
      });

    // Add owner as staff
    await supabase
      .from('shop_staff')
      .insert({
        shop_id: shop.id,
        user_id: userId,
        role: 'owner',
        is_active: true,
      });

    await logAudit({ action: 'create', resourceType: 'shop', resourceId: shop.id, details: { name: data.name } });
    toast.success('Shop created successfully!');
    return shop as Shop;
  } catch (error) {
    console.error('createShop error:', error);
    toast.error('Failed to create shop');
    return null;
  }
}

export async function getShopById(shopId: string): Promise<Shop | null> {
  try {
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .maybeSingle();
    if (error) throw error;
    return data as Shop | null;
  } catch (error) {
    console.error('getShopById error:', error);
    return null;
  }
}

export async function getShopBySlug(slug: string): Promise<Shop | null> {
  try {
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    return data as Shop | null;
  } catch (error) {
    console.error('getShopBySlug error:', error);
    return null;
  }
}

export async function getShopByOwner(ownerId: string): Promise<Shop | null> {
  try {
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .eq('owner_id', ownerId)
      .maybeSingle();
    if (error) throw error;
    return data as Shop | null;
  } catch (error) {
    console.error('getShopByOwner error:', error);
    return null;
  }
}

export async function updateShop(shopId: string, updates: ShopUpdate): Promise<Shop | null> {
  try {
    if (updates.slug) {
      const slugCheck = validateSlug(updates.slug);
      if (!slugCheck.valid) {
        toast.error('Invalid shop URL format');
        return null;
      }
    }

    const sanitizedUpdates: Record<string, unknown> = { ...updates };
    if (updates.name) sanitizedUpdates.name = sanitizeText(updates.name);
    if (updates.description) sanitizedUpdates.description = updates.description;

    const { data, error } = await supabase
      .from('shops')
      .update(sanitizedUpdates)
      .eq('id', shopId)
      .select()
      .single();

    if (error) throw error;

    await logAudit({ action: 'update', resourceType: 'shop', resourceId: shopId, details: updates });
    toast.success('Shop updated successfully!');
    return data as Shop;
  } catch (error) {
    console.error('updateShop error:', error);
    toast.error('Failed to update shop');
    return null;
  }
}

export async function deleteShop(shopId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('shops')
      .delete()
      .eq('id', shopId);
    if (error) throw error;

    await logAudit({ action: 'delete', resourceType: 'shop', resourceId: shopId });
    toast.success('Shop deleted');
    return true;
  } catch (error) {
    console.error('deleteShop error:', error);
    toast.error('Failed to delete shop');
    return false;
  }
}

export async function toggleVacationMode(
  shopId: string,
  isActive: boolean,
  message?: string
): Promise<Shop | null> {
  try {
    const { data, error } = await supabase
      .from('shops')
      .update({
        is_vacation_mode: isActive,
        vacation_message: message || null,
        vacation_until: null,
      })
      .eq('id', shopId)
      .select()
      .single();

    if (error) throw error;

    toast.success(isActive ? 'Vacation mode enabled' : 'Vacation mode disabled');
    return data as Shop;
  } catch (error) {
    console.error('toggleVacationMode error:', error);
    toast.error('Failed to toggle vacation mode');
    return null;
  }
}

// -------------------------------------------------------------------------
// Shop Discovery
// -------------------------------------------------------------------------

export async function searchShops(query: string, limit = 20): Promise<Shop[]> {
  try {
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(limit)
      .order('total_followers', { ascending: false });

    if (error) throw error;
    return (data as Shop[]) || [];
  } catch (error) {
    console.error('searchShops error:', error);
    return [];
  }
}

export async function getFeaturedShops(limit = 12): Promise<Shop[]> {
  try {
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .eq('is_featured', true)
      .limit(limit)
      .order('total_followers', { ascending: false });

    if (error) throw error;
    return (data as Shop[]) || [];
  } catch (error) {
    console.error('getFeaturedShops error:', error);
    return [];
  }
}

export async function getVerifiedShops(limit = 12): Promise<Shop[]> {
  try {
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .eq('is_verified', true)
      .limit(limit)
      .order('total_followers', { ascending: false });

    if (error) throw error;
    return (data as Shop[]) || [];
  } catch (error) {
    console.error('getVerifiedShops error:', error);
    return [];
  }
}

// -------------------------------------------------------------------------
// Shop Followers
// -------------------------------------------------------------------------

export async function followShop(shopId: string, followerId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('shop_followers')
      .insert({ shop_id: shopId, follower_id: followerId });

    if (error) {
      if (error.code === '23505') return true; // Already following
      throw error;
    }

    // Increment follower count
    await supabase.rpc('increment', {
      table_name: 'shops',
      column_name: 'total_followers',
      row_id: shopId,
      increment_by: 1,
    }).catch(async () => {
      // Fallback: manual update
      const { data: shop } = await supabase.from('shops').select('total_followers').eq('id', shopId).single();
      if (shop) {
        supabase.from('shops').update({ total_followers: (shop.total_followers || 0) + 1 }).eq('id', shopId);
      }
    });

    return true;
  } catch (error) {
    console.error('followShop error:', error);
    return false;
  }
}

export async function unfollowShop(shopId: string, followerId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('shop_followers')
      .delete()
      .eq('shop_id', shopId)
      .eq('follower_id', followerId);

    if (error) throw error;

    // Decrement follower count
    const { data: shop } = await supabase.from('shops').select('total_followers').eq('id', shopId).single();
    if (shop) {
      await supabase
        .from('shops')
        .update({ total_followers: Math.max((shop.total_followers || 0) - 1, 0) })
        .eq('id', shopId);
    }

    return true;
  } catch (error) {
    console.error('unfollowShop error:', error);
    return false;
  }
}

export async function isFollowingShop(shopId: string, followerId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('shop_followers')
      .select('id')
      .eq('shop_id', shopId)
      .eq('follower_id', followerId)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error('isFollowingShop error:', error);
    return false;
  }
}

export async function getShopFollowers(shopId: string): Promise<{ followers: ShopFollower[]; count: number }> {
  try {
    const { data, error } = await supabase
      .from('shop_followers')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    const followers = (data as ShopFollower[]) || [];
    return { followers, count: followers.length };
  } catch (error) {
    console.error('getShopFollowers error:', error);
    return { followers: [], count: 0 };
  }
}

// -------------------------------------------------------------------------
// Shop Collections
// -------------------------------------------------------------------------

export async function createShopCollection(shopId: string, data: ShopCollectionInsert): Promise<ShopCollection | null> {
  try {
    const { data: collection, error } = await supabase
      .from('shop_collections')
      .insert({ ...data, shop_id: shopId })
      .select()
      .single();

    if (error) throw error;
    toast.success('Collection created');
    return collection as ShopCollection;
  } catch (error) {
    console.error('createShopCollection error:', error);
    toast.error('Failed to create collection');
    return null;
  }
}

export async function getShopCollections(shopId: string): Promise<ShopCollection[]> {
  try {
    const { data, error } = await supabase
      .from('shop_collections')
      .select('*')
      .eq('shop_id', shopId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return (data as ShopCollection[]) || [];
  } catch (error) {
    console.error('getShopCollections error:', error);
    return [];
  }
}

export async function updateShopCollection(collectionId: string, updates: Partial<ShopCollection>): Promise<ShopCollection | null> {
  try {
    const { data, error } = await supabase
      .from('shop_collections')
      .update(updates)
      .eq('id', collectionId)
      .select()
      .single();

    if (error) throw error;
    toast.success('Collection updated');
    return data as ShopCollection;
  } catch (error) {
    console.error('updateShopCollection error:', error);
    toast.error('Failed to update collection');
    return null;
  }
}

export async function deleteShopCollection(collectionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('shop_collections')
      .delete()
      .eq('id', collectionId);

    if (error) throw error;
    toast.success('Collection deleted');
    return true;
  } catch (error) {
    console.error('deleteShopCollection error:', error);
    toast.error('Failed to delete collection');
    return false;
  }
}

export async function addAdToCollection(collectionId: string, adId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('shop_collection_items')
      .insert({ collection_id: collectionId, ad_id: adId });

    if (error) {
      if (error.code === '23505') return true; // Already added
      throw error;
    }
    return true;
  } catch (error) {
    console.error('addAdToCollection error:', error);
    return false;
  }
}

export async function removeAdFromCollection(collectionId: string, adId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('shop_collection_items')
      .delete()
      .eq('collection_id', collectionId)
      .eq('ad_id', adId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('removeAdFromCollection error:', error);
    return false;
  }
}

// -------------------------------------------------------------------------
// Shop Categories
// -------------------------------------------------------------------------

export async function createShopCategory(shopId: string, data: ShopCategoryInsert): Promise<ShopCategory | null> {
  try {
    const { data: category, error } = await supabase
      .from('shop_categories')
      .insert({ ...data, shop_id: shopId })
      .select()
      .single();

    if (error) throw error;
    toast.success('Category created');
    return category as ShopCategory;
  } catch (error) {
    console.error('createShopCategory error:', error);
    toast.error('Failed to create category');
    return null;
  }
}

export async function getShopCategories(shopId: string): Promise<ShopCategory[]> {
  try {
    const { data, error } = await supabase
      .from('shop_categories')
      .select('*')
      .eq('shop_id', shopId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return (data as ShopCategory[]) || [];
  } catch (error) {
    console.error('getShopCategories error:', error);
    return [];
  }
}

export async function updateShopCategory(categoryId: string, updates: Partial<ShopCategory>): Promise<ShopCategory | null> {
  try {
    const { data, error } = await supabase
      .from('shop_categories')
      .update(updates)
      .eq('id', categoryId)
      .select()
      .single();

    if (error) throw error;
    toast.success('Category updated');
    return data as ShopCategory;
  } catch (error) {
    console.error('updateShopCategory error:', error);
    toast.error('Failed to update category');
    return null;
  }
}

export async function deleteShopCategory(categoryId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('shop_categories')
      .delete()
      .eq('id', categoryId);

    if (error) throw error;
    toast.success('Category deleted');
    return true;
  } catch (error) {
    console.error('deleteShopCategory error:', error);
    toast.error('Failed to delete category');
    return false;
  }
}

// -------------------------------------------------------------------------
// Shop Coupons
// -------------------------------------------------------------------------

export async function createShopCoupon(shopId: string, data: ShopCouponInsert): Promise<ShopCoupon | null> {
  try {
    const { data: coupon, error } = await supabase
      .from('shop_coupons')
      .insert({ ...data, shop_id: shopId, code: data.code.toUpperCase() })
      .select()
      .single();

    if (error) throw error;
    toast.success('Coupon created');
    return coupon as ShopCoupon;
  } catch (error) {
    console.error('createShopCoupon error:', error);
    toast.error('Failed to create coupon');
    return null;
  }
}

export async function getShopCoupons(shopId: string): Promise<ShopCoupon[]> {
  try {
    const { data, error } = await supabase
      .from('shop_coupons')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as ShopCoupon[]) || [];
  } catch (error) {
    console.error('getShopCoupons error:', error);
    return [];
  }
}

export async function updateShopCoupon(couponId: string, updates: Partial<ShopCoupon>): Promise<ShopCoupon | null> {
  try {
    const { data, error } = await supabase
      .from('shop_coupons')
      .update(updates)
      .eq('id', couponId)
      .select()
      .single();

    if (error) throw error;
    toast.success('Coupon updated');
    return data as ShopCoupon;
  } catch (error) {
    console.error('updateShopCoupon error:', error);
    toast.error('Failed to update coupon');
    return null;
  }
}

export async function deleteShopCoupon(couponId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('shop_coupons')
      .delete()
      .eq('id', couponId);

    if (error) throw error;
    toast.success('Coupon deleted');
    return true;
  } catch (error) {
    console.error('deleteShopCoupon error:', error);
    toast.error('Failed to delete coupon');
    return false;
  }
}

export async function validateCoupon(shopId: string, code: string): Promise<ShopCoupon | null> {
  try {
    const { data, error } = await supabase
      .from('shop_coupons')
      .select('*')
      .eq('shop_id', shopId)
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const coupon = data as ShopCoupon;
    const now = new Date();

    if (coupon.starts_at && new Date(coupon.starts_at) > now) return null;
    if (coupon.expires_at && new Date(coupon.expires_at) < now) return null;
    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) return null;

    return coupon;
  } catch (error) {
    console.error('validateCoupon error:', error);
    return null;
  }
}

// -------------------------------------------------------------------------
// Shop Announcements
// -------------------------------------------------------------------------

export async function createShopAnnouncement(shopId: string, data: ShopAnnouncementInsert): Promise<ShopAnnouncement | null> {
  try {
    const { data: announcement, error } = await supabase
      .from('shop_announcements')
      .insert({ ...data, shop_id: shopId })
      .select()
      .single();

    if (error) throw error;
    toast.success('Announcement created');
    return announcement as ShopAnnouncement;
  } catch (error) {
    console.error('createShopAnnouncement error:', error);
    toast.error('Failed to create announcement');
    return null;
  }
}

export async function getShopAnnouncements(shopId: string): Promise<ShopAnnouncement[]> {
  try {
    const { data, error } = await supabase
      .from('shop_announcements')
      .select('*')
      .eq('shop_id', shopId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as ShopAnnouncement[]) || [];
  } catch (error) {
    console.error('getShopAnnouncements error:', error);
    return [];
  }
}

export async function updateShopAnnouncement(announcementId: string, updates: Partial<ShopAnnouncement>): Promise<ShopAnnouncement | null> {
  try {
    const { data, error } = await supabase
      .from('shop_announcements')
      .update(updates)
      .eq('id', announcementId)
      .select()
      .single();

    if (error) throw error;
    toast.success('Announcement updated');
    return data as ShopAnnouncement;
  } catch (error) {
    console.error('updateShopAnnouncement error:', error);
    toast.error('Failed to update announcement');
    return null;
  }
}

export async function deleteShopAnnouncement(announcementId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('shop_announcements')
      .delete()
      .eq('id', announcementId);

    if (error) throw error;
    toast.success('Announcement deleted');
    return true;
  } catch (error) {
    console.error('deleteShopAnnouncement error:', error);
    toast.error('Failed to delete announcement');
    return false;
  }
}

// -------------------------------------------------------------------------
// Shop Reviews
// -------------------------------------------------------------------------

export async function createShopReview(review: ShopReviewInsert): Promise<ShopReview | null> {
  try {
    const { data, error } = await supabase
      .from('shop_reviews')
      .insert(review)
      .select()
      .single();

    if (error) throw error;
    toast.success('Review submitted');
    return data as ShopReview;
  } catch (error) {
    console.error('createShopReview error:', error);
    toast.error('Failed to submit review');
    return null;
  }
}

export async function getShopReviews(shopId: string): Promise<ShopReview[]> {
  try {
    const { data, error } = await supabase
      .from('shop_reviews')
      .select('*')
      .eq('shop_id', shopId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as ShopReview[]) || [];
  } catch (error) {
    console.error('getShopReviews error:', error);
    return [];
  }
}

export async function replyToShopReview(reviewId: string, reply: string): Promise<ShopReview | null> {
  try {
    const { data, error } = await supabase
      .from('shop_reviews')
      .update({
        seller_reply: reply,
        seller_replied_at: new Date().toISOString(),
      })
      .eq('id', reviewId)
      .select()
      .single();

    if (error) throw error;
    toast.success('Reply posted');
    return data as ShopReview;
  } catch (error) {
    console.error('replyToShopReview error:', error);
    toast.error('Failed to post reply');
    return null;
  }
}

// -------------------------------------------------------------------------
// Shop Staff
// -------------------------------------------------------------------------

export async function createShopStaff(shopId: string, data: ShopStaffInsert): Promise<ShopStaff | null> {
  try {
    const { data: staff, error } = await supabase
      .from('shop_staff')
      .insert({ ...data, shop_id: shopId })
      .select()
      .single();

    if (error) throw error;
    toast.success('Staff member added');
    return staff as ShopStaff;
  } catch (error) {
    console.error('createShopStaff error:', error);
    toast.error('Failed to add staff member');
    return null;
  }
}

export async function getShopStaff(shopId: string): Promise<ShopStaff[]> {
  try {
    const { data, error } = await supabase
      .from('shop_staff')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data as ShopStaff[]) || [];
  } catch (error) {
    console.error('getShopStaff error:', error);
    return [];
  }
}

export async function updateShopStaff(staffId: string, updates: Partial<ShopStaff>): Promise<ShopStaff | null> {
  try {
    const { data, error } = await supabase
      .from('shop_staff')
      .update(updates)
      .eq('id', staffId)
      .select()
      .single();

    if (error) throw error;
    toast.success('Staff member updated');
    return data as ShopStaff;
  } catch (error) {
    console.error('updateShopStaff error:', error);
    toast.error('Failed to update staff member');
    return null;
  }
}

export async function removeShopStaff(staffId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('shop_staff')
      .delete()
      .eq('id', staffId);

    if (error) throw error;
    toast.success('Staff member removed');
    return true;
  } catch (error) {
    console.error('removeShopStaff error:', error);
    toast.error('Failed to remove staff member');
    return false;
  }
}
