import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MEMBERSHIP_TIERS, getMembershipTierConfig } from '@/integrations/supabase/types_v3_shops';

describe('Phase 3 — Shop Membership Types', () => {
  describe('MEMBERSHIP_TIERS', () => {
    it('should have 4 membership tiers', () => {
      expect(MEMBERSHIP_TIERS).toHaveLength(4);
    });

    it('should have basic, professional, business, and enterprise tiers', () => {
      const tiers = MEMBERSHIP_TIERS.map((t) => t.tier);
      expect(tiers).toEqual(['basic', 'professional', 'business', 'enterprise']);
    });

    it('should have increasing prices', () => {
      const prices = MEMBERSHIP_TIERS.map((t) => t.price);
      expect(prices[0]).toBeLessThanOrEqual(prices[1]);
      expect(prices[1]).toBeLessThanOrEqual(prices[2]);
      expect(prices[2]).toBeLessThanOrEqual(prices[3]);
    });

    it('should have increasing listing limits', () => {
      const limits = MEMBERSHIP_TIERS.map((t) => t.listing_limit);
      expect(limits[0]).toBeLessThanOrEqual(limits[1]);
      expect(limits[1]).toBeLessThanOrEqual(limits[2]);
      expect(limits[2]).toBeLessThanOrEqual(limits[3]);
    });

    it('should have enterprise with unlimited listings (-1)', () => {
      const enterprise = MEMBERSHIP_TIERS.find((t) => t.tier === 'enterprise');
      expect(enterprise?.listing_limit).toBe(-1);
    });

    it('should have basic with 0 price', () => {
      const basic = MEMBERSHIP_TIERS.find((t) => t.tier === 'basic');
      expect(basic?.price).toBe(0);
    });

    it('should have features array for each tier', () => {
      MEMBERSHIP_TIERS.forEach((tier) => {
        expect(tier.features).toBeInstanceOf(Array);
        expect(tier.features.length).toBeGreaterThan(0);
      });
    });

    it('should have analytics_level for each tier', () => {
      MEMBERSHIP_TIERS.forEach((tier) => {
        expect(['basic', 'advanced', 'enterprise']).toContain(tier.analytics_level);
      });
    });

    it('should allow staff only for business and enterprise', () => {
      const basic = getMembershipTierConfig('basic');
      const professional = getMembershipTierConfig('professional');
      const business = getMembershipTierConfig('business');
      const enterprise = getMembershipTierConfig('enterprise');

      expect(basic.allows_staff).toBe(false);
      expect(professional.allows_staff).toBe(false);
      expect(business.allows_staff).toBe(true);
      expect(enterprise.allows_staff).toBe(true);
    });

    it('should allow coupons for professional and above', () => {
      const basic = getMembershipTierConfig('basic');
      const professional = getMembershipTierConfig('professional');

      expect(basic.allows_coupons).toBe(false);
      expect(professional.allows_coupons).toBe(true);
    });

    it('should allow bulk import for business and above', () => {
      const basic = getMembershipTierConfig('basic');
      const business = getMembershipTierConfig('business');

      expect(basic.allows_bulk_import).toBe(false);
      expect(business.allows_bulk_import).toBe(true);
    });
  });

  describe('getMembershipTierConfig', () => {
    it('should return config for basic tier', () => {
      const config = getMembershipTierConfig('basic');
      expect(config.tier).toBe('basic');
      expect(config.name).toBe('Basic Shop');
    });

    it('should return config for enterprise tier', () => {
      const config = getMembershipTierConfig('enterprise');
      expect(config.tier).toBe('enterprise');
      expect(config.name).toBe('Enterprise Shop');
    });

    it('should return basic config as fallback for unknown tier', () => {
      const config = getMembershipTierConfig('unknown' as any);
      expect(config.tier).toBe('basic');
    });
  });
});
