import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdCard } from "@/components/ads/AdCard";

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

interface SimilarAdsProps {
  categoryId: string;
  excludeAdId: string;
  favorites?: string[];
}

export function SimilarAds({ categoryId, excludeAdId, favorites = [] }: SimilarAdsProps) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    supabase
      .from("ads")
      .select("*, ad_images(image_url), categories(name, slug)")
      .eq("status", "approved")
      .eq("category_id", categoryId)
      .neq("id", excludeAdId)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(4)
      .then(({ data }) => {
        if (cancelled) return;
        setAds((data as Ad[]) || []);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [categoryId, excludeAdId]);

  if (isLoading || ads.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold mb-4">Similar Ads</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ads.map((ad) => (
          <AdCard key={ad.id} ad={ad} isFavorite={favorites.includes(ad.id)} />
        ))}
      </div>
    </section>
  );
}
