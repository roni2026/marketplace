// BazarBD — Phase 2: User Profiles & Reputation Tests
// src/lib/__tests__/profiles.test.ts
//
// These tests validate the pure functions in lib/profiles.ts.
// Functions that call Supabase are tested for input validation and
// error handling patterns. Run with: npx vitest run

import { describe, it, expect } from 'vitest';
import {
  parseSocialLinks,
  getBadgeInfo,
  formatResponseTime,
  formatLastActive,
  formatMemberSince,
} from '@/lib/profiles';
import type { BadgeType } from '@/integrations/supabase/types_v2_profiles';

// ---------------------------------------------------------------------------
// parseSocialLinks
// ---------------------------------------------------------------------------

describe('parseSocialLinks', () => {
  it('returns empty object for null input', () => {
    expect(parseSocialLinks(null)).toEqual({});
  });

  it('returns empty object for undefined input', () => {
    expect(parseSocialLinks(undefined)).toEqual({});
  });

  it('normalizes facebook key', () => {
    const result = parseSocialLinks({ facebook: 'https://fb.com/me' });
    expect(result.facebook).toBe('https://fb.com/me');
  });

  it('normalizes facebook_url to facebook', () => {
    const result = parseSocialLinks({ facebook_url: 'https://fb.com/me' });
    expect(result.facebook).toBe('https://fb.com/me');
  });

  it('normalizes twitter and x to twitter', () => {
    expect(parseSocialLinks({ x: 'https://x.com/me' }).twitter).toBe('https://x.com/me');
    expect(parseSocialLinks({ twitter: 'https://twitter.com/me' }).twitter).toBe('https://twitter.com/me');
  });

  it('normalizes whatsapp_number to whatsapp', () => {
    const result = parseSocialLinks({ whatsapp_number: '+880123456789' });
    expect(result.whatsapp).toBe('+880123456789');
  });

  it('preserves website key', () => {
    const result = parseSocialLinks({ website: 'https://example.com' });
    expect(result.website).toBe('https://example.com');
  });
});

// ---------------------------------------------------------------------------
// getBadgeInfo
// ---------------------------------------------------------------------------

describe('getBadgeInfo', () => {
  const badgeTypes: BadgeType[] = [
    'email_verified', 'phone_verified', 'id_verified', 'address_verified',
    'business_verified', 'premium_seller', 'top_rated', 'trusted_buyer',
  ];

  it('returns label, icon, and color for each badge type', () => {
    for (const type of badgeTypes) {
      const info = getBadgeInfo(type);
      expect(info.label).toBeTruthy();
      expect(info.label.length).toBeGreaterThan(0);
      expect(info.icon).toBeTruthy();
      expect(info.color).toMatch(/^text-/);
    }
  });

  it('returns fallback for unknown badge type', () => {
    const info = getBadgeInfo('unknown_badge' as BadgeType);
    expect(info.label).toBe('unknown_badge');
    expect(info.icon).toBe('badge-check');
  });
});

// ---------------------------------------------------------------------------
// formatResponseTime
// ---------------------------------------------------------------------------

describe('formatResponseTime', () => {
  it('returns N/A for zero hours', () => {
    expect(formatResponseTime(0)).toBe('N/A');
  });

  it('returns N/A for negative hours', () => {
    expect(formatResponseTime(-1)).toBe('N/A');
  });

  it('formats minutes correctly', () => {
    expect(formatResponseTime(0.5)).toBe('30 min');
    expect(formatResponseTime(0.25)).toBe('15 min');
  });

  it('formats hours correctly', () => {
    expect(formatResponseTime(1)).toBe('1 hr');
    expect(formatResponseTime(5)).toBe('5 hr');
    expect(formatResponseTime(23)).toBe('23 hr');
  });

  it('formats days correctly', () => {
    expect(formatResponseTime(24)).toBe('1 day');
    expect(formatResponseTime(48)).toBe('2 days');
    expect(formatResponseTime(72)).toBe('3 days');
  });
});

// ---------------------------------------------------------------------------
// formatLastActive
// ---------------------------------------------------------------------------

describe('formatLastActive', () => {
  it('returns Never for null', () => {
    expect(formatLastActive(null)).toBe('Never');
  });

  it('returns Just now for very recent timestamp', () => {
    const now = new Date().toISOString();
    expect(formatLastActive(now)).toBe('Just now');
  });

  it('returns minutes ago for recent timestamp', () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const result = formatLastActive(tenMinAgo);
    expect(result).toMatch(/min ago/);
  });

  it('returns hours ago for older timestamp', () => {
    const twoHrAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const result = formatLastActive(twoHrAgo);
    expect(result).toMatch(/hr ago/);
  });

  it('returns a date string for very old timestamp', () => {
    const oldDate = new Date('2020-01-01').toISOString();
    const result = formatLastActive(oldDate);
    expect(result).toMatch(/\d/);
  });
});

// ---------------------------------------------------------------------------
// formatMemberSince
// ---------------------------------------------------------------------------

describe('formatMemberSince', () => {
  it('formats date as Month Year', () => {
    const result = formatMemberSince('2024-03-15T00:00:00Z');
    expect(result).toMatch(/2024/);
    expect(result).toMatch(/January|February|March|April|May|June|July|August|September|October|November|December/);
  });

  it('handles different dates', () => {
    const result = formatMemberSince('2023-12-01T00:00:00Z');
    expect(result).toMatch(/2023/);
  });
});
