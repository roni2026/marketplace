/**
 * Phase 4 — Listing Management Hook
 *
 * Provides reactive access to all Phase 4 listing management features:
 * - Listing types & conditions
 * - Category attributes
 * - Listing CRUD with extended fields
 * - Listing actions (publish, pause, resume, mark sold, renew, relist, duplicate, archive, delete)
 * - Listing history
 * - Listing analytics
 * - Bulk operations
 * - Advanced search & filtering
 * - Validation
 * - Seller store info
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  getListingTypes, getAllListingTypes, createListingType, updateListingType, deleteListingType,
  getItemConditions, getAllItemConditions, createItemCondition, updateItemCondition, deleteItemCondition,
  getCategoryAttributes, createCategoryAttribute, updateCategoryAttribute, deleteCategoryAttribute,
  getListingHistory, logListingHistoryEntry,
  getListingAnalytics, recordAnalyticsEvent,
  createListing, updateListing, getListingById, getListingBySlug,
  publishListing, schedulePublishing, pauseListing, resumeListing, hideListing,
  markAsSold, renewListing, relistSoldListing, relistExpiredListing,
  archiveListing, restoreListing, deleteListing, softDeleteListing, duplicateListing, shareListing,
  createVariant, updateVariantExtended, deleteVariant, getVariantsExtended,
  bulkOperation, getBulkOperations,
  searchListings, validateListing, getSellerStoreInfo,
  setCoverImage, reorderImages, deleteImage,
  getPriceHistoryExtended,
  type CreateListingData,
} from '@/lib/listingManagement';
import type {
  ListingType, ListingTypeInsert, ListingTypeUpdate,
  ItemConditionConfig, ItemConditionConfigInsert, ItemConditionConfigUpdate,
  CategoryAttribute, CategoryAttributeInsert, CategoryAttributeUpdate,
  ListingHistoryRecord, ListingAnalyticsSummary,
  ExtendedListing, ExtendedListingVariant, ExtendedListingVariantInsert, ExtendedListingVariantUpdate,
  BulkListingOperation, BulkOperationType,
  ListingFilter, SortOption, ListingQueryParams, ListingQueryResult,
  SellerStoreInfo, ListingValidationResult, ListingValidationContext,
} from '@/integrations/supabase/types_v4_listings';

export function useListingManagement() {
  const { user } = useAuth();

  // Listing types
  const [listingTypes, setListingTypes] = useState<ListingType[]>([]);
  const [allListingTypes, setAllListingTypes] = useState<ListingType[]>([]);
  const [itemConditions, setItemConditions] = useState<ItemConditionConfig[]>([]);
  const [allItemConditions, setAllItemConditions] = useState<ItemConditionConfig[]>([]);
  const [categoryAttributes, setCategoryAttributes] = useState<CategoryAttribute[]>([]);
  const [history, setHistory] = useState<ListingHistoryRecord[]>([]);
  const [analytics, setAnalytics] = useState<ListingAnalyticsSummary | null>(null);
  const [variants, setVariants] = useState<ExtendedListingVariant[]>([]);
  const [bulkOperations, setBulkOperations] = useState<BulkListingOperation[]>([]);
  const [sellerStoreInfo, setSellerStoreInfo] = useState<SellerStoreInfo | null>(null);
  const [priceHistory, setPriceHistory] = useState<Array<{ id: string; old_price: number | null; new_price: number | null; changed_at: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch listing types
  const fetchListingTypes = useCallback(async () => {
    const data = await getListingTypes();
    setListingTypes(data);
    return data;
  }, []);

  const fetchAllListingTypes = useCallback(async () => {
    const data = await getAllListingTypes();
    setAllListingTypes(data);
  }, []);

  // Fetch item conditions
  const fetchItemConditions = useCallback(async () => {
    const data = await getItemConditions();
    setItemConditions(data);
    return data;
  }, []);

  const fetchAllItemConditions = useCallback(async () => {
    const data = await getAllItemConditions();
    setAllItemConditions(data);
  }, []);

  // Fetch category attributes
  const fetchCategoryAttributes = useCallback(async (categoryId: string) => {
    const data = await getCategoryAttributes(categoryId);
    setCategoryAttributes(data);
    return data;
  }, []);

  // Fetch listing history
  const fetchHistory = useCallback(async (adId: string) => {
    const data = await getListingHistory(adId);
    setHistory(data);
  }, []);

  // Fetch listing analytics
  const fetchAnalytics = useCallback(async (adId: string, days?: number) => {
    const data = await getListingAnalytics(adId, days);
    setAnalytics(data);
  }, []);

  // Fetch variants
  const fetchVariants = useCallback(async (adId: string) => {
    const data = await getVariantsExtended(adId);
    setVariants(data);
  }, []);

  // Fetch bulk operations
  const fetchBulkOperations = useCallback(async () => {
    if (!user) return;
    const data = await getBulkOperations(user.id);
    setBulkOperations(data);
  }, [user]);

  // Fetch seller store info
  const fetchSellerStoreInfo = useCallback(async (sellerId: string) => {
    const data = await getSellerStoreInfo(sellerId);
    setSellerStoreInfo(data);
  }, []);

  // Fetch price history
  const fetchPriceHistory = useCallback(async (adId: string) => {
    const data = await getPriceHistoryExtended(adId);
    setPriceHistory(data);
  }, []);

  // Create listing
  const handleCreateListing = useCallback(async (data: CreateListingData): Promise<ExtendedListing | null> => {
    if (!user) return null;
    setIsLoading(true);
    setError(null);
    try {
      const result = await createListing(user.id, data);
      return result;
    } catch (err) {
      setError('Failed to create listing');
      console.error('handleCreateListing:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Update listing
  const handleUpdateListing = useCallback(async (adId: string, updates: Partial<CreateListingData>): Promise<ExtendedListing | null> => {
    if (!user) return null;
    setIsLoading(true);
    setError(null);
    try {
      const result = await updateListing(adId, user.id, updates);
      return result;
    } catch (err) {
      setError('Failed to update listing');
      console.error('handleUpdateListing:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Listing actions
  const handlePublish = useCallback(async (adId: string) => {
    if (!user) return false;
    return publishListing(adId, user.id);
  }, [user]);

  const handleSchedule = useCallback(async (adId: string, scheduledAt: string) => {
    if (!user) return false;
    return schedulePublishing(adId, user.id, scheduledAt);
  }, [user]);

  const handlePause = useCallback(async (adId: string) => {
    if (!user) return false;
    return pauseListing(adId, user.id);
  }, [user]);

  const handleResume = useCallback(async (adId: string) => {
    if (!user) return false;
    return resumeListing(adId, user.id);
  }, [user]);

  const handleHide = useCallback(async (adId: string) => {
    if (!user) return false;
    return hideListing(adId, user.id);
  }, [user]);

  const handleMarkSold = useCallback(async (adId: string) => {
    if (!user) return false;
    return markAsSold(adId, user.id);
  }, [user]);

  const handleRenew = useCallback(async (adId: string) => {
    if (!user) return false;
    return renewListing(adId, user.id);
  }, [user]);

  const handleRelistSold = useCallback(async (adId: string) => {
    if (!user) return false;
    return relistSoldListing(adId, user.id);
  }, [user]);

  const handleRelistExpired = useCallback(async (adId: string) => {
    if (!user) return false;
    return relistExpiredListing(adId, user.id);
  }, [user]);

  const handleArchive = useCallback(async (adId: string) => {
    if (!user) return false;
    return archiveListing(adId, user.id);
  }, [user]);

  const handleRestore = useCallback(async (adId: string) => {
    if (!user) return false;
    return restoreListing(adId, user.id);
  }, [user]);

  const handleDelete = useCallback(async (adId: string) => {
    if (!user) return false;
    return deleteListing(adId, user.id);
  }, [user]);

  const handleSoftDelete = useCallback(async (adId: string) => {
    if (!user) return false;
    return softDeleteListing(adId, user.id);
  }, [user]);

  const handleDuplicate = useCallback(async (adId: string): Promise<ExtendedListing | null> => {
    if (!user) return null;
    return duplicateListing(adId, user.id);
  }, [user]);

  const handleShare = useCallback(async (adId: string): Promise<string | null> => {
    return shareListing(adId);
  }, []);

  // Variant management
  const handleCreateVariant = useCallback(async (adId: string, variant: Omit<ExtendedListingVariantInsert, 'ad_id'>) => {
    const data = await createVariant(adId, variant);
    if (data) setVariants(prev => [...prev, data]);
    return data;
  }, []);

  const handleUpdateVariant = useCallback(async (variantId: string, updates: ExtendedListingVariantUpdate) => {
    const data = await updateVariantExtended(variantId, updates);
    if (data) setVariants(prev => prev.map(v => v.id === variantId ? data : v));
    return data;
  }, []);

  const handleDeleteVariant = useCallback(async (variantId: string) => {
    const success = await deleteVariant(variantId);
    if (success) setVariants(prev => prev.filter(v => v.id !== variantId));
    return success;
  }, []);

  // Bulk operations
  const handleBulkOperation = useCallback(async (
    operation: BulkOperationType,
    adIds: string[],
    parameters?: Record<string, unknown>
  ): Promise<BulkListingOperation | null> => {
    if (!user) return null;
    const result = await bulkOperation(user.id, operation, adIds, parameters);
    if (result) {
      setBulkOperations(prev => [result, ...prev]);
    }
    return result;
  }, [user]);

  // Search
  const handleSearch = useCallback(async (params: ListingQueryParams): Promise<ListingQueryResult> => {
    return searchListings(params);
  }, []);

  // Validation
  const handleValidate = useCallback(async (ctx: ListingValidationContext): Promise<ListingValidationResult> => {
    return validateListing(ctx);
  }, []);

  // Image management
  const handleSetCoverImage = useCallback(async (adId: string, imageId: string) => {
    if (!user) return false;
    return setCoverImage(adId, imageId, user.id);
  }, [user]);

  const handleReorderImages = useCallback(async (adId: string, imageIds: string[]) => {
    if (!user) return false;
    return reorderImages(adId, imageIds, user.id);
  }, [user]);

  const handleDeleteImage = useCallback(async (adId: string, imageId: string) => {
    if (!user) return false;
    return deleteImage(adId, imageId, user.id);
  }, [user]);

  // Analytics event recording
  const handleRecordAnalytics = useCallback(async (adId: string, metric: string) => {
    await recordAnalyticsEvent(adId, metric);
  }, []);

  // Admin: Listing type management
  const handleCreateListingType = useCallback(async (type: ListingTypeInsert) => {
    const data = await createListingType(type);
    if (data) {
      setAllListingTypes(prev => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
      setListingTypes(prev => [...prev.filter(t => t.is_active), data].sort((a, b) => a.sort_order - b.sort_order));
    }
    return data;
  }, []);

  const handleUpdateListingType = useCallback(async (id: string, updates: ListingTypeUpdate) => {
    const data = await updateListingType(id, updates);
    if (data) {
      setAllListingTypes(prev => prev.map(t => t.id === id ? data : t));
      setListingTypes(prev => prev.map(t => t.id === id ? data : t).filter(t => t.is_active));
    }
    return data;
  }, []);

  const handleDeleteListingType = useCallback(async (id: string) => {
    const success = await deleteListingType(id);
    if (success) {
      setAllListingTypes(prev => prev.filter(t => t.id !== id));
      setListingTypes(prev => prev.filter(t => t.id !== id));
    }
    return success;
  }, []);

  // Admin: Item condition management
  const handleCreateItemCondition = useCallback(async (cond: ItemConditionConfigInsert) => {
    const data = await createItemCondition(cond);
    if (data) {
      setAllItemConditions(prev => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
      setItemConditions(prev => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
    }
    return data;
  }, []);

  const handleUpdateItemCondition = useCallback(async (id: string, updates: ItemConditionConfigUpdate) => {
    const data = await updateItemCondition(id, updates);
    if (data) {
      setAllItemConditions(prev => prev.map(c => c.id === id ? data : c));
      setItemConditions(prev => prev.map(c => c.id === id ? data : c).filter(c => c.is_active));
    }
    return data;
  }, []);

  const handleDeleteItemCondition = useCallback(async (id: string) => {
    const success = await deleteItemCondition(id);
    if (success) {
      setAllItemConditions(prev => prev.filter(c => c.id !== id));
      setItemConditions(prev => prev.filter(c => c.id !== id));
    }
    return success;
  }, []);

  // Admin: Category attribute management
  const handleCreateCategoryAttribute = useCallback(async (attr: CategoryAttributeInsert) => {
    const data = await createCategoryAttribute(attr);
    if (data) {
      setCategoryAttributes(prev => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
    }
    return data;
  }, []);

  const handleUpdateCategoryAttribute = useCallback(async (id: string, updates: CategoryAttributeUpdate) => {
    const data = await updateCategoryAttribute(id, updates);
    if (data) {
      setCategoryAttributes(prev => prev.map(a => a.id === id ? data : a));
    }
    return data;
  }, []);

  const handleDeleteCategoryAttribute = useCallback(async (id: string) => {
    const success = await deleteCategoryAttribute(id);
    if (success) {
      setCategoryAttributes(prev => prev.filter(a => a.id !== id));
    }
    return success;
  }, []);

  return {
    // State
    listingTypes,
    allListingTypes,
    itemConditions,
    allItemConditions,
    categoryAttributes,
    history,
    analytics,
    variants,
    bulkOperations,
    sellerStoreInfo,
    priceHistory,
    isLoading,
    error,

    // Fetch functions
    fetchListingTypes,
    fetchAllListingTypes,
    fetchItemConditions,
    fetchAllItemConditions,
    fetchCategoryAttributes,
    fetchHistory,
    fetchAnalytics,
    fetchVariants,
    fetchBulkOperations,
    fetchSellerStoreInfo,
    fetchPriceHistory,

    // Listing CRUD
    createListing: handleCreateListing,
    updateListing: handleUpdateListing,
    getListingById,
    getListingBySlug,

    // Listing actions
    publishListing: handlePublish,
    schedulePublishing: handleSchedule,
    pauseListing: handlePause,
    resumeListing: handleResume,
    hideListing: handleHide,
    markAsSold: handleMarkSold,
    renewListing: handleRenew,
    relistSoldListing: handleRelistSold,
    relistExpiredListing: handleRelistExpired,
    archiveListing: handleArchive,
    restoreListing: handleRestore,
    deleteListing: handleDelete,
    softDeleteListing: handleSoftDelete,
    duplicateListing: handleDuplicate,
    shareListing: handleShare,

    // Variants
    createVariant: handleCreateVariant,
    updateVariant: handleUpdateVariant,
    deleteVariant: handleDeleteVariant,

    // Bulk operations
    bulkOperation: handleBulkOperation,

    // Search
    searchListings: handleSearch,

    // Validation
    validateListing: handleValidate,

    // Image management
    setCoverImage: handleSetCoverImage,
    reorderImages: handleReorderImages,
    deleteImage: handleDeleteImage,

    // Analytics
    recordAnalytics: handleRecordAnalytics,

    // Admin: Listing types
    createListingType: handleCreateListingType,
    updateListingType: handleUpdateListingType,
    deleteListingType: handleDeleteListingType,

    // Admin: Item conditions
    createItemCondition: handleCreateItemCondition,
    updateItemCondition: handleUpdateItemCondition,
    deleteItemCondition: handleDeleteItemCondition,

    // Admin: Category attributes
    createCategoryAttribute: handleCreateCategoryAttribute,
    updateCategoryAttribute: handleUpdateCategoryAttribute,
    deleteCategoryAttribute: handleDeleteCategoryAttribute,
  };
}
