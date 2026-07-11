import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SavedSearch {
  id: string;
  name: string;
  query: string | null;
  filters: Record<string, unknown> | null;
  category_id: string | null;
  min_price: number | null;
  max_price: number | null;
  condition: string | null;
  division: string | null;
  district: string | null;
  notify_on_match: boolean | null;
  created_at: string;
}

export function useSavedSearches() {
  const { user } = useAuth();
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSavedSearches = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const { data } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setSavedSearches((data as SavedSearch[]) || []);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSavedSearches();
  }, [fetchSavedSearches]);

  const saveSearch = useCallback(async (params: {
    name: string;
    query?: string;
    category_id?: string;
    min_price?: number;
    max_price?: number;
    condition?: string;
    division?: string;
    district?: string;
    notify_on_match?: boolean;
  }) => {
    if (!user) return { error: 'Not authenticated' };
    const { data, error } = await supabase
      .from('saved_searches')
      .insert({
        user_id: user.id,
        name: params.name,
        query: params.query || null,
        category_id: params.category_id || null,
        min_price: params.min_price || null,
        max_price: params.max_price || null,
        condition: (params.condition as 'new' | 'used') || null,
        division: params.division || null,
        district: params.district || null,
        notify_on_match: params.notify_on_match ?? false,
      })
      .select()
      .single();
    if (!error) {
      fetchSavedSearches();
    }
    return { data, error };
  }, [user, fetchSavedSearches]);

  const deleteSavedSearch = useCallback(async (id: string) => {
    await supabase.from('saved_searches').delete().eq('id', id);
    fetchSavedSearches();
  }, [fetchSavedSearches]);

  const toggleNotification = useCallback(async (id: string, notify: boolean) => {
    await supabase
      .from('saved_searches')
      .update({ notify_on_match: notify })
      .eq('id', id);
    fetchSavedSearches();
  }, [fetchSavedSearches]);

  return {
    savedSearches,
    isLoading,
    saveSearch,
    deleteSavedSearch,
    toggleNotification,
    refetch: fetchSavedSearches,
  };
}
