/**
 * Shop verification functions for Phase 3.
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logAudit } from '@/lib/audit';
import type {
  Shop,
  ShopVerification,
  ShopVerificationInsert,
  ShopVerificationStatus,
  VerificationType,
} from '@/integrations/supabase/types_v3_shops';

// -------------------------------------------------------------------------
// Verification Requirements
// -------------------------------------------------------------------------

export interface VerificationRequirement {
  title: string;
  description: string;
  requiredDocuments: string[];
  fields: {
    name: string;
    label: string;
    type: 'text' | 'file' | 'textarea';
    required: boolean;
  }[];
}

export function getVerificationRequirements(type: VerificationType): VerificationRequirement {
  const requirements: Record<VerificationType, VerificationRequirement> = {
    business: {
      title: 'Business Verification',
      description: 'Verify your business entity to earn the Verified Shop badge.',
      requiredDocuments: ['Trade License', 'Tax Registration Certificate'],
      fields: [
        { name: 'business_name', label: 'Business Name', type: 'text', required: true },
        { name: 'registration_number', label: 'Business Registration Number', type: 'text', required: true },
        { name: 'business_address', label: 'Business Address', type: 'textarea', required: true },
        { name: 'trade_license', label: 'Trade License Document', type: 'file', required: true },
        { name: 'tax_certificate', label: 'Tax Registration Certificate', type: 'file', required: true },
      ],
    },
    identity_kyc: {
      title: 'Identity Verification (KYC)',
      description: 'Verify your identity to build trust with buyers.',
      requiredDocuments: ['National ID Card (Front)', 'National ID Card (Back)'],
      fields: [
        { name: 'full_name', label: 'Full Legal Name', type: 'text', required: true },
        { name: 'date_of_birth', label: 'Date of Birth', type: 'text', required: true },
        { name: 'national_id', label: 'National ID Number', type: 'text', required: true },
        { name: 'id_front', label: 'National ID Card (Front)', type: 'file', required: true },
        { name: 'id_back', label: 'National ID Card (Back)', type: 'file', required: true },
      ],
    },
    business_license: {
      title: 'Business License Verification',
      description: 'Verify your business license for additional credibility.',
      requiredDocuments: ['Business License'],
      fields: [
        { name: 'license_number', label: 'License Number', type: 'text', required: true },
        { name: 'issuing_authority', label: 'Issuing Authority', type: 'text', required: true },
        { name: 'issue_date', label: 'Issue Date', type: 'text', required: true },
        { name: 'expiry_date', label: 'Expiry Date', type: 'text', required: true },
        { name: 'license_document', label: 'Business License Document', type: 'file', required: true },
      ],
    },
  };

  return requirements[type];
}

// -------------------------------------------------------------------------
// Verification Functions
// -------------------------------------------------------------------------

export async function submitVerification(
  shopId: string,
  type: VerificationType,
  data: { submittedData?: Record<string, unknown>; documentUrls?: string[] }
): Promise<ShopVerification | null> {
  try {
    const insert: ShopVerificationInsert = {
      shop_id: shopId,
      verification_type: type,
      submitted_data: data.submittedData || {},
      document_urls: data.documentUrls || [],
    };

    const { data: verification, error } = await supabase
      .from('shop_verifications')
      .insert(insert)
      .select()
      .single();

    if (error) throw error;

    await logAudit({
      action: 'create',
      resourceType: 'shop_verification',
      resourceId: verification.id,
      details: { shop_id: shopId, type },
    });

    toast.success('Verification submitted for review');
    return verification as ShopVerification;
  } catch (error) {
    console.error('submitVerification error:', error);
    toast.error('Failed to submit verification');
    return null;
  }
}

export async function getVerifications(shopId: string): Promise<ShopVerification[]> {
  try {
    const { data, error } = await supabase
      .from('shop_verifications')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as ShopVerification[]) || [];
  } catch (error) {
    console.error('getVerifications error:', error);
    return [];
  }
}

export async function getVerificationById(verificationId: string): Promise<ShopVerification | null> {
  try {
    const { data, error } = await supabase
      .from('shop_verifications')
      .select('*')
      .eq('id', verificationId)
      .maybeSingle();

    if (error) throw error;
    return data as ShopVerification | null;
  } catch (error) {
    console.error('getVerificationById error:', error);
    return null;
  }
}

export async function reviewVerification(
  verificationId: string,
  decision: 'approved' | 'rejected',
  reviewerId: string,
  notes?: string,
  rejectionReason?: string
): Promise<ShopVerification | null> {
  try {
    // Get the verification to find shop_id
    const verification = await getVerificationById(verificationId);
    if (!verification) {
      toast.error('Verification not found');
      return null;
    }

    const { data, error } = await supabase
      .from('shop_verifications')
      .update({
        status: decision,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        notes: notes || null,
        rejection_reason: decision === 'rejected' ? rejectionReason || null : null,
      })
      .eq('id', verificationId)
      .select()
      .single();

    if (error) throw error;

    // If approved, update shop's is_verified
    if (decision === 'approved') {
      await supabase
        .from('shops')
        .update({ is_verified: true })
        .eq('id', verification.shop_id);
    }

    await logAudit({
      action: 'verify',
      resourceType: 'shop_verification',
      resourceId: verificationId,
      details: { shop_id: verification.shop_id, decision, notes },
    });

    toast.success(`Verification ${decision}`);
    return data as ShopVerification;
  } catch (error) {
    console.error('reviewVerification error:', error);
    toast.error('Failed to review verification');
    return null;
  }
}

export async function getPendingVerifications(): Promise<(ShopVerification & { shop: Shop })[]> {
  try {
    const { data, error } = await supabase
      .from('shop_verifications')
      .select('*, shop:shops(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data as (ShopVerification & { shop: Shop })[]) || [];
  } catch (error) {
    console.error('getPendingVerifications error:', error);
    return [];
  }
}

export async function getAllVerifications(
  filters?: { status?: ShopVerificationStatus; type?: VerificationType }
): Promise<(ShopVerification & { shop: Shop })[]> {
  try {
    let query = supabase
      .from('shop_verifications')
      .select('*, shop:shops(*)')
      .order('created_at', { ascending: false });

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.type) query = query.eq('verification_type', filters.type);

    const { data, error } = await query;

    if (error) throw error;
    return (data as (ShopVerification & { shop: Shop })[]) || [];
  } catch (error) {
    console.error('getAllVerifications error:', error);
    return [];
  }
}

export async function checkVerificationStatus(shopId: string): Promise<{
  isVerified: boolean;
  verifications: ShopVerification[];
  pendingTypes: VerificationType[];
  approvedTypes: VerificationType[];
}> {
  try {
    const verifications = await getVerifications(shopId);
    const { data: shop } = await supabase
      .from('shops')
      .select('is_verified')
      .eq('id', shopId)
      .single();

    const pendingTypes = verifications
      .filter((v) => v.status === 'pending' || v.status === 'under_review')
      .map((v) => v.verification_type);

    const approvedTypes = verifications
      .filter((v) => v.status === 'approved')
      .map((v) => v.verification_type);

    return {
      isVerified: shop?.is_verified || false,
      verifications,
      pendingTypes: [...new Set(pendingTypes)],
      approvedTypes: [...new Set(approvedTypes)],
    };
  } catch (error) {
    console.error('checkVerificationStatus error:', error);
    return { isVerified: false, verifications: [], pendingTypes: [], approvedTypes: [] };
  }
}

export async function expireVerifications(): Promise<number> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('shop_verifications')
      .update({ status: 'expired' })
      .lt('expires_at', now)
      .in('status', ['pending', 'approved'])
      .select('id');

    if (error) throw error;
    return data?.length || 0;
  } catch (error) {
    console.error('expireVerifications error:', error);
    return 0;
  }
}

export async function resubmitVerification(
  verificationId: string,
  data: { submittedData?: Record<string, unknown>; documentUrls?: string[] }
): Promise<ShopVerification | null> {
  try {
    const existing = await getVerificationById(verificationId);
    if (!existing) {
      toast.error('Verification not found');
      return null;
    }

    if (existing.status !== 'rejected' && existing.status !== 'expired') {
      toast.error('Only rejected or expired verifications can be resubmitted');
      return null;
    }

    const { data: updated, error } = await supabase
      .from('shop_verifications')
      .update({
        status: 'pending',
        submitted_data: data.submittedData || existing.submitted_data,
        document_urls: data.documentUrls || existing.document_urls,
        reviewed_by: null,
        reviewed_at: null,
        rejection_reason: null,
        notes: null,
      })
      .eq('id', verificationId)
      .select()
      .single();

    if (error) throw error;

    toast.success('Verification resubmitted');
    return updated as ShopVerification;
  } catch (error) {
    console.error('resubmitVerification error:', error);
    toast.error('Failed to resubmit verification');
    return null;
  }
}
