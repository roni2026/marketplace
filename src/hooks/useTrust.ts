import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  verifyBusiness,
  verifyAddress,
  calculateTrustScore,
  calculateReputationScore,
  getVerificationStatus,
  type VerificationStatus,
  type BusinessVerification,
  type AddressVerification,
  type SellerScore,
} from '@/lib/trust';
import { toast } from 'sonner';

export function useTrust() {
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [businessVerifications, setBusinessVerifications] = useState<BusinessVerification[]>([]);
  const [addressVerifications, setAddressVerifications] = useState<AddressVerification[]>([]);
  const [sellerScores, setSellerScores] = useState<SellerScore[]>([]);
  const [trustScore, setTrustScore] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVerificationStatus = useCallback(async (userId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const status = await getVerificationStatus(userId);
      setVerificationStatus(status);
      return status;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch verification status');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitBusinessVerification = useCallback(
    async (
      userId: string,
      data: {
        business_name: string;
        business_type: string;
        license_number?: string;
        tax_id?: string;
        address?: string;
        documents?: Record<string, unknown>[];
      }
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        const { error: err } = await verifyBusiness(userId, data);
        if (err) throw err;
        toast.success('Business verification submitted');
        return { error: null };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to submit business verification';
        setError(msg);
        toast.error(msg);
        return { error: err as Error };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const submitAddressVerification = useCallback(
    async (userId: string, address: string, coordinates?: { lat: number; lng: number }) => {
      setIsLoading(true);
      setError(null);
      try {
        const { error: err } = await verifyAddress(userId, address, coordinates);
        if (err) throw err;
        toast.success('Address verification submitted');
        return { error: null };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to submit address verification';
        setError(msg);
        toast.error(msg);
        return { error: err as Error };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const fetchTrustScore = useCallback(async (userId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const score = await calculateTrustScore(userId);
      setTrustScore(score);
      return score;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trust score');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshTrustScore = useCallback(async (userId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const [score, repScore] = await Promise.all([
        calculateTrustScore(userId),
        calculateReputationScore(userId),
      ]);
      setTrustScore(score);
      toast.success(`Trust score updated: ${score} | Reputation: ${repScore}`);
      return { trustScore: score, reputationScore: repScore };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to refresh trust score';
      setError(msg);
      toast.error(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPendingBusinessVerifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('business_verifications')
        .select('*')
        .eq('verification_status', 'pending')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setBusinessVerifications(data as BusinessVerification[]);
      return data as BusinessVerification[];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch business verifications');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPendingAddressVerifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('address_verifications')
        .select('*')
        .eq('verification_status', 'pending')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setAddressVerifications(data as AddressVerification[]);
      return data as AddressVerification[];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch address verifications');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAllSellerScores = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('seller_scores')
        .select('*')
        .order('trust_score', { ascending: false });
      if (err) throw err;
      setSellerScores(data as SellerScore[]);
      return data as SellerScore[];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch seller scores');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const approveBusinessVerification = useCallback(async (id: string, adminId: string) => {
    try {
      const { error: err } = await supabase
        .from('business_verifications')
        .update({
          verification_status: 'approved',
          verified_at: new Date().toISOString(),
          verified_by: adminId,
        })
        .eq('id', id);
      if (err) throw err;
      toast.success('Business verification approved');
      return { error: null };
    } catch (err) {
      toast.error('Failed to approve business verification');
      return { error: err as Error };
    }
  }, []);

  const rejectBusinessVerification = useCallback(async (id: string, adminId: string) => {
    try {
      const { error: err } = await supabase
        .from('business_verifications')
        .update({
          verification_status: 'rejected',
          verified_at: new Date().toISOString(),
          verified_by: adminId,
        })
        .eq('id', id);
      if (err) throw err;
      toast.success('Business verification rejected');
      return { error: null };
    } catch (err) {
      toast.error('Failed to reject business verification');
      return { error: err as Error };
    }
  }, []);

  const approveAddressVerification = useCallback(async (id: string, adminId: string) => {
    try {
      const { error: err } = await supabase
        .from('address_verifications')
        .update({
          verification_status: 'approved',
          verified_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (err) throw err;
      toast.success('Address verification approved');
      return { error: null };
    } catch (err) {
      toast.error('Failed to approve address verification');
      return { error: err as Error };
    }
  }, []);

  const rejectAddressVerification = useCallback(async (id: string) => {
    try {
      const { error: err } = await supabase
        .from('address_verifications')
        .update({
          verification_status: 'rejected',
          verified_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (err) throw err;
      toast.success('Address verification rejected');
      return { error: null };
    } catch (err) {
      toast.error('Failed to reject address verification');
      return { error: err as Error };
    }
  }, []);

  return {
    verificationStatus,
    businessVerifications,
    addressVerifications,
    sellerScores,
    trustScore,
    isLoading,
    error,
    fetchVerificationStatus,
    submitBusinessVerification,
    submitAddressVerification,
    fetchTrustScore,
    refreshTrustScore,
    fetchPendingBusinessVerifications,
    fetchPendingAddressVerifications,
    fetchAllSellerScores,
    approveBusinessVerification,
    rejectBusinessVerification,
    approveAddressVerification,
    rejectAddressVerification,
  };
}
