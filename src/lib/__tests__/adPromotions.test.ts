import { describe, it, expect } from 'vitest';
import {
  promotionBadgeClass, formatPromotionPrice,
  PROMOTION_BADGE_COLORS, PROMOTION_PLACEMENTS,
} from '@/lib/adPromotions';

describe('adPromotions helpers', () => {
  it('formats prices with the BDT symbol and thousands separators', () => {
    expect(formatPromotionPrice(1500, 'BDT')).toBe('৳1,500');
    expect(formatPromotionPrice(0, 'BDT')).toBe('Free');
    expect(formatPromotionPrice(250)).toBe('৳250');
  });

  it('formats non-BDT currencies with a prefix', () => {
    expect(formatPromotionPrice(100, 'USD')).toBe('USD 100');
  });

  it('returns a class string for every known badge color', () => {
    for (const c of PROMOTION_BADGE_COLORS) {
      expect(typeof promotionBadgeClass(c)).toBe('string');
      expect(promotionBadgeClass(c).length).toBeGreaterThan(0);
    }
  });

  it('falls back to slate styling for unknown colors', () => {
    expect(promotionBadgeClass('not-a-color')).toBe(promotionBadgeClass('slate'));
  });

  it('exposes the placement options used by the admin UI', () => {
    expect(PROMOTION_PLACEMENTS).toContain('listing');
    expect(PROMOTION_PLACEMENTS).toContain('homepage_banner');
  });
});
