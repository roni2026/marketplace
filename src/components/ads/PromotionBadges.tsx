import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  getAdPromotionBadges, promotionBadgeClass, type PromotionBadgeInfo,
} from '@/lib/adPromotions';
import { cn } from '@/lib/utils';

interface Props {
  adId?: string;
  /** Pass already-loaded badge info to skip the fetch (preferred in lists to avoid N+1). */
  badges?: PromotionBadgeInfo[];
  className?: string;
  max?: number;
}

/**
 * Renders colored badges for an ad's active promotions. Either pass a
 * pre-loaded `badges` array (preferred for lists) or an `adId` to fetch on
 * demand (fine for a single product page).
 */
export function PromotionBadges({ adId, badges, className, max = 3 }: Props) {
  const [fetched, setFetched] = useState<PromotionBadgeInfo[] | null>(null);

  useEffect(() => {
    if (badges || !adId) return;
    let cancelled = false;
    getAdPromotionBadges(adId)
      .then((rows) => { if (!cancelled) setFetched(rows); })
      .catch(() => { if (!cancelled) setFetched([]); });
    return () => { cancelled = true; };
  }, [adId, badges]);

  const items = badges ?? fetched ?? [];
  const visible = items.filter((i) => i.badge_label).slice(0, max);
  if (visible.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {visible.map((i, idx) => (
        <Badge
          key={`${i.promotion_key}-${idx}`}
          variant="outline"
          className={cn('h-5 px-1.5 text-[10px] font-medium', promotionBadgeClass(i.badge_color || 'slate'))}
        >
          {i.badge_label}
        </Badge>
      ))}
    </div>
  );
}

export default PromotionBadges;
