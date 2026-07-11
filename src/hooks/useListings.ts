import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  createListingTemplate,
  getListingTemplates,
  deleteListingTemplate,
  addVariant,
  updateVariant,
  removeVariant,
  recordPriceChange,
  getPriceHistory,
  createPriceDropAlert,
  updateAdStatus,
} from '@/lib/listings';
import type {
  ListingTemplate,
  ListingVariant,
  ListingVariantInsert,
  ListingVariantUpdate,
  PriceHistory,
  PriceDropAlert,
} from '@/integrations/supabase/types_v2_listings';

export function useListings() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<ListingTemplate[]>([]);
  const [variants, setVariants] = useState<ListingVariant[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [priceAlerts, setPriceAlerts] = useState<PriceDropAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getListingTemplates(user.id);
      setTemplates(data);
    } catch (err) {
      setError('Failed to fetch templates');
      console.error('fetchTemplates error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const createTemplate = useCallback(
    async (template: { name: string; category_id?: string | null; default_fields?: Record<string, unknown> | null }) => {
      if (!user) return { error: 'Not authenticated' };
      const data = await createListingTemplate(user.id, template);
      if (data) {
        setTemplates((prev) => [data, ...prev]);
        return { data, error: null };
      }
      return { data: null, error: 'Failed to create template' };
    },
    [user]
  );

  const deleteTemplate = useCallback(async (templateId: string) => {
    const success = await deleteListingTemplate(templateId);
    if (success) {
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    }
    return success;
  }, []);

  const fetchVariants = useCallback(async (adId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('listing_variants')
        .select('*')
        .eq('ad_id', adId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setVariants((data as ListingVariant[]) || []);
    } catch (err) {
      setError('Failed to fetch variants');
      console.error('fetchVariants error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleAddVariant = useCallback(
    async (adId: string, variant: Omit<ListingVariantInsert, 'ad_id'>) => {
      const data = await addVariant(adId, variant);
      if (data) {
        setVariants((prev) => [...prev, data]);
        return { data, error: null };
      }
      return { data: null, error: 'Failed to add variant' };
    },
    []
  );

  const handleUpdateVariant = useCallback(
    async (variantId: string, updates: ListingVariantUpdate) => {
      const data = await updateVariant(variantId, updates);
      if (data) {
        setVariants((prev) => prev.map((v) => (v.id === variantId ? data : v)));
        return { data, error: null };
      }
      return { data: null, error: 'Failed to update variant' };
    },
    []
  );

  const handleRemoveVariant = useCallback(async (variantId: string) => {
    const success = await removeVariant(variantId);
    if (success) {
      setVariants((prev) => prev.filter((v) => v.id !== variantId));
    }
    return success;
  }, []);

  const fetchPriceHistory = useCallback(async (adId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPriceHistory(adId);
      setPriceHistory(data);
    } catch (err) {
      setError('Failed to fetch price history');
      console.error('fetchPriceHistory error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRecordPriceChange = useCallback(
    async (adId: string, oldPrice: number | null, newPrice: number | null) => {
      const data = await recordPriceChange(adId, oldPrice, newPrice);
      if (data) {
        setPriceHistory((prev) => [data, ...prev]);
        return { data, error: null };
      }
      return { data: null, error: 'Failed to record price change' };
    },
    []
  );

  const handleCreatePriceDropAlert = useCallback(
    async (adId: string, targetPrice: number) => {
      if (!user) return { error: 'Not authenticated' };
      const data = await createPriceDropAlert(user.id, adId, targetPrice);
      if (data) {
        setPriceAlerts((prev) => [data, ...prev]);
        return { data, error: null };
      }
      return { data: null, error: 'Failed to create price alert' };
    },
    [user]
  );

  const fetchPriceAlerts = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('price_drop_alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPriceAlerts((data as PriceDropAlert[]) || []);
    } catch (err) {
      console.error('fetchPriceAlerts error:', err);
    }
  }, [user]);

  const handleUpdateAdStatus = useCallback(
    async (adId: string, status: 'sold' | 'reserved' | 'archived' | 'approved' | 'pending' | 'draft') => {
      const success = await updateAdStatus(adId, status);
      return success;
    },
    []
  );

  useEffect(() => {
    if (user) {
      fetchTemplates();
      fetchPriceAlerts();
    }
  }, [user, fetchTemplates, fetchPriceAlerts]);

  return {
    templates,
    variants,
    priceHistory,
    priceAlerts,
    isLoading,
    error,
    fetchTemplates,
    createTemplate,
    deleteTemplate,
    fetchVariants,
    addVariant: handleAddVariant,
    updateVariant: handleUpdateVariant,
    removeVariant: handleRemoveVariant,
    fetchPriceHistory,
    recordPriceChange: handleRecordPriceChange,
    createPriceDropAlert: handleCreatePriceDropAlert,
    fetchPriceAlerts,
    updateAdStatus: handleUpdateAdStatus,
  };
}
