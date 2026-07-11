import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  compareProducts as compareProductsFn,
  compareSellers as compareSellersFn,
  ComparisonProduct,
  SellerComparison,
} from '@/lib/buyerExperience';

const MAX_COMPARE = 4;
const STORAGE_KEY = 'compare_items';

export function useCompare() {
  const { user } = useAuth();
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [products, setProducts] = useState<ComparisonProduct[]>([]);
  const [sellers, setSellers] = useState<SellerComparison[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCompareIds(JSON.parse(stored));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const persistIds = useCallback((ids: string[]) => {
    setCompareIds(ids);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // ignore storage errors
    }
  }, []);

  const addToCompare = useCallback((adId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(adId)) return prev;
      if (prev.length >= MAX_COMPARE) return prev;
      const next = [...prev, adId];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const removeFromCompare = useCallback((adId: string) => {
    setCompareIds((prev) => {
      const next = prev.filter((id) => id !== adId);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const clearComparison = useCallback(() => {
    persistIds([]);
    setProducts([]);
    setSellers([]);
  }, [persistIds]);

  const fetchComparison = useCallback(async () => {
    if (compareIds.length === 0) {
      setProducts([]);
      setSellers([]);
      return;
    }
    setIsLoading(true);
    setError(null);

    const { products: prodData, error: prodError } = await compareProductsFn(compareIds);
    if (prodError) {
      setError(prodError.message || 'Failed to load comparison');
      setIsLoading(false);
      return;
    }
    setProducts(prodData);

    const sellerIds = [...new Set(prodData.map((p) => p.user_id))];
    if (sellerIds.length > 0) {
      const { sellers: sellerData } = await compareSellersFn(sellerIds);
      setSellers(sellerData);
    }

    setIsLoading(false);
  }, [compareIds]);

  useEffect(() => {
    if (compareIds.length > 0) {
      fetchComparison();
    } else {
      setProducts([]);
      setSellers([]);
    }
  }, [compareIds, fetchComparison]);

  return {
    compareIds,
    products,
    sellers,
    isLoading,
    error,
    maxCompare: MAX_COMPARE,
    addToCompare,
    removeFromCompare,
    clearComparison,
    fetchComparison,
  };
}
