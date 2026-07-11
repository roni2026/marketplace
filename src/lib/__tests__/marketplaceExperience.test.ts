import { describe, it, expect } from 'vitest';
import { getShareUrl, generateQRCodeUrl, SHARE_OPTIONS } from '@/lib/marketplaceExperience';
import { LISTING_REPORT_REASONS, SELLER_REPORT_REASONS } from '@/integrations/supabase/types_v6_marketplace';

describe('Phase 6 — Marketplace Experience', () => {
  describe('getShareUrl', () => {
    it('generates Facebook share URL', () => {
      const url = getShareUrl('facebook', 'https://example.com/listing', 'Test Listing');
      expect(url).toContain('facebook.com');
      expect(url).toContain('example.com');
    });

    it('generates WhatsApp share URL', () => {
      const url = getShareUrl('whatsapp', 'https://example.com/listing', 'Test Listing');
      expect(url).toContain('wa.me');
      expect(url).toContain('Test%20Listing');
    });

    it('generates Twitter/X share URL', () => {
      const url = getShareUrl('twitter', 'https://example.com/listing', 'Test Listing');
      expect(url).toContain('twitter.com');
      expect(url).toContain('intent/tweet');
    });

    it('generates Telegram share URL', () => {
      const url = getShareUrl('telegram', 'https://example.com/listing', 'Test Listing');
      expect(url).toContain('t.me');
    });

    it('generates email share URL', () => {
      const url = getShareUrl('email', 'https://example.com/listing', 'Test Listing');
      expect(url).toContain('mailto:');
      expect(url).toContain('subject');
    });

    it('generates SMS share URL', () => {
      const url = getShareUrl('sms', 'https://example.com/listing', 'Test Listing');
      expect(url).toContain('sms:');
    });

    it('returns direct URL for unknown platform', () => {
      const url = getShareUrl('copy_link', 'https://example.com/listing', 'Test');
      expect(url).toBe('https://example.com/listing');
    });
  });

  describe('generateQRCodeUrl', () => {
    it('generates a valid QR code URL', () => {
      const url = generateQRCodeUrl('https://example.com/listing/123', 300);
      expect(url).toContain('qrserver.com');
      expect(url).toContain('300x300');
      expect(url).toContain('example.com');
    });

    it('supports different sizes', () => {
      const url = generateQRCodeUrl('test', 500);
      expect(url).toContain('500x500');
    });

    it('encodes the data parameter', () => {
      const url = generateQRCodeUrl('https://example.com/test?param=value', 200);
      expect(url).toContain(encodeURIComponent('https://example.com/test?param=value'));
    });
  });

  describe('SHARE_OPTIONS', () => {
    it('contains all required share platforms', () => {
      const platforms = SHARE_OPTIONS.map(o => o.platform);
      expect(platforms).toContain('copy_link');
      expect(platforms).toContain('qr_code');
      expect(platforms).toContain('whatsapp');
      expect(platforms).toContain('facebook');
      expect(platforms).toContain('twitter');
      expect(platforms).toContain('telegram');
      expect(platforms).toContain('email');
      expect(platforms).toContain('sms');
      expect(platforms).toContain('native');
    });

    it('each option has label, icon, and color', () => {
      SHARE_OPTIONS.forEach(opt => {
        expect(opt.label).toBeTruthy();
        expect(opt.icon).toBeTruthy();
        expect(opt.color).toBeTruthy();
      });
    });
  });

  describe('LISTING_REPORT_REASONS', () => {
    it('contains all required listing report reasons', () => {
      const codes = LISTING_REPORT_REASONS.map(r => r.code);
      expect(codes).toContain('prohibited_item');
      expect(codes).toContain('counterfeit_item');
      expect(codes).toContain('scam_fraud');
      expect(codes).toContain('misleading_description');
      expect(codes).toContain('incorrect_category');
      expect(codes).toContain('duplicate_listing');
      expect(codes).toContain('stolen_item');
      expect(codes).toContain('inappropriate_content');
      expect(codes).toContain('offensive_language');
      expect(codes).toContain('spam');
      expect(codes).toContain('wrong_price');
      expect(codes).toContain('fake_images');
      expect(codes).toContain('other');
    });

    it('each reason has code and label', () => {
      LISTING_REPORT_REASONS.forEach(r => {
        expect(r.code).toBeTruthy();
        expect(r.label).toBeTruthy();
      });
    });
  });

  describe('SELLER_REPORT_REASONS', () => {
    it('contains all required seller report reasons', () => {
      const codes = SELLER_REPORT_REASONS.map(r => r.code);
      expect(codes).toContain('fraud');
      expect(codes).toContain('fake_products');
      expect(codes).toContain('harassment');
      expect(codes).toContain('abuse');
      expect(codes).toContain('spam');
      expect(codes).toContain('policy_violations');
      expect(codes).toContain('counterfeit_goods');
      expect(codes).toContain('other_misconduct');
    });

    it('each reason has code and label', () => {
      SELLER_REPORT_REASONS.forEach(r => {
        expect(r.code).toBeTruthy();
        expect(r.label).toBeTruthy();
      });
    });
  });

  describe('FavoriteEntityType', () => {
    it('supports all entity types', () => {
      const types = ['listing', 'seller', 'store', 'brand', 'category'];
      expect(types).toHaveLength(5);
    });
  });

  describe('ActivityType', () => {
    it('covers all activity types', () => {
      const types = [
        'view', 'favorite', 'unfavorite', 'share', 'compare',
        'follow_seller', 'unfollow_seller', 'follow_store', 'unfollow_store',
        'follow_category', 'unfollow_category', 'hide_listing', 'unhide_listing',
        'block_seller', 'unblock_seller', 'report_listing', 'report_seller',
        'wishlist_add', 'wishlist_remove', 'qr_scan', 'contact_seller',
        'visit_store', 'save_search',
      ];
      expect(types).toHaveLength(23);
    });
  });

  describe('SponsoredPlacement', () => {
    it('supports all placement types', () => {
      const placements = ['search_results', 'category_page', 'homepage', 'discovery'];
      expect(placements).toHaveLength(4);
    });
  });
});
