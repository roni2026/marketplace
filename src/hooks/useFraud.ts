import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  addBlacklistItem,
  checkIPReputation,
  type FraudFlag,
  type IPReputation,
  type DeviceFingerprint,
} from '@/lib/fraud';
import { toast } from 'sonner';

export function useFraud() {
  const [fraudFlags, setFraudFlags] = useState<FraudFlag[]>([]);
  const [shadowBans, setShadowBans] = useState<{ id: string; user_id: string; reason: string | null; created_at: string }[]>([]);
  const [blacklist, setBlacklist] = useState<{ id: string; type: string; value: string; reason: string | null; created_at: string }[]>([]);
  const [ipReputation, setIpReputation] = useState<IPReputation | null>(null);
  const [deviceFingerprints, setDeviceFingerprints] = useState<DeviceFingerprint[]>([]);
  const [suspiciousAccounts, setSuspiciousAccounts] = useState<FraudFlag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFraudFlags = useCallback(async (severityFilter?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('fraud_flags')
        .select('*')
        .eq('resolved', false)
        .order('created_at', { ascending: false });

      if (severityFilter && severityFilter !== 'all') {
        query = query.eq('severity', severityFilter);
      }

      const { data, error: err } = await query;
      if (err) throw err;
      setFraudFlags(data as FraudFlag[]);
      return data as FraudFlag[];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch fraud flags');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resolveFraudFlag = useCallback(async (flagId: string, adminId: string) => {
    try {
      const { error: err } = await supabase
        .from('fraud_flags')
        .update({
          resolved: true,
          resolved_by: adminId,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', flagId);
      if (err) throw err;
      toast.success('Fraud flag resolved');
      return { error: null };
    } catch (err) {
      toast.error('Failed to resolve fraud flag');
      return { error: err as Error };
    }
  }, []);

  const fetchSuspiciousAccounts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('fraud_flags')
        .select('*')
        .in('severity', ['high', 'critical'])
        .eq('resolved', false)
        .order('created_at', { ascending: false });
      if (err) throw err;
      setSuspiciousAccounts(data as FraudFlag[]);
      return data as FraudFlag[];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch suspicious accounts');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchShadowBans = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('shadow_bans')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setShadowBans(data || []);
      return data || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch shadow bans');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addShadowBan = useCallback(async (userId: string, reason: string, adminId: string) => {
    try {
      const { error: err } = await supabase.from('shadow_bans').insert({
        user_id: userId,
        reason,
        banned_by: adminId,
      });
      if (err) throw err;
      toast.success('User shadow banned');
      return { error: null };
    } catch (err) {
      toast.error('Failed to shadow ban user');
      return { error: err as Error };
    }
  }, []);

  const removeShadowBan = useCallback(async (userId: string) => {
    try {
      const { error: err } = await supabase
        .from('shadow_bans')
        .delete()
        .eq('user_id', userId);
      if (err) throw err;
      toast.success('Shadow ban removed');
      return { error: null };
    } catch (err) {
      toast.error('Failed to remove shadow ban');
      return { error: err as Error };
    }
  }, []);

  const fetchBlacklist = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('blacklisted_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setBlacklist(data || []);
      return data || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch blacklist');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addToBlacklist = useCallback(
    async (type: 'ip' | 'email' | 'phone', value: string, reason: string, adminId: string) => {
      const { error: err } = await addBlacklistItem(type, value, reason, adminId);
      if (err) {
        toast.error('Failed to add to blacklist');
        return { error: err };
      }
      toast.success('Item added to blacklist');
      return { error: null };
    },
    []
  );

  const removeFromBlacklist = useCallback(async (id: string) => {
    try {
      const { error: err } = await supabase.from('blacklisted_items').delete().eq('id', id);
      if (err) throw err;
      toast.success('Item removed from blacklist');
      return { error: null };
    } catch (err) {
      toast.error('Failed to remove from blacklist');
      return { error: err as Error };
    }
  }, []);

  const fetchIPReputation = useCallback(async (ip: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const rep = await checkIPReputation(ip);
      setIpReputation(rep);
      return rep;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch IP reputation');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchDeviceFingerprints = useCallback(async (userId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('device_fingerprints')
        .select('*')
        .eq('user_id', userId)
        .order('last_seen', { ascending: false });
      if (err) throw err;
      setDeviceFingerprints(data as DeviceFingerprint[]);
      return data as DeviceFingerprint[];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch device fingerprints');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    fraudFlags,
    shadowBans,
    blacklist,
    ipReputation,
    deviceFingerprints,
    suspiciousAccounts,
    isLoading,
    error,
    fetchFraudFlags,
    resolveFraudFlag,
    fetchSuspiciousAccounts,
    fetchShadowBans,
    addShadowBan,
    removeShadowBan,
    fetchBlacklist,
    addToBlacklist,
    removeFromBlacklist,
    fetchIPReputation,
    fetchDeviceFingerprints,
  };
}
