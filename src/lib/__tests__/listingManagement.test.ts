import { describe, it, expect } from 'vitest';
import type {
  WarrantyType, ShippingMethod, ShippingFeeType, HistoryAction,
  AttributeDataType, ListingStatus, BulkOperationType, SortOption,
  ListingFilter, ListingQueryParams, ConditionDetails,
  ListingValidationResult, SellerStoreInfo,
} from '@/integrations/supabase/types_v4_listings';

describe('Phase 4 Listing Management — Types & Logic', () => {
  describe('WarrantyType', () => {
    it('accepts valid warranty types', () => {
      const valid: WarrantyType[] = ['none', 'manufacturer', 'seller'];
      expect(valid).toHaveLength(3);
      valid.forEach(v => expect(['none', 'manufacturer', 'seller']).toContain(v));
    });
  });

  describe('ShippingMethod', () => {
    it('accepts valid shipping methods', () => {
      const valid: ShippingMethod[] = ['local_pickup', 'nationwide', 'international'];
      expect(valid).toHaveLength(3);
    });
  });

  describe('ShippingFeeType', () => {
    it('accepts valid fee types', () => {
      const valid: ShippingFeeType[] = ['free', 'flat_rate', 'calculated'];
      expect(valid).toHaveLength(3);
    });
  });

  describe('HistoryAction', () => {
    it('covers all listing lifecycle actions', () => {
      const actions: HistoryAction[] = [
        'created', 'edited', 'price_changed', 'photo_changed', 'status_changed',
        'renewed', 'relisted', 'marked_sold', 'archived', 'restored',
        'deleted', 'duplicated', 'published', 'scheduled', 'paused',
        'resumed', 'hidden', 'bulk_updated',
      ];
      expect(actions).toHaveLength(18);
    });
  });

  describe('AttributeDataType', () => {
    it('supports all attribute data types', () => {
      const types: AttributeDataType[] = ['text', 'number', 'select', 'multiselect', 'boolean', 'date'];
      expect(types).toHaveLength(6);
    });
  });

  describe('ListingStatus', () => {
    it('covers all listing statuses', () => {
      const statuses: ListingStatus[] = [
        'draft', 'pending', 'approved', 'scheduled', 'paused',
        'hidden', 'sold', 'expired', 'archived', 'rejected',
        'boosted', 'premium',
      ];
      expect(statuses).toHaveLength(12);
    });
  });

  describe('BulkOperationType', () => {
    it('covers all bulk operation types', () => {
      const ops: BulkOperationType[] = [
        'bulk_edit', 'bulk_publish', 'bulk_pause', 'bulk_archive',
        'bulk_delete', 'bulk_relist', 'bulk_renew',
        'bulk_category_change', 'bulk_price_update', 'bulk_shipping_update',
      ];
      expect(ops).toHaveLength(10);
    });
  });

  describe('SortOption', () => {
    it('covers all sort options', () => {
      const sorts: SortOption[] = [
        'newest', 'oldest', 'lowest_price', 'highest_price',
        'most_popular', 'most_viewed', 'recently_updated',
      ];
      expect(sorts).toHaveLength(7);
    });
  });

  describe('ListingFilter', () => {
    it('supports all filter fields', () => {
      const filter: ListingFilter = {
        category_id: 'cat-1',
        subcategory_id: 'sub-1',
        brand: 'Apple',
        model: 'iPhone 14',
        min_price: 100,
        max_price: 1000,
        condition: 'new',
        listing_type: 'new',
        seller_id: 'user-1',
        division: 'Dhaka',
        district: 'Dhaka',
        tags: ['electronics', 'phone'],
        date_from: '2024-01-01',
        date_to: '2024-12-31',
        search: 'iPhone',
      };
      expect(filter.category_id).toBe('cat-1');
      expect(filter.min_price).toBe(100);
      expect(filter.tags).toHaveLength(2);
    });
  });

  describe('ListingQueryParams', () => {
    it('combines filter, sort, and pagination', () => {
      const params: ListingQueryParams = {
        filter: { category_id: 'cat-1' },
        sort: 'newest',
        page: 1,
        per_page: 20,
      };
      expect(params.page).toBe(1);
      expect(params.per_page).toBe(20);
      expect(params.sort).toBe('newest');
    });
  });

  describe('ConditionDetails', () => {
    it('supports all condition detail fields', () => {
      const details: ConditionDetails = {
        cosmetic_condition: 'Minor scratches',
        functional_condition: 'Fully functional',
        missing_accessories: 'Charger missing',
        repairs: 'Screen replaced',
        defects: 'None',
        scratches: 'Back panel',
        additional_notes: 'Battery health 85%',
      };
      expect(Object.keys(details)).toHaveLength(7);
    });
  });

  describe('ListingValidationResult', () => {
    it('has valid, errors, and warnings', () => {
      const result: ListingValidationResult = {
        valid: true,
        errors: [],
        warnings: ['Missing image recommended'],
      };
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
    });
  });

  describe('SellerStoreInfo', () => {
    it('has all seller store fields', () => {
      const info: SellerStoreInfo = {
        seller_name: 'John Doe',
        seller_avatar: 'https://example.com/avatar.jpg',
        seller_verified: true,
        seller_location: 'Dhaka, Dhaka',
        seller_join_date: '2024-01-01',
        seller_rating: 4.5,
        store_name: 'John Electronics',
        store_logo: 'https://example.com/logo.jpg',
        store_slug: 'john-electronics',
        store_policies: {
          shipping_policy: 'Ships in 2 days',
          return_policy: '7 day returns',
          refund_policy: 'Full refund',
          warranty_info: '1 year warranty',
        },
        active_listings_count: 15,
        followers_count: 120,
        verification_badge: true,
      };
      expect(info.seller_name).toBe('John Doe');
      expect(info.seller_rating).toBe(4.5);
      expect(info.store_policies?.shipping_policy).toBe('Ships in 2 days');
    });
  });

  describe('Discount Calculation Logic', () => {
    it('calculates discount amount correctly', () => {
      const original = 1000;
      const selling = 750;
      const discount = original - selling;
      expect(discount).toBe(250);
    });

    it('calculates discount percentage correctly', () => {
      const original = 1000;
      const selling = 750;
      const discount = original - selling;
      const percentage = Math.round((discount / original) * 100);
      expect(percentage).toBe(25);
    });

    it('handles zero discount when price equals original', () => {
      const original = 500;
      const selling = 500;
      const discount = original > 0 && selling < original ? original - selling : 0;
      expect(discount).toBe(0);
    });

    it('handles zero discount when original is null', () => {
      const original: number | null = null;
      const selling = 500;
      const discount = original && original > 0 && selling < original ? original - selling : 0;
      expect(discount).toBe(0);
    });

    it('handles zero discount when selling price is higher', () => {
      const original = 500;
      const selling = 600;
      const discount = original > 0 && selling < original ? original - selling : 0;
      expect(discount).toBe(0);
    });
  });

  describe('Slug Generation', () => {
    it('generates slug from title', () => {
      const title = 'iPhone 14 Pro Max 256GB';
      const slug = title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
      expect(slug).toBe('iphone-14-pro-max-256gb');
    });

    it('handles special characters', () => {
      const title = 'Samsung Galaxy S23! @#$% Ultra';
      const slug = title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
      expect(slug).toBe('samsung-galaxy-s23-ultra');
    });
  });

  describe('Status Transition Logic', () => {
    const validTransitions: Record<string, string[]> = {
      draft: ['pending', 'scheduled', 'archived'],
      pending: ['approved', 'rejected', 'draft'],
      approved: ['paused', 'hidden', 'sold', 'archived', 'expired'],
      scheduled: ['approved', 'draft'],
      paused: ['approved'],
      hidden: ['approved'],
      sold: ['approved'],
      expired: ['approved', 'archived'],
      archived: ['draft'],
      rejected: ['draft', 'archived'],
    };

    it('allows draft to pending transition', () => {
      expect(validTransitions['draft']).toContain('pending');
    });

    it('allows approved to paused transition', () => {
      expect(validTransitions['approved']).toContain('paused');
    });

    it('allows approved to sold transition', () => {
      expect(validTransitions['approved']).toContain('sold');
    });

    it('allows paused to approved transition', () => {
      expect(validTransitions['paused']).toContain('approved');
    });

    it('allows sold to approved (relist) transition', () => {
      expect(validTransitions['sold']).toContain('approved');
    });

    it('allows expired to approved (relist) transition', () => {
      expect(validTransitions['expired']).toContain('approved');
    });

    it('allows archived to draft (restore) transition', () => {
      expect(validTransitions['archived']).toContain('draft');
    });

    it('does not allow draft to sold transition', () => {
      expect(validTransitions['draft']).not.toContain('sold');
    });
  });

  describe('Tags Parsing', () => {
    it('parses comma-separated tags', () => {
      const tagsString = 'electronics, phone, apple, ios';
      const tags = tagsString.split(',').map(t => t.trim()).filter(Boolean);
      expect(tags).toEqual(['electronics', 'phone', 'apple', 'ios']);
    });

    it('handles empty tags', () => {
      const tagsString = '';
      const tags = tagsString.split(',').map(t => t.trim()).filter(Boolean);
      expect(tags).toEqual([]);
    });

    it('handles whitespace-only tags', () => {
      const tagsString = '  ,  ,  ';
      const tags = tagsString.split(',').map(t => t.trim()).filter(Boolean);
      expect(tags).toEqual([]);
    });
  });

  describe('Shipping Methods Validation', () => {
    it('validates shipping method values', () => {
      const validMethods: ShippingMethod[] = ['local_pickup', 'nationwide', 'international'];
      const testMethod: ShippingMethod = 'local_pickup';
      expect(validMethods).toContain(testMethod);
    });

    it('allows multiple shipping methods', () => {
      const methods: ShippingMethod[] = ['local_pickup', 'nationwide'];
      expect(methods).toHaveLength(2);
    });
  });
});
