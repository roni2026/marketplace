import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdCard } from "@/components/ads/AdCard";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { History } from "lucide-react";

interface Ad {
  id: string;
  title: string;
  slug: string;
  price: number | null;
  price_type: string;
  condition: string;
  division: string;
  district: string;
  is_featured: boolean;
  created_at: string;
  ad_images: { image_url: string }[];
  categories: { name: string; slug: string } | null;
}

interface RecentlyViewedProps {
  favorites?: string[];
}

export function RecentlyViewed({ favorites = [] }: RecentlyViewedProps) {
  const { ids } = useRecentlyViewed();
  const [ads, setAds] = useState<Ad[]>([]);

  useEffect(() => {
    if (ids.length === 0) {
      setAds([]);
      return;
    }

    let cancelled = false;
    supabase
      .from("ads")
      .select("*, ad_images(image_url), categories(name, slug)")
      .in("id", ids)
      .eq("status", "approved")
      .then(({ data }) => {
        if (cancelled || !data) return;
        // preserve most-recently-viewed-first order
        const order = new Map(ids.map((id, i) => [id, i]));
        const sorted = [...(data as Ad[])].sort(
          (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
        );
        setAds(sorted.slice(0, 4));
      });

    return () => {
      cancelled = true;
    };
  }, [ids]);

  if (ads.length === 0) return null;

  return (
    <section className="py-8">
      <div className="flex items-center gap-2 mb-6">
        <History className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-2xl font-bold">Recently Viewed</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {ads.map((ad) => (
          <AdCard key={ad.id} ad={ad} isFavorite={favorites.includes(ad.id)} />
        ))}
      </div>
    </section>
  );
}
