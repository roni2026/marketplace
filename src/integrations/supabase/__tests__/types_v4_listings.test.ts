import { describe, it, expect } from 'vitest';
import type {
  ListingType, ListingTypeInsert, ListingTypeUpdate,
  ItemConditionConfig, ItemConditionConfigInsert, ItemConditionConfigUpdate,
  CategoryAttribute, CategoryAttributeInsert, CategoryAttributeUpdate,
  ListingHistoryRecord, ListingHistoryInsert,
  ListingAnalyticsRecord, ListingAnalyticsSummary,
  ExtendedListing, ExtendedListingVariant, ExtendedListingVariantInsert, ExtendedListingVariantUpdate,
  BulkListingOperation,
  ConditionDetails, ListingValidationResult, ListingValidationContext,
  ListingFilter, SortOption, ListingQueryParams, ListingQueryResult,
  SellerStoreInfo,
  WarrantyType, ShippingMethod, ShippingFeeType, HistoryAction,
  AttributeDataType, ListingStatus, BulkOperationType,
} from '@/integrations/supabase/types_v4_listings';

describe('Phase 4 Type Definitions', () => {
  it('ListingType has all required fields', () => {
    const type: ListingType = {
      id: 'lt-1', name: 'New', slug: 'new', description: 'Brand new items',
      icon: 'package', sort_order: 1, is_active: true, is_digital: false, is_service: false,
      created_at: '2024-01-01', updated_at: '2024-01-01',
    };
    expect(type.name).toBe('New');
    expect(type.is_active).toBe(true);
  });

  it('ListingTypeInsert allows partial data', () => {
    const insert: ListingTypeInsert = { name: 'Custom', slug: 'custom' };
    expect(insert.name).toBe('Custom');
  });

  it('ItemConditionConfig has all fields', () => {
    const cond: ItemConditionConfig = {
      id: 'ic-1', name: 'Brand New', slug: 'brand-new', description: 'Sealed',
      sort_order: 1, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01',
    };
    expect(cond.name).toBe('Brand New');
  });

  it('CategoryAttribute supports all data types', () => {
    const attr: CategoryAttribute = {
      id: 'ca-1', category_id: 'cat-1', name: 'Storage', slug: 'storage',
      data_type: 'select', is_required: false, is_filterable: true,
      options: ['64GB', '128GB', '256GB'], unit: null, sort_order: 1,
      created_at: '2024-01-01', updated_at: '2024-01-01',
    };
    expect(attr.data_type).toBe('select');
    expect(attr.options).toHaveLength(3);
  });

  it('ListingHistoryRecord tracks changes', () => {
    const history: ListingHistoryRecord = {
      id: 'h-1', ad_id: 'ad-1', user_id: 'u-1', action: 'price_changed',
      previous_value: { price: 100 }, new_value: { price: 80 },
      field_name: 'price', notes: null, created_at: '2024-01-01',
    };
    expect(history.action).toBe('price_changed');
    expect(history.field_name).toBe('price');
  });

  it('ListingAnalyticsSummary aggregates metrics', () => {
    const summary: ListingAnalyticsSummary = {
      total_views: 1000, unique_visitors: 800, favorites: 50, shares: 30,
      messages_received: 20, contact_clicks: 15, inquiries: 10,
      listing_age_days: 30, daily_breakdown: [],
    };
    expect(summary.total_views).toBe(1000);
    expect(summary.listing_age_days).toBe(30);
  });

  it('ExtendedListing has all Phase 4 fields', () => {
    const listing: ExtendedListing = {
      id: 'ad-1', user_id: 'u-1', title: 'Test', slug: 'test',
      description: null, rich_description: null, short_description: null,
      category_id: 'cat-1', subcategory_id: null,
      price: 100, original_price: 150, discount_amount: 50, discount_percentage: 33,
      price_type: 'fixed', is_negotiable: false, min_offer: null, currency: 'BDT',
      condition: 'new', listing_type: 'new', brand: 'Apple', model: 'iPhone 14',
      tags: ['phone'], sku: 'SKU-1', barcode: '123', serial_number: 'SN-1', mpn: 'MPN-1',
      product_attributes: { storage: '128GB' }, condition_details: { scratches: 'None' },
      division: 'Dhaka', district: 'Dhaka', area: null,
      status: 'approved', shop_id: null, cover_image_id: null,
      shipping_methods: ['local_pickup'], shipping_fee_type: 'free', shipping_fee: 0,
      free_shipping: true, estimated_delivery_days: 3, handling_time_days: 1,
      delivery_locations: ['Dhaka'],
      warranty_type: 'manufacturer', warranty_duration_months: 12,
      warranty_coverage: 'All parts', warranty_terms: 'Standard terms',
      is_featured: false, is_premium: false, is_boosted: false, is_urgent: false,
      boosted_until: null, premium_until: null, expires_at: null, scheduled_at: null,
      views_count: 100, favorites_count: 10, shares_count: 5, offers_count: 3,
      deleted_at: null, renewed_at: null, sold_at: null, archived_at: null,
      created_at: '2024-01-01', updated_at: '2024-01-01',
    };
    expect(listing.brand).toBe('Apple');
    expect(listing.warranty_type).toBe('manufacturer');
    expect(listing.shipping_methods).toHaveLength(1);
  });

  it('ExtendedListingVariant has Phase 4 fields', () => {
    const variant: ExtendedListingVariant = {
      id: 'v-1', ad_id: 'ad-1', name: 'Red 128GB', sku: 'SKU-R128',
      barcode: null, serial_number: null, price: 120, stock: 5,
      attributes: { color: 'red', storage: '128GB' }, image_url: 'https://example.com/red.jpg',
      is_available: true, sort_order: 1, created_at: '2024-01-01', updated_at: '2024-01-01',
    };
    expect(variant.image_url).toBe('https://example.com/red.jpg');
    expect(variant.is_available).toBe(true);
  });

  it('BulkListingOperation tracks operation progress', () => {
    const op: BulkListingOperation = {
      id: 'op-1', user_id: 'u-1', operation: 'bulk_publish',
      ad_ids: ['ad-1', 'ad-2', 'ad-3'], parameters: {},
      status: 'completed', total_count: 3, success_count: 3, failure_count: 0,
      error_details: [], created_at: '2024-01-01', completed_at: '2024-01-01',
    };
    expect(op.status).toBe('completed');
    expect(op.success_count).toBe(3);
  });

  it('ListingQueryResult provides pagination info', () => {
    const result: ListingQueryResult = {
      listings: [], total: 100, page: 1, per_page: 20, total_pages: 5,
    };
    expect(result.total_pages).toBe(5);
  });
});
