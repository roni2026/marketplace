import { describe, it, expect } from 'vitest';
import { checkSpam, validateFile, checkRateLimit } from '@/lib/messagingSystem';
import { CONVERSATION_REPORT_REASONS, ALLOWED_FILE_TYPES, MAX_FILE_SIZE, MAX_IMAGE_SIZE, EDIT_TIME_LIMIT_MINUTES, DELETE_FOR_EVERYONE_LIMIT_MINUTES } from '@/integrations/supabase/types_v8_messaging';

describe('Phase 8 — Messaging System', () => {
  describe('checkSpam', () => {
    it('returns not spam for clean message', () => {
      const result = checkSpam('Hello, is this item still available?');
      expect(result.isSpam).toBe(false);
      expect(result.score).toBeLessThan(50);
    });

    it('detects spam keywords', () => {
      const result = checkSpam('Click here for free money! Buy now!');
      expect(result.score).toBeGreaterThan(0);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('detects excessive links', () => {
      const result = checkSpam('Check http://a.com http://b.com http://c.com http://d.com');
      expect(result.reasons).toContain('Contains multiple links');
    });

    it('detects repeated messages', () => {
      const msg = 'Buy my product now';
      const result = checkSpam(msg, [msg, msg, msg]);
      expect(result.reasons).toContain('Repeated message');
    });

    it('detects excessive capitalization', () => {
      const result = checkSpam('BUY THIS AMAZING PRODUCT NOW GREAT DEAL');
      expect(result.reasons).toContain('Excessive capitalization');
    });

    it('returns isSpam true when score >= 50', () => {
      const result = checkSpam('CLICK HERE FOR FREE MONEY! BUY NOW! ACT NOW! http://spam.com http://scam.com http://fraud.com');
      expect(result.isSpam).toBe(true);
    });

    it('handles empty message', () => {
      const result = checkSpam('');
      expect(result.isSpam).toBe(false);
      expect(result.score).toBe(0);
    });
  });

  describe('validateFile', () => {
    it('validates valid image', () => {
      const file = new File(['test'], 'image.jpg', { type: 'image/jpeg' });
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it('validates valid PDF', () => {
      const file = new File(['test'], 'doc.pdf', { type: 'application/pdf' });
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it('rejects oversized image', () => {
      const file = new File(new Array(6 * 1024 * 1024).fill('x'), 'big.jpg', { type: 'image/jpeg' });
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('5MB');
    });

    it('rejects unsupported file type', () => {
      const file = new File(['test'], 'malware.exe', { type: 'application/x-msdownload' });
      const result = validateFile(file);
      expect(result.valid).toBe(false);
    });

    it('validates valid PNG', () => {
      const file = new File(['test'], 'photo.png', { type: 'image/png' });
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it('validates valid WebP', () => {
      const file = new File(['test'], 'photo.webp', { type: 'image/webp' });
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it('validates valid DOCX', () => {
      const file = new File(['test'], 'doc.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it('validates valid TXT', () => {
      const file = new File(['test'], 'notes.txt', { type: 'text/plain' });
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it('validates valid ZIP', () => {
      const file = new File(['test'], 'archive.zip', { type: 'application/zip' });
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });
  });

  describe('checkRateLimit', () => {
    it('allows messages within rate limit', () => {
      const key = 'test-conv-1';
      for (let i = 0; i < 10; i++) {
        expect(checkRateLimit(key)).toBe(true);
      }
    });

    it('blocks messages exceeding rate limit', () => {
      const key = 'test-conv-2';
      // Send max allowed messages
      for (let i = 0; i < 20; i++) {
        checkRateLimit(key);
      }
      // Next message should be blocked
      expect(checkRateLimit(key)).toBe(false);
    });

    it('uses separate counters per conversation', () => {
      const key1 = 'test-conv-3';
      const key2 = 'test-conv-4';
      for (let i = 0; i < 20; i++) checkRateLimit(key1);
      expect(checkRateLimit(key1)).toBe(false);
      expect(checkRateLimit(key2)).toBe(true);
    });
  });

  describe('CONVERSATION_REPORT_REASONS', () => {
    it('contains all 9 report reasons', () => {
      expect(CONVERSATION_REPORT_REASONS).toHaveLength(9);
    });

    it('includes spam reason', () => {
      const codes = CONVERSATION_REPORT_REASONS.map(r => r.code);
      expect(codes).toContain('spam');
      expect(codes).toContain('scam');
      expect(codes).toContain('harassment');
      expect(codes).toContain('abuse');
      expect(codes).toContain('threats');
      expect(codes).toContain('offensive_language');
      expect(codes).toContain('fraud');
      expect(codes).toContain('fake_products');
      expect(codes).toContain('other');
    });

    it('each reason has code and label', () => {
      CONVERSATION_REPORT_REASONS.forEach(r => {
        expect(r.code).toBeTruthy();
        expect(r.label).toBeTruthy();
      });
    });
  });

  describe('ALLOWED_FILE_TYPES', () => {
    it('includes image types', () => {
      expect(ALLOWED_FILE_TYPES).toContain('image/jpeg');
      expect(ALLOWED_FILE_TYPES).toContain('image/png');
      expect(ALLOWED_FILE_TYPES).toContain('image/webp');
      expect(ALLOWED_FILE_TYPES).toContain('image/gif');
    });

    it('includes document types', () => {
      expect(ALLOWED_FILE_TYPES).toContain('application/pdf');
      expect(ALLOWED_FILE_TYPES).toContain('text/plain');
      expect(ALLOWED_FILE_TYPES).toContain('application/zip');
    });
  });

  describe('Constants', () => {
    it('MAX_FILE_SIZE is 10MB', () => {
      expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
    });

    it('MAX_IMAGE_SIZE is 5MB', () => {
      expect(MAX_IMAGE_SIZE).toBe(5 * 1024 * 1024);
    });

    it('EDIT_TIME_LIMIT_MINUTES is 15', () => {
      expect(EDIT_TIME_LIMIT_MINUTES).toBe(15);
    });

    it('DELETE_FOR_EVERYONE_LIMIT_MINUTES is 60', () => {
      expect(DELETE_FOR_EVERYONE_LIMIT_MINUTES).toBe(60);
    });
  });
});
