import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  getShopByOwner,
  createShop as createShopFn,
  updateShop as updateShopFn,
  toggleVacationMode as toggleVacationFn,
  followShop as followShopFn,
  unfollowShop as unfollowShopFn,
  isFollowingShop as isFollowingFn,
  getShopCollections,
  getShopCategories,
  getShopCoupons,
  getShopAnnouncements,
  getShopReviews,
  getShopStaff,
} from '@/lib/shop';
import type {
  Shop,
  ShopInsert,
  ShopUpdate,
  ShopCollection,
  ShopCategory,
  ShopCoupon,
  ShopAnnouncement,
  ShopReview,
  ShopStaff,
} from '@/integrations/supabase/types_v3_shops';

export function useShop() {
  const { user } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [collections, setCollections] = useState<ShopCollection[]>([]);
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [coupons, setCoupons] = useState<ShopCoupon[]>([]);
  const [announcements, setAnnouncements] = useState<ShopAnnouncement[]>([]);
  const [reviews, setReviews] = useState<ShopReview[]>([]);
  const [staff, setStaff] = useState<ShopStaff[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShop = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getShopByOwner(user.id);
      setShop(data);
      if (data) {
        const [cols, cats, cps, anns, revs, staffList] = await Promise.all([
          getShopCollections(data.id),
          getShopCategories(data.id),
          getShopCoupons(data.id),
          getShopAnnouncements(data.id),
          getShopReviews(data.id),
          getShopStaff(data.id),
        ]);
        setCollections(cols);
        setCategories(cats);
        setCoupons(cps);
        setAnnouncements(anns);
        setReviews(revs);
        setStaff(staffList);
      }
    } catch (err) {
      setError('Failed to fetch shop data');
      console.error('fetchShop error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const createShop = useCallback(
    async (data: ShopInsert): Promise<Shop | null> => {
      if (!user) return null;
      const result = await createShopFn(user.id, data);
      if (result) {
        setShop(result);
        await fetchShop();
      }
      return result;
    },
    [user, fetchShop]
  );

  const updateShop = useCallback(
    async (updates: ShopUpdate): Promise<Shop | null> => {
      if (!shop) return null;
      const result = await updateShopFn(shop.id, updates);
      if (result) setShop(result);
      return result;
    },
    [shop]
  );

  const toggleVacation = useCallback(
    async (isActive: boolean, message?: string): Promise<Shop | null> => {
      if (!shop) return null;
      const result = await toggleVacationFn(shop.id, isActive, message);
      if (result) setShop(result);
      return result;
    },
    [shop]
  );

  const followShop = useCallback(
    async (shopId: string): Promise<boolean> => {
      if (!user) return false;
      const success = await followShopFn(shopId, user.id);
      if (success) setIsFollowing(true);
      return success;
    },
    [user]
  );

  const unfollowShop = useCallback(
    async (shopId: string): Promise<boolean> => {
      if (!user) return false;
      const success = await unfollowShopFn(shopId, user.id);
      if (success) setIsFollowing(false);
      return success;
    },
    [user]
  );

  const checkFollowing = useCallback(
    async (shopId: string) => {
      if (!user) return;
      const following = await isFollowingFn(shopId, user.id);
      setIsFollowing(following);
    },
    [user]
  );

  useEffect(() => {
    if (user) {
      fetchShop();
    } else {
      setShop(null);
      setIsLoading(false);
    }
  }, [user, fetchShop]);

  return {
    shop,
    collections,
    categories,
    coupons,
    announcements,
    reviews,
    staff,
    isFollowing,
    isLoading,
    error,
    fetchShop,
    createShop,
    updateShop,
    toggleVacation,
    followShop,
    unfollowShop,
    checkFollowing,
  };
}
