import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => ({ data: null, error: null })),
          single: vi.fn(() => ({ data: null, error: null })),
          order: vi.fn(() => ({ data: [], error: null })),
          limit: vi.fn(() => ({ data: [], error: null })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: null, error: null })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => ({ data: null, error: null })),
            })),
          })),
        })),
        delete: vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) })),
      })),
      rpc: vi.fn(() => ({ data: null, error: null })),
    })),
  },
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock audit
vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn(),
}));

// Mock validation
vi.mock('@/lib/validation', () => ({
  sanitizeText: vi.fn((s: string) => s),
  validateSlug: vi.fn(() => ({ valid: true, errors: [] })),
}));

// Mock constants
vi.mock('@/lib/constants', () => ({
  generateSlug: vi.fn((s: string) => s.toLowerCase().replace(/\s+/g, '-')),
  formatPrice: vi.fn((p: number) => `৳${p}`),
}));

import { getVerificationRequirements } from '@/lib/shopVerification';

describe('Phase 3 — Shop Verification', () => {
  describe('getVerificationRequirements', () => {
    it('should return requirements for business verification', () => {
      const req = getVerificationRequirements('business');
      expect(req.title).toBe('Business Verification');
      expect(req.requiredDocuments).toContain('Trade License');
      expect(req.fields.length).toBeGreaterThan(0);
    });

    it('should return requirements for identity_kyc verification', () => {
      const req = getVerificationRequirements('identity_kyc');
      expect(req.title).toBe('Identity Verification (KYC)');
      expect(req.requiredDocuments).toContain('National ID Card (Front)');
    });

    it('should return requirements for business_license verification', () => {
      const req = getVerificationRequirements('business_license');
      expect(req.title).toBe('Business License Verification');
      expect(req.requiredDocuments).toContain('Business License');
    });

    it('should have required fields marked as required', () => {
      const req = getVerificationRequirements('business');
      const requiredFields = req.fields.filter((f) => f.required);
      expect(requiredFields.length).toBeGreaterThan(0);
    });

    it('should have file type fields for documents', () => {
      const req = getVerificationRequirements('identity_kyc');
      const fileFields = req.fields.filter((f) => f.type === 'file');
      expect(fileFields.length).toBeGreaterThan(0);
    });
  });
});
