/**
 * Phase 4 — Listing Management Library
 *
 * Comprehensive listing management utilities:
 * - Configurable listing types & item conditions CRUD
 * - Category attributes CRUD
 * - Extended listing CRUD with all Phase 4 fields
 * - Listing history tracking
 * - Listing analytics
 * - Bulk operations
 * - Advanced search & filtering
 * - Validation (duplicate detection, SKU/barcode uniqueness, etc.)
 * - Seller store integration
 * - Listing actions (publish, schedule, pause, resume, mark sold, renew, relist, duplicate, archive, delete)
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  ListingType, ListingTypeInsert, ListingTypeUpdate,
  ItemConditionConfig, ItemConditionConfigInsert, ItemConditionConfigUpdate,
  CategoryAttribute, CategoryAttributeInsert, CategoryAttributeUpdate,
  ListingHistoryRecord, ListingHistoryInsert,
  ListingAnalyticsRecord, ListingAnalyticsSummary,
  ExtendedListing, ExtendedListingVariant, ExtendedListingVariantInsert, ExtendedListingVariantUpdate,
  BulkListingOperation, BulkOperationType,
  ConditionDetails, ListingValidationResult, ListingValidationContext,
  ListingFilter, SortOption, ListingQueryParams, ListingQueryResult,
  SellerStoreInfo, WarrantyType, ShippingMethod, ShippingFeeType,
} from '@/integrations/supabase/types_v4_listings';
import { sanitizeText, sanitizeRichText } from '@/lib/validation';
import { generateSlug } from '@/lib/constants';

// =========================================================================
// Configurable Listing Types
// =========================================================================

export async function getListingTypes(): Promise<ListingType[]> {
  const { data, error } = await supabase
    .from('listing_types')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) { console.error('getListingTypes error:', error); return []; }
  return (data as ListingType[]) || [];
}

export async function getAllListingTypes(): Promise<ListingType[]> {
  const { data, error } = await supabase
    .from('listing_types')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) { console.error('getAllListingTypes error:', error); return []; }
  return (data as ListingType[]) || [];
}

export async function createListingType(type: ListingTypeInsert): Promise<ListingType | null> {
  const { data, error } = await supabase
    .from('listing_types')
    .insert(type)
    .select()
    .single();
  if (error) { toast.error('Failed to create listing type'); console.error('createListingType:', error); return null; }
  toast.success('Listing type created');
  return data as ListingType;
}

export async function updateListingType(id: string, updates: ListingTypeUpdate): Promise<ListingType | null> {
  const { data, error } = await supabase
    .from('listing_types')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) { toast.error('Failed to update listing type'); console.error('updateListingType:', error); return null; }
  toast.success('Listing type updated');
  return data as ListingType;
}

export async function deleteListingType(id: string): Promise<boolean> {
  const { error } = await supabase.from('listing_types').delete().eq('id', id);
  if (error) { toast.error('Failed to delete listing type'); console.error('deleteListingType:', error); return false; }
  toast.success('Listing type deleted');
  return true;
}

// =========================================================================
// Configurable Item Conditions
// =========================================================================

export async function getItemConditions(): Promise<ItemConditionConfig[]> {
  const { data, error } = await supabase
    .from('item_conditions')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) { console.error('getItemConditions error:', error); return []; }
  return (data as ItemConditionConfig[]) || [];
}

export async function getAllItemConditions(): Promise<ItemConditionConfig[]> {
  const { data, error } = await supabase
    .from('item_conditions')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) { console.error('getAllItemConditions error:', error); return []; }
  return (data as ItemConditionConfig[]) || [];
}

export async function createItemCondition(cond: ItemConditionConfigInsert): Promise<ItemConditionConfig | null> {
  const { data, error } = await supabase
    .from('item_conditions')
    .insert(cond)
    .select()
    .single();
  if (error) { toast.error('Failed to create condition'); console.error('createItemCondition:', error); return null; }
  toast.success('Condition created');
  return data as ItemConditionConfig;
}

export async function updateItemCondition(id: string, updates: ItemConditionConfigUpdate): Promise<ItemConditionConfig | null> {
  const { data, error } = await supabase
    .from('item_conditions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) { toast.error('Failed to update condition'); console.error('updateItemCondition:', error); return null; }
  toast.success('Condition updated');
  return data as ItemConditionConfig;
}

export async function deleteItemCondition(id: string): Promise<boolean> {
  const { error } = await supabase.from('item_conditions').delete().eq('id', id);
  if (error) { toast.error('Failed to delete condition'); console.error('deleteItemCondition:', error); return false; }
  toast.success('Condition deleted');
  return true;
}

// =========================================================================
// Category Attributes
// =========================================================================

export async function getCategoryAttributes(categoryId: string): Promise<CategoryAttribute[]> {
  const { data, error } = await supabase
    .from('category_attributes')
    .select('*')
    .eq('category_id', categoryId)
    .order('sort_order', { ascending: true });
  if (error) { console.error('getCategoryAttributes error:', error); return []; }
  return (data as CategoryAttribute[]) || [];
}

export async function createCategoryAttribute(attr: CategoryAttributeInsert): Promise<CategoryAttribute | null> {
  const { data, error } = await supabase
    .from('category_attributes')
    .insert(attr)
    .select()
    .single();
  if (error) { toast.error('Failed to create attribute'); console.error('createCategoryAttribute:', error); return null; }
  toast.success('Attribute created');
  return data as CategoryAttribute;
}

export async function updateCategoryAttribute(id: string, updates: CategoryAttributeUpdate): Promise<CategoryAttribute | null> {
  const { data, error } = await supabase
    .from('category_attributes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) { toast.error('Failed to update attribute'); console.error('updateCategoryAttribute:', error); return null; }
  toast.success('Attribute updated');
  return data as CategoryAttribute;
}

export async function deleteCategoryAttribute(id: string): Promise<boolean> {
  const { error } = await supabase.from('category_attributes').delete().eq('id', id);
  if (error) { toast.error('Failed to delete attribute'); console.error('deleteCategoryAttribute:', error); return false; }
  toast.success('Attribute deleted');
  return true;
}

// =========================================================================
// Listing History
// =========================================================================

export async function getListingHistory(adId: string): Promise<ListingHistoryRecord[]> {
  const { data, error } = await supabase
    .from('listing_history')
    .select('*')
    .eq('ad_id', adId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getListingHistory error:', error); return []; }
  return (data as ListingHistoryRecord[]) || [];
}

export async function logListingHistoryEntry(entry: ListingHistoryInsert): Promise<void> {
  try {
    await supabase.from('listing_history').insert(entry);
  } catch (err) {
    console.error('logListingHistoryEntry error:', err);
  }
}

// =========================================================================
// Listing Analytics
// =========================================================================

export async function getListingAnalytics(adId: string, days: number = 30): Promise<ListingAnalyticsSummary> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('listing_analytics')
    .select('*')
    .eq('ad_id', adId)
    .gte('stat_date', startDateStr)
    .order('stat_date', { ascending: true });

  if (error) { console.error('getListingAnalytics error:', error); }

  const records = (data as ListingAnalyticsRecord[]) || [];

  // Get listing creation date for age calculation
  const { data: adData } = await supabase
    .from('ads')
    .select('created_at')
    .eq('id', adId)
    .single();

  const createdAt = adData ? new Date(adData.created_at) : new Date();
  const listingAgeDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

  return {
    total_views: records.reduce((sum, r) => sum + r.total_views, 0),
    unique_visitors: records.reduce((sum, r) => sum + r.unique_visitors, 0),
    favorites: records.reduce((sum, r) => sum + r.favorites, 0),
    shares: records.reduce((sum, r) => sum + r.shares, 0),
    messages_received: records.reduce((sum, r) => sum + r.messages_received, 0),
    contact_clicks: records.reduce((sum, r) => sum + r.contact_clicks, 0),
    inquiries: records.reduce((sum, r) => sum + r.inquiries, 0),
    listing_age_days: listingAgeDays,
    daily_breakdown: records,
  };
}

export async function recordAnalyticsEvent(adId: string, metric: string, increment: number = 1): Promise<void> {
  try {
    await supabase.rpc('record_listing_analytics', {
      p_ad_id: adId,
      p_metric: metric,
      p_increment: increment,
    });
  } catch (err) {
    console.error('recordAnalyticsEvent error:', err);
  }
}

// =========================================================================
// Extended Listing CRUD
// =========================================================================

export interface CreateListingData {
  title: string;
  description: string;
  rich_description?: string;
  short_description?: string;
  category_id: string;
  subcategory_id?: string | null;
  price: number | null;
  original_price?: number | null;
  price_type: string;
  is_negotiable?: boolean;
  min_offer?: number | null;
  currency?: string;
  condition: string;
  listing_type?: string;
  brand?: string;
  model?: string;
  tags?: string[];
  sku?: string;
  barcode?: string;
  serial_number?: string;
  mpn?: string;
  product_attributes?: Record<string, unknown>;
  condition_details?: ConditionDetails;
  division: string;
  district: string;
  area?: string;
  status?: string;
  shop_id?: string | null;
  shipping_methods?: ShippingMethod[];
  shipping_fee_type?: ShippingFeeType;
  shipping_fee?: number;
  free_shipping?: boolean;
  estimated_delivery_days?: number;
  handling_time_days?: number;
  delivery_locations?: string[];
  warranty_type?: WarrantyType;
  warranty_duration_months?: number;
  warranty_coverage?: string;
  warranty_terms?: string;
  scheduled_at?: string | null;
  contact_phone?: string;
  secondary_phone?: string;
}

export async function createListing(userId: string, data: CreateListingData): Promise<ExtendedListing | null> {
  const slug = generateSlug(data.title) + '-' + Date.now().toString(36);

  // Calculate discount
  let discountAmount: number | null = null;
  let discountPercentage: number | null = null;
  if (data.original_price && data.original_price > 0 && data.price !== null && data.price < data.original_price) {
    discountAmount = data.original_price - data.price;
    discountPercentage = Math.round((discountAmount / data.original_price) * 100);
  }

  const payload: Record<string, unknown> = {
    user_id: userId,
    title: sanitizeText(data.title),
    slug,
    description: data.description ? sanitizeRichText(data.description) : null,
    rich_description: data.rich_description ? sanitizeRichText(data.rich_description) : null,
    short_description: data.short_description ? sanitizeText(data.short_description) : null,
    category_id: data.category_id,
    subcategory_id: data.subcategory_id || null,
    price: data.price,
    original_price: data.original_price || null,
    discount_amount: discountAmount,
    discount_percentage: discountPercentage,
    price_type: data.price_type,
    is_negotiable: data.is_negotiable || false,
    min_offer: data.min_offer || null,
    currency: data.currency || 'BDT',
    condition: data.condition,
    listing_type: data.listing_type || 'new',
    brand: data.brand || null,
    model: data.model || null,
    tags: data.tags || [],
    sku: data.sku || null,
    barcode: data.barcode || null,
    serial_number: data.serial_number || null,
    mpn: data.mpn || null,
    product_attributes: data.product_attributes || {},
    condition_details: data.condition_details || {},
    division: data.division,
    district: data.district,
    area: data.area || null,
    status: data.status || 'pending',
    shop_id: data.shop_id || null,
    shipping_methods: data.shipping_methods || [],
    shipping_fee_type: data.shipping_fee_type || 'free',
    shipping_fee: data.shipping_fee || 0,
    free_shipping: data.free_shipping || false,
    estimated_delivery_days: data.estimated_delivery_days || null,
    handling_time_days: data.handling_time_days || null,
    delivery_locations: data.delivery_locations || [],
    warranty_type: data.warranty_type || 'none',
    warranty_duration_months: data.warranty_duration_months || null,
    warranty_coverage: data.warranty_coverage || null,
    warranty_terms: data.warranty_terms || null,
    scheduled_at: data.scheduled_at || null,
    contact_phone: data.contact_phone || null,
    secondary_phone: data.secondary_phone || null,
  };

  const { data: result, error } = await supabase
    .from('ads')
    .insert(payload)
    .select()
    .single();

  if (error) {
    toast.error('Failed to create listing');
    console.error('createListing error:', error);
    return null;
  }

  const listing = result as ExtendedListing;

  // Save contact_phone to the user's profile so it's pre-filled next time
  if (data.contact_phone) {
    await supabase
      .from('profiles')
      .update({ phone_number: data.contact_phone.trim(), updated_at: new Date().toISOString() })
      .eq('user_id', userId);
  }

  // Save secondary_phone to the user's profile if provided
  if (data.secondary_phone) {
    await supabase
      .from('profiles')
      .update({ secondary_phone: data.secondary_phone.trim(), updated_at: new Date().toISOString() })
      .eq('user_id', userId);
  }

  // Log history
  await logListingHistoryEntry({
    ad_id: listing.id,
    user_id: userId,
    action: 'created',
    new_value: payload as Record<string, unknown>,
  });

  toast.success('Listing created');
  return listing;
}

export async function updateListing(adId: string, userId: string, updates: Partial<CreateListingData>): Promise<ExtendedListing | null> {
  // Fetch current state for history
  const { data: current } = await supabase
    .from('ads')
    .select('*')
    .eq('id', adId)
    .single();

  if (!current) { toast.error('Listing not found'); return null; }

  // Calculate discount if price fields changed
  const newPrice = updates.price !== undefined ? updates.price : (current as Record<string, unknown>).price as number | null;
  const newOriginal = updates.original_price !== undefined ? updates.original_price : (current as Record<string, unknown>).original_price as number | null;
  let discountAmount: number | null = null;
  let discountPercentage: number | null = null;
  if (newOriginal && newOriginal > 0 && newPrice !== null && newPrice < newOriginal) {
    discountAmount = newOriginal - newPrice;
    discountPercentage = Math.round((discountAmount / newOriginal) * 100);
  }

  const payload: Record<string, unknown> = {};
  if (updates.title !== undefined) payload.title = sanitizeText(updates.title);
  if (updates.description !== undefined) payload.description = updates.description ? sanitizeRichText(updates.description) : null;
  if (updates.rich_description !== undefined) payload.rich_description = updates.rich_description ? sanitizeRichText(updates.rich_description) : null;
  if (updates.short_description !== undefined) payload.short_description = updates.short_description ? sanitizeText(updates.short_description) : null;
  if (updates.category_id !== undefined) payload.category_id = updates.category_id;
  if (updates.subcategory_id !== undefined) payload.subcategory_id = updates.subcategory_id;
  if (updates.price !== undefined) payload.price = updates.price;
  if (updates.original_price !== undefined) payload.original_price = updates.original_price;
  if (updates.price_type !== undefined) payload.price_type = updates.price_type;
  if (updates.is_negotiable !== undefined) payload.is_negotiable = updates.is_negotiable;
  if (updates.min_offer !== undefined) payload.min_offer = updates.min_offer;
  if (updates.currency !== undefined) payload.currency = updates.currency;
  if (updates.condition !== undefined) payload.condition = updates.condition;
  if (updates.listing_type !== undefined) payload.listing_type = updates.listing_type;
  if (updates.brand !== undefined) payload.brand = updates.brand;
  if (updates.model !== undefined) payload.model = updates.model;
  if (updates.tags !== undefined) payload.tags = updates.tags;
  if (updates.sku !== undefined) payload.sku = updates.sku;
  if (updates.barcode !== undefined) payload.barcode = updates.barcode;
  if (updates.serial_number !== undefined) payload.serial_number = updates.serial_number;
  if (updates.mpn !== undefined) payload.mpn = updates.mpn;
  if (updates.product_attributes !== undefined) payload.product_attributes = updates.product_attributes;
  if (updates.condition_details !== undefined) payload.condition_details = updates.condition_details;
  if (updates.division !== undefined) payload.division = updates.division;
  if (updates.district !== undefined) payload.district = updates.district;
  if (updates.area !== undefined) payload.area = updates.area;
  if (updates.shop_id !== undefined) payload.shop_id = updates.shop_id;
  if (updates.shipping_methods !== undefined) payload.shipping_methods = updates.shipping_methods;
  if (updates.shipping_fee_type !== undefined) payload.shipping_fee_type = updates.shipping_fee_type;
  if (updates.shipping_fee !== undefined) payload.shipping_fee = updates.shipping_fee;
  if (updates.free_shipping !== undefined) payload.free_shipping = updates.free_shipping;
  if (updates.estimated_delivery_days !== undefined) payload.estimated_delivery_days = updates.estimated_delivery_days;
  if (updates.handling_time_days !== undefined) payload.handling_time_days = updates.handling_time_days;
  if (updates.delivery_locations !== undefined) payload.delivery_locations = updates.delivery_locations;
  if (updates.warranty_type !== undefined) payload.warranty_type = updates.warranty_type;
  if (updates.warranty_duration_months !== undefined) payload.warranty_duration_months = updates.warranty_duration_months;
  if (updates.warranty_coverage !== undefined) payload.warranty_coverage = updates.warranty_coverage;
  if (updates.warranty_terms !== undefined) payload.warranty_terms = updates.warranty_terms;
  if (updates.scheduled_at !== undefined) payload.scheduled_at = updates.scheduled_at;
  if (updates.contact_phone !== undefined) payload.contact_phone = updates.contact_phone || null;
  if (updates.secondary_phone !== undefined) payload.secondary_phone = updates.secondary_phone || null;
  payload.discount_amount = discountAmount;
  payload.discount_percentage = discountPercentage;
  payload.updated_at = new Date().toISOString();

  // If the ad was previously approved, set it back to pending for re-review
  // and mark it as an edited resubmit so it shows up in the "Edited" queue
  const currentStatus = (current as Record<string, unknown>).status as string;
  if (currentStatus === 'approved' && updates.status !== 'draft') {
    payload.status = 'pending';
    payload.rejection_reason_code = 'edited_resubmit';
    payload.rejection_message = null;
  }

  const { data: result, error } = await supabase
    .from('ads')
    .update(payload)
    .eq('id', adId)
    .select()
    .single();

  if (error) { toast.error('Failed to update listing'); console.error('updateListing error:', error); return null; }

  const listing = result as ExtendedListing;

  // Save contact_phone to the user's profile so it's pre-filled next time
  if (updates.contact_phone) {
    await supabase
      .from('profiles')
      .update({ phone_number: updates.contact_phone.trim(), updated_at: new Date().toISOString() })
      .eq('user_id', userId);
  }

  // Save secondary_phone to the user's profile if provided
  if (updates.secondary_phone) {
    await supabase
      .from('profiles')
      .update({ secondary_phone: updates.secondary_phone.trim(), updated_at: new Date().toISOString() })
      .eq('user_id', userId);
  }

  // Log history - detect what changed
  const changedFields: Record<string, { old: unknown; new: unknown }> = {};
  for (const key of Object.keys(payload)) {
    if (key === 'updated_at' || key === 'discount_amount' || key === 'discount_percentage') continue;
    const oldVal = (current as Record<string, unknown>)[key];
    const newVal = payload[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changedFields[key] = { old: oldVal, new: newVal };
    }
  }

  if (Object.keys(changedFields).length > 0) {
    const isPriceChange = 'price' in changedFields || 'original_price' in changedFields;
    await logListingHistoryEntry({
      ad_id: adId,
      user_id: userId,
      action: isPriceChange ? 'price_changed' : 'edited',
      previous_value: Object.fromEntries(Object.entries(changedFields).map(([k, v]) => [k, v.old])) as Record<string, unknown>,
      new_value: Object.fromEntries(Object.entries(changedFields).map(([k, v]) => [k, v.new])) as Record<string, unknown>,
      field_name: Object.keys(changedFields).join(', '),
    });
  }

  return listing;
}

export async function getListingById(adId: string): Promise<ExtendedListing | null> {
  const { data, error } = await supabase
    .from('ads')
    .select('*')
    .eq('id', adId)
    .single();
  if (error) { console.error('getListingById error:', error); return null; }
  return data as ExtendedListing;
}

export async function getListingBySlug(slug: string): Promise<ExtendedListing | null> {
  const { data, error } = await supabase
    .from('ads')
    .select('*')
    .eq('slug', slug)
    .single();
  if (error) { console.error('getListingBySlug error:', error); return null; }
  return data as ExtendedListing;
}

// =========================================================================
// Listing Actions
// =========================================================================

export async function publishListing(adId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('ads')
    .update({ status: 'pending', updated_at: new Date().toISOString() })
    .eq('id', adId)
    .eq('user_id', userId);
  if (error) { toast.error('Failed to publish listing'); return false; }
  await logListingHistoryEntry({ ad_id: adId, user_id: userId, action: 'published' });
  toast.success('Listing published for review');
  return true;
}

export async function schedulePublishing(adId: string, userId: string, scheduledAt: string): Promise<boolean> {
  const { error } = await supabase
    .from('ads')
    .update({ status: 'scheduled', scheduled_at: scheduledAt, updated_at: new Date().toISOString() })
    .eq('id', adId)
    .eq('user_id', userId);
  if (error) { toast.error('Failed to schedule listing'); return false; }
  await logListingHistoryEntry({ ad_id: adId, user_id: userId, action: 'scheduled', new_value: { scheduled_at: scheduledAt } });
  toast.success('Listing scheduled');
  return true;
}

export async function pauseListing(adId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('ads')
    .update({ status: 'paused', updated_at: new Date().toISOString() })
    .eq('id', adId)
    .eq('user_id', userId);
  if (error) { toast.error('Failed to pause listing'); return false; }
  await logListingHistoryEntry({ ad_id: adId, user_id: userId, action: 'paused' });
  toast.success('Listing paused');
  return true;
}

export async function resumeListing(adId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('ads')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', adId)
    .eq('user_id', userId);
  if (error) { toast.error('Failed to resume listing'); return false; }
  await logListingHistoryEntry({ ad_id: adId, user_id: userId, action: 'resumed' });
  toast.success('Listing resumed');
  return true;
}

export async function hideListing(adId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('ads')
    .update({ status: 'hidden', updated_at: new Date().toISOString() })
    .eq('id', adId)
    .eq('user_id', userId);
  if (error) { toast.error('Failed to hide listing'); return false; }
  await logListingHistoryEntry({ ad_id: adId, user_id: userId, action: 'hidden' });
  toast.success('Listing hidden');
  return true;
}

export async function markAsSold(adId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('ads')
    .update({ status: 'sold', sold_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', adId)
    .eq('user_id', userId);
  if (error) { toast.error('Failed to mark as sold'); return false; }
  await logListingHistoryEntry({ ad_id: adId, user_id: userId, action: 'marked_sold' });
  toast.success('Listing marked as sold');
  return true;
}

export async function renewListing(adId: string, userId: string): Promise<boolean> {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from('ads')
    .update({ expires_at: expiresAt, renewed_at: new Date().toISOString(), status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', adId)
    .eq('user_id', userId);
  if (error) { toast.error('Failed to renew listing'); return false; }
  await logListingHistoryEntry({ ad_id: adId, user_id: userId, action: 'renewed', new_value: { expires_at: expiresAt } });
  toast.success('Listing renewed');
  return true;
}

export async function relistSoldListing(adId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('ads')
    .update({ status: 'approved', sold_at: null, updated_at: new Date().toISOString() })
    .eq('id', adId)
    .eq('user_id', userId);
  if (error) { toast.error('Failed to relist'); return false; }
  await logListingHistoryEntry({ ad_id: adId, user_id: userId, action: 'relisted' });
  toast.success('Listing relisted');
  return true;
}

export async function relistExpiredListing(adId: string, userId: string): Promise<boolean> {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from('ads')
    .update({ status: 'approved', expires_at: expiresAt, updated_at: new Date().toISOString() })
    .eq('id', adId)
    .eq('user_id', userId);
  if (error) { toast.error('Failed to relist'); return false; }
  await logListingHistoryEntry({ ad_id: adId, user_id: userId, action: 'relisted', new_value: { expires_at: expiresAt } });
  toast.success('Expired listing relisted');
  return true;
}

export async function archiveListing(adId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('ads')
    .update({ status: 'archived', archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', adId)
    .eq('user_id', userId);
  if (error) { toast.error('Failed to archive listing'); return false; }
  await logListingHistoryEntry({ ad_id: adId, user_id: userId, action: 'archived' });
  toast.success('Listing archived');
  return true;
}

export async function restoreListing(adId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('ads')
    .update({ status: 'draft', archived_at: null, deleted_at: null, updated_at: new Date().toISOString() })
    .eq('id', adId)
    .eq('user_id', userId);
  if (error) { toast.error('Failed to restore listing'); return false; }
  await logListingHistoryEntry({ ad_id: adId, user_id: userId, action: 'restored' });
  toast.success('Listing restored');
  return true;
}

export async function deleteListing(adId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('ads')
    .delete()
    .eq('id', adId)
    .eq('user_id', userId);
  if (error) { toast.error('Failed to delete listing'); return false; }
  await logListingHistoryEntry({ ad_id: adId, user_id: userId, action: 'deleted' });
  toast.success('Listing deleted');
  return true;
}

export async function softDeleteListing(adId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('ads')
    .update({ deleted_at: new Date().toISOString(), status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', adId)
    .eq('user_id', userId);
  if (error) { toast.error('Failed to delete listing'); return false; }
  await logListingHistoryEntry({ ad_id: adId, user_id: userId, action: 'deleted' });
  toast.success('Listing deleted');
  return true;
}

export async function duplicateListing(adId: string, userId: string): Promise<ExtendedListing | null> {
  const original = await getListingById(adId);
  if (!original) { toast.error('Listing not found'); return null; }

  const slug = generateSlug(original.title) + '-' + Date.now().toString(36);
  const { data, error } = await supabase
    .from('ads')
    .insert({
      user_id: userId,
      title: `${original.title} (Copy)`,
      slug,
      description: original.description,
      rich_description: original.rich_description,
      short_description: original.short_description,
      category_id: original.category_id,
      subcategory_id: original.subcategory_id,
      price: original.price,
      original_price: original.original_price,
      price_type: original.price_type,
      is_negotiable: original.is_negotiable,
      min_offer: original.min_offer,
      currency: original.currency,
      condition: original.condition,
      listing_type: original.listing_type,
      brand: original.brand,
      model: original.model,
      tags: original.tags,
      product_attributes: original.product_attributes,
      condition_details: original.condition_details,
      division: original.division,
      district: original.district,
      area: original.area,
      status: 'draft',
      shop_id: original.shop_id,
      shipping_methods: original.shipping_methods,
      shipping_fee_type: original.shipping_fee_type,
      shipping_fee: original.shipping_fee,
      free_shipping: original.free_shipping,
      estimated_delivery_days: original.estimated_delivery_days,
      handling_time_days: original.handling_time_days,
      delivery_locations: original.delivery_locations,
      warranty_type: original.warranty_type,
      warranty_duration_months: original.warranty_duration_months,
      warranty_coverage: original.warranty_coverage,
      warranty_terms: original.warranty_terms,
    })
    .select()
    .single();

  if (error) { toast.error('Failed to duplicate listing'); console.error('duplicateListing:', error); return null; }

  const duplicate = data as ExtendedListing;

  // Copy images
  const { data: images } = await supabase
    .from('ad_images')
    .select('*')
    .eq('ad_id', adId)
    .order('sort_order');

  if (images && images.length > 0) {
    const imageInserts = images.map(img => ({
      ad_id: duplicate.id,
      image_url: img.image_url,
      sort_order: img.sort_order || 0,
    }));
    await supabase.from('ad_images').insert(imageInserts);
  }

  // Copy variants
  const { data: variants } = await supabase
    .from('listing_variants')
    .select('*')
    .eq('ad_id', adId);

  if (variants && variants.length > 0) {
    const variantInserts = variants.map(v => ({
      ad_id: duplicate.id,
      name: v.name,
      sku: v.sku,
      barcode: v.barcode,
      serial_number: v.serial_number,
      price: v.price,
      stock: v.stock,
      attributes: v.attributes,
      image_url: (v as Record<string, unknown>).image_url || null,
      is_available: (v as Record<string, unknown>).is_available || true,
      sort_order: (v as Record<string, unknown>).sort_order || 0,
    }));
    await supabase.from('listing_variants').insert(variantInserts);
  }

  await logListingHistoryEntry({ ad_id: duplicate.id, user_id: userId, action: 'duplicated', notes: `Duplicated from ${adId}` });
  toast.success('Listing duplicated');
  return duplicate;
}

export async function shareListing(adId: string): Promise<string | null> {
  const { data } = await supabase
    .from('ads')
    .select('slug')
    .eq('id', adId)
    .single();
  if (!data) return null;
  const url = `${window.location.origin}/ad/${data.slug}`;
  await recordAnalyticsEvent(adId, 'share');
  return url;
}

// =========================================================================
// Listing Variants (extended)
// =========================================================================

export async function createVariant(adId: string, variant: Omit<ExtendedListingVariantInsert, 'ad_id'>): Promise<ExtendedListingVariant | null> {
  const { data, error } = await supabase
    .from('listing_variants')
    .insert({ ...variant, ad_id: adId })
    .select()
    .single();
  if (error) { toast.error('Failed to create variant'); console.error('createVariant:', error); return null; }
  toast.success('Variant created');
  return data as ExtendedListingVariant;
}

export async function updateVariantExtended(variantId: string, updates: ExtendedListingVariantUpdate): Promise<ExtendedListingVariant | null> {
  const { data, error } = await supabase
    .from('listing_variants')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', variantId)
    .select()
    .single();
  if (error) { toast.error('Failed to update variant'); console.error('updateVariantExtended:', error); return null; }
  toast.success('Variant updated');
  return data as ExtendedListingVariant;
}

export async function deleteVariant(variantId: string): Promise<boolean> {
  const { error } = await supabase.from('listing_variants').delete().eq('id', variantId);
  if (error) { toast.error('Failed to delete variant'); return false; }
  toast.success('Variant deleted');
  return true;
}

export async function getVariantsExtended(adId: string): Promise<ExtendedListingVariant[]> {
  const { data, error } = await supabase
    .from('listing_variants')
    .select('*')
    .eq('ad_id', adId)
    .order('sort_order', { ascending: true });
  if (error) { console.error('getVariantsExtended:', error); return []; }
  return (data as ExtendedListingVariant[]) || [];
}

// =========================================================================
// Bulk Operations
// =========================================================================

export async function bulkOperation(
  userId: string,
  operation: BulkOperationType,
  adIds: string[],
  parameters?: Record<string, unknown>
): Promise<BulkListingOperation | null> {
  // Create a record
  const { data: opRecord, error: opError } = await supabase
    .from('bulk_listing_operations')
    .insert({
      user_id: userId,
      operation,
      ad_ids: adIds,
      parameters: parameters || {},
      status: 'processing',
      total_count: adIds.length,
      success_count: 0,
      failure_count: 0,
    })
    .select()
    .single();

  if (opError) { toast.error('Failed to start bulk operation'); console.error('bulkOperation:', opError); return null; }

  let successCount = 0;
  let failureCount = 0;
  const errorDetails: Array<{ ad_id: string; error: string }> = [];

  for (const adId of adIds) {
    try {
      let success = false;
      switch (operation) {
        case 'bulk_publish':
          success = await publishListing(adId, userId);
          break;
        case 'bulk_pause':
          success = await pauseListing(adId, userId);
          break;
        case 'bulk_archive':
          success = await archiveListing(adId, userId);
          break;
        case 'bulk_delete':
          success = await softDeleteListing(adId, userId);
          break;
        case 'bulk_relist':
          success = await relistSoldListing(adId, userId);
          break;
        case 'bulk_renew':
          success = await renewListing(adId, userId);
          break;
        case 'bulk_category_change': {
          const newCategoryId = parameters?.category_id as string;
          if (newCategoryId) {
            const { error } = await supabase.from('ads').update({ category_id: newCategoryId, updated_at: new Date().toISOString() }).eq('id', adId).eq('user_id', userId);
            success = !error;
          }
          break;
        }
        case 'bulk_price_update': {
          const newPrice = parameters?.price as number;
          const priceType = parameters?.price_type as string;
          const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
          if (newPrice !== undefined) updates.price = newPrice;
          if (priceType) updates.price_type = priceType;
          const { error } = await supabase.from('ads').update(updates).eq('id', adId).eq('user_id', userId);
          success = !error;
          break;
        }
        case 'bulk_shipping_update': {
          const shippingUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
          if (parameters?.shipping_methods) shippingUpdates.shipping_methods = parameters.shipping_methods;
          if (parameters?.shipping_fee_type) shippingUpdates.shipping_fee_type = parameters.shipping_fee_type;
          if (parameters?.shipping_fee !== undefined) shippingUpdates.shipping_fee = parameters.shipping_fee;
          if (parameters?.free_shipping !== undefined) shippingUpdates.free_shipping = parameters.free_shipping;
          const { error } = await supabase.from('ads').update(shippingUpdates).eq('id', adId).eq('user_id', userId);
          success = !error;
          break;
        }
        case 'bulk_edit': {
          const editUpdates = parameters || {};
          const { error } = await supabase.from('ads').update({ ...editUpdates, updated_at: new Date().toISOString() }).eq('id', adId).eq('user_id', userId);
          success = !error;
          break;
        }
        default:
          break;
      }

      if (success) {
        successCount++;
        await logListingHistoryEntry({ ad_id: adId, user_id: userId, action: 'bulk_updated', notes: `Bulk operation: ${operation}` });
      } else {
        failureCount++;
        errorDetails.push({ ad_id: adId, error: 'Operation failed' });
      }
    } catch (err) {
      failureCount++;
      errorDetails.push({ ad_id: adId, error: String(err) });
    }
  }

  // Update the record
  const { data: updatedRecord, error: updateError } = await supabase
    .from('bulk_listing_operations')
    .update({
      status: failureCount === 0 ? 'completed' : (successCount === 0 ? 'failed' : 'partial'),
      success_count: successCount,
      failure_count: failureCount,
      error_details: errorDetails,
      completed_at: new Date().toISOString(),
    })
    .eq('id', opRecord.id)
    .select()
    .single();

  if (updateError) { console.error('bulkOperation update:', updateError); }

  if (failureCount === 0) {
    toast.success(`Bulk operation completed: ${successCount} listings updated`);
  } else if (successCount === 0) {
    toast.error(`Bulk operation failed: ${failureCount} listings failed`);
  } else {
    toast.info(`Bulk operation partial: ${successCount} succeeded, ${failureCount} failed`);
  }

  return (updatedRecord as BulkListingOperation) || (opRecord as BulkListingOperation);
}

export async function getBulkOperations(userId: string): Promise<BulkListingOperation[]> {
  const { data, error } = await supabase
    .from('bulk_listing_operations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) { console.error('getBulkOperations:', error); return []; }
  return (data as BulkListingOperation[]) || [];
}

// =========================================================================
// Advanced Search & Filtering
// =========================================================================

export async function searchListings(params: ListingQueryParams): Promise<ListingQueryResult> {
  let query = supabase
    .from('ads')
    .select('*, ad_images(image_url, sort_order), categories(name, slug), subcategories(name, slug)', { count: 'exact' })
    .in('status', ['approved', 'boosted', 'premium']);

  const { filter, sort, page, per_page } = params;

  // Apply filters
  if (filter.search) {
    query = query.or(`title.ilike.%${filter.search}%,description.ilike.%${filter.search}%,brand.ilike.%${filter.search}%,model.ilike.%${filter.search}%`);
  }
  if (filter.category_id) query = query.eq('category_id', filter.category_id);
  if (filter.subcategory_id) query = query.eq('subcategory_id', filter.subcategory_id);
  if (filter.brand) query = query.ilike('brand', `%${filter.brand}%`);
  if (filter.model) query = query.ilike('model', `%${filter.model}%`);
  if (filter.min_price !== undefined) query = query.gte('price', filter.min_price);
  if (filter.max_price !== undefined) query = query.lte('price', filter.max_price);
  if (filter.condition) query = query.eq('condition', filter.condition);
  if (filter.listing_type) query = query.eq('listing_type', filter.listing_type);
  if (filter.seller_id) query = query.eq('user_id', filter.seller_id);
  if (filter.division) query = query.eq('division', filter.division);
  if (filter.district) query = query.eq('district', filter.district);
  if (filter.tags && filter.tags.length > 0) query = query.overlaps('tags', filter.tags);
  if (filter.date_from) query = query.gte('created_at', filter.date_from);
  if (filter.date_to) query = query.lte('created_at', filter.date_to);

  // Apply sorting
  switch (sort) {
    case 'newest':
      query = query.order('created_at', { ascending: false });
      break;
    case 'oldest':
      query = query.order('created_at', { ascending: true });
      break;
    case 'lowest_price':
      query = query.order('price', { ascending: true, nullsFirst: false });
      break;
    case 'highest_price':
      query = query.order('price', { ascending: false, nullsFirst: false });
      break;
    case 'most_popular':
      query = query.order('favorites_count', { ascending: false, nullsFirst: false });
      break;
    case 'most_viewed':
      query = query.order('views_count', { ascending: false, nullsFirst: false });
      break;
    case 'recently_updated':
      query = query.order('updated_at', { ascending: false });
      break;
    default:
      query = query.order('created_at', { ascending: false });
  }

  // Apply pagination
  const offset = (page - 1) * per_page;
  query = query.range(offset, offset + per_page - 1);

  const { data, error, count } = await query;

  if (error) { console.error('searchListings error:', error); return { listings: [], total: 0, page, per_page, total_pages: 0 }; }

  const total = count || 0;
  const total_pages = Math.ceil(total / per_page);

  return {
    listings: (data as ExtendedListing[]) || [],
    total,
    page,
    per_page,
    total_pages,
  };
}

// =========================================================================
// Validation
// =========================================================================

export async function validateListing(ctx: ListingValidationContext): Promise<ListingValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required field validation
  if (!ctx.title || ctx.title.trim().length < 3) {
    errors.push('Title must be at least 3 characters');
  }
  if (ctx.title.length > 100) {
    errors.push('Title must be less than 100 characters');
  }
  if (!ctx.category_id) {
    errors.push('Category is required');
  }
  if (ctx.price_type !== 'free' && (ctx.price === null || ctx.price === undefined || ctx.price < 0)) {
    errors.push('Valid price is required');
  }
  if (!ctx.division) {
    errors.push('Division is required');
  }
  if (!ctx.district) {
    errors.push('District is required');
  }

  // Missing image warning
  if (!ctx.images || ctx.images.length === 0) {
    warnings.push('At least one image is recommended for better visibility');
  }

  // Duplicate listing detection
  const { data: duplicates } = await supabase
    .from('ads')
    .select('id')
    .eq('user_id', ctx.user_id)
    .ilike('title', ctx.title)
    .neq('id', ctx.ad_id || '')
    .limit(1);
  if (duplicates && duplicates.length > 0) {
    warnings.push('You may have a similar listing already');
  }

  // Duplicate SKU validation
  if (ctx.sku) {
    const { data: skuDups } = await supabase
      .from('ads')
      .select('id')
      .eq('user_id', ctx.user_id)
      .eq('sku', ctx.sku)
      .neq('id', ctx.ad_id || '')
      .limit(1);
    if (skuDups && skuDups.length > 0) {
      errors.push('SKU already exists in your listings');
    }
  }

  // Duplicate barcode validation
  if (ctx.barcode) {
    const { data: barcodeDups } = await supabase
      .from('ads')
      .select('id')
      .eq('user_id', ctx.user_id)
      .eq('barcode', ctx.barcode)
      .neq('id', ctx.ad_id || '')
      .limit(1);
    if (barcodeDups && barcodeDups.length > 0) {
      errors.push('Barcode already exists in your listings');
    }
  }

  // Invalid price validation
  if (ctx.price !== null && ctx.price !== undefined && ctx.price > 1000000000) {
    errors.push('Price is too high');
  }

  return { valid: errors.length === 0, errors, warnings };
}

// =========================================================================
// Seller Store Integration
// =========================================================================

export async function getSellerStoreInfo(sellerId: string): Promise<SellerStoreInfo | null> {
  // Get seller profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, is_verified, division, district, created_at')
    .eq('user_id', sellerId)
    .single();

  if (!profile) return null;

  // Get shop info
  const { data: shop } = await supabase
    .from('shops')
    .select('name, slug, logo_url, shipping_policy, return_policy, refund_policy, warranty_info, is_verified, total_followers')
    .eq('owner_id', sellerId)
    .single();

  // Get active listings count
  const { count: activeListings } = await supabase
    .from('ads')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', sellerId)
    .in('status', ['approved', 'boosted', 'premium']);

  // Get seller rating from reviews
  const { data: ratingData } = await supabase
    .from('reviews')
    .select('rating')
    .eq('reviewee_id', sellerId);

  const ratings = (ratingData || []).map((r: Record<string, unknown>) => r.rating as number);
  const sellerRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  return {
    seller_name: (profile as Record<string, unknown>).full_name as string | null,
    seller_avatar: (profile as Record<string, unknown>).avatar_url as string | null,
    seller_verified: (profile as Record<string, unknown>).is_verified as boolean,
    seller_location: [(profile as Record<string, unknown>).division, (profile as Record<string, unknown>).district].filter(Boolean).join(', ') || null,
    seller_join_date: (profile as Record<string, unknown>).created_at as string | null,
    seller_rating: Math.round(sellerRating * 10) / 10,
    store_name: shop ? (shop as Record<string, unknown>).name as string : null,
    store_logo: shop ? (shop as Record<string, unknown>).logo_url as string : null,
    store_slug: shop ? (shop as Record<string, unknown>).slug as string : null,
    store_policies: shop ? {
      shipping_policy: (shop as Record<string, unknown>).shipping_policy as string | null,
      return_policy: (shop as Record<string, unknown>).return_policy as string | null,
      refund_policy: (shop as Record<string, unknown>).refund_policy as string | null,
      warranty_info: (shop as Record<string, unknown>).warranty_info as string | null,
    } : null,
    active_listings_count: activeListings || 0,
    followers_count: shop ? (shop as Record<string, unknown>).total_followers as number : 0,
    verification_badge: (profile as Record<string, unknown>).is_verified as boolean,
  };
}

// =========================================================================
// Image Management (extended for Phase 4)
// =========================================================================

export async function setCoverImage(adId: string, imageId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('ads')
    .update({ cover_image_id: imageId, updated_at: new Date().toISOString() })
    .eq('id', adId)
    .eq('user_id', userId);
  if (error) { toast.error('Failed to set cover image'); return false; }
  await logListingHistoryEntry({ ad_id: adId, user_id: userId, action: 'photo_changed', field_name: 'cover_image', new_value: { cover_image_id: imageId } });
  toast.success('Cover image updated');
  return true;
}

export async function reorderImages(adId: string, imageIds: string[], userId: string): Promise<boolean> {
  for (let i = 0; i < imageIds.length; i++) {
    await supabase
      .from('ad_images')
      .update({ sort_order: i })
      .eq('id', imageIds[i])
      .eq('ad_id', adId);
  }
  await logListingHistoryEntry({ ad_id: adId, user_id: userId, action: 'photo_changed', field_name: 'image_order', new_value: { order: imageIds } });
  return true;
}

export async function deleteImage(adId: string, imageId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('ad_images')
    .delete()
    .eq('id', imageId)
    .eq('ad_id', adId);
  if (error) { toast.error('Failed to delete image'); return false; }
  await logListingHistoryEntry({ ad_id: adId, user_id: userId, action: 'photo_changed', field_name: 'image_deleted', new_value: { image_id: imageId } });
  toast.success('Image deleted');
  return true;
}

// =========================================================================
// Price History (extended with discount tracking)
// =========================================================================

export async function getPriceHistoryExtended(adId: string): Promise<Array<{ id: string; old_price: number | null; new_price: number | null; changed_at: string }>> {
  const { data, error } = await supabase
    .from('price_history')
    .select('*')
    .eq('ad_id', adId)
    .order('changed_at', { ascending: false });
  if (error) { console.error('getPriceHistoryExtended:', error); return []; }
  return data || [];
}
