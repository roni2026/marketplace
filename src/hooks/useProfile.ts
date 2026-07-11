// BazarBD — Phase 2: useProfile hook
// hooks/useProfile.ts

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  getMyProfile,
  updateMyProfile,
  uploadBanner,
  getProfileStats,
  refreshProfileStats,
} from '@/lib/profiles';
import type { ExtendedProfile, ProfileStats } from '@/integrations/supabase/types_v2_profiles';

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ExtendedProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await getMyProfile(user.id);
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setProfile(data);
    }

    const { data: statsData } = await getProfileStats(user.id);
    if (statsData) setStats(statsData);

    setIsLoading(false);
  }, [user]);

  const updateProfile = useCallback(async (
    updates: Parameters<typeof updateMyProfile>[1]
  ): Promise<{ error: Error | null }> => {
    if (!user) return { error: new Error('Not authenticated') };
    setIsSaving(true);

    const { error: updateError } = await updateMyProfile(user.id, updates);
    if (updateError) {
      setError(updateError.message);
      setIsSaving(false);
      return { error: updateError };
    }

    // Refresh local state
    await fetchProfile();
    setIsSaving(false);
    return { error: null };
  }, [user, fetchProfile]);

  const uploadProfileBanner = useCallback(async (file: File): Promise<{ url: string | null; error: Error | null }> => {
    if (!user) return { url: null, error: new Error('Not authenticated') };
    const { url, error: uploadError } = await uploadBanner(user.id, file);
    if (uploadError) return { url: null, error: uploadError };

    // Save banner URL to profile
    if (url) {
      await updateMyProfile(user.id, { banner_url: url });
      await fetchProfile();
    }
    return { url, error: null };
  }, [user, fetchProfile]);

  const refreshStats = useCallback(async () => {
    if (!user) return;
    await refreshProfileStats(user.id);
    const { data: statsData } = await getProfileStats(user.id);
    if (statsData) setStats(statsData);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setProfile(null);
      setStats(null);
      setIsLoading(false);
    }
  }, [user, fetchProfile]);

  return {
    profile,
    stats,
    isLoading,
    isSaving,
    error,
    fetchProfile,
    updateProfile,
    uploadProfileBanner,
    refreshStats,
  };
}
