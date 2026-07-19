import { describe, it, expect } from 'vitest';
import { detectSearchType, statusBadgeClass, SEARCH_TYPE_LABEL } from '@/lib/adSearch';

describe('detectSearchType — universal admin ad search', () => {
  it('detects listing slug', () => {
    expect(detectSearchType('iphone-15-pro-max-128gb')).toBe('slug');
    expect(detectSearchType('samsung-galaxy-s24-ultra')).toBe('slug');
  });

  it('detects seller phone number', () => {
    expect(detectSearchType('01912345678')).toBe('phone');
    expect(detectSearchType('+8801912345678')).toBe('phone');
    expect(detectSearchType('019-1234-5678')).toBe('phone');
  });

  it('detects seller email', () => {
    expect(detectSearchType('seller@gmail.com')).toBe('email');
    expect(detectSearchType('john.doe@bazarbd.com')).toBe('email');
  });

  it('detects free-text titles', () => {
    expect(detectSearchType('Galaxy S24')).toBe('title');
    expect(detectSearchType('iphone')).toBe('title');
    expect(detectSearchType('iphone pro')).toBe('title');
    expect(detectSearchType('iphone 15')).toBe('title');
  });

  it('detects ad ids / references', () => {
    expect(detectSearchType('A123456')).toBe('ad_id');
    // full uuid
    expect(detectSearchType('3f2504e0-4f89-41d3-9a0c-0305e82c3301')).toBe('ad_id');
  });

  it('has a label for every detected type', () => {
    for (const raw of ['iphone-15', '01912345678', 'a@b.com', 'Galaxy S24', 'A123456']) {
      const t = detectSearchType(raw);
      expect(SEARCH_TYPE_LABEL[t]).toBeTruthy();
    }
  });
});

describe('statusBadgeClass', () => {
  it('returns colored classes per status', () => {
    expect(statusBadgeClass('approved')).toContain('green');
    expect(statusBadgeClass('rejected')).toContain('red');
    expect(statusBadgeClass('pending')).toContain('yellow');
    expect(statusBadgeClass('boosted')).toContain('violet');
  });

  it('falls back gracefully for unknown status', () => {
    expect(typeof statusBadgeClass('something_new')).toBe('string');
    expect(statusBadgeClass('something_new').length).toBeGreaterThan(0);
  });
});
