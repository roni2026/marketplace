import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "bazario-recently-viewed";
const MAX_ITEMS = 12;

/**
 * Tracks recently viewed ad IDs in localStorage (most recent first).
 * No backend/table required — keeps this feature fully client-side.
 */
export function useRecentlyViewed() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setIds(JSON.parse(raw));
    } catch {
      // ignore corrupt storage
    }
  }, []);

  const recordView = useCallback((adId: string) => {
    setIds((prev) => {
      const next = [adId, ...prev.filter((id) => id !== adId)].slice(0, MAX_ITEMS);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage full/unavailable — ignore
      }
      return next;
    });
  }, []);

  return { ids, recordView };
}
