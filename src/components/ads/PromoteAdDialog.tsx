import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, Rocket, Clock, Loader2 } from 'lucide-react';
import {
  listPromotionTypes, activatePromotion, getActivePromotions,
  promotionBadgeClass, formatPromotionPrice,
  type PromotionType,
} from '@/lib/adPromotions';

interface Props {
  adId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a promotion is successfully activated. */
  onPromoted?: () => void;
}

/**
 * Reusable seller-facing dialog to promote an ad. Lists the active promotion
 * products from the admin catalog and activates the chosen one via the
 * backend-enforced `activate_ad_promotion` RPC. Pricing is a placeholder —
 * wire a payment provider before charging.
 */
export function PromoteAdDialog({ adId, open, onOpenChange, onPromoted }: Props) {
  const [types, setTypes] = useState<PromotionType[]>([]);
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [activatingKey, setActivatingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !adId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [catalog, active] = await Promise.all([
          listPromotionTypes({ activeOnly: true }),
          getActivePromotions(adId),
        ]);
        if (cancelled) return;
        setTypes(catalog);
        setActiveKeys(new Set(active.map((a) => a.promotion_key)));
      } catch (e: any) {
        if (!cancelled) toast.error(e?.message || 'Failed to load promotions');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, adId]);

  const promote = async (t: PromotionType) => {
    if (!adId) return;
    setActivatingKey(t.key);
    try {
      const { error } = await activatePromotion(adId, t.key, {
        autoRefresh: t.key === 'auto_refresh',
      });
      if (error) throw error;
      toast.success(`${t.name} activated`);
      setActiveKeys((prev) => new Set(prev).add(t.key));
      onPromoted?.();
    } catch (e: any) {
      toast.error(e?.message || 'Could not activate promotion');
    } finally {
      setActivatingKey(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Rocket className="h-4 w-4 text-primary" /> Promote your ad
          </DialogTitle>
          <DialogDescription className="text-xs">
            Boost visibility and reach more buyers. Choose a promotion below.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
          </div>
        ) : types.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No promotions are available right now.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {types.map((t) => {
              const isActive = activeKeys.has(t.key);
              const busy = activatingKey === t.key;
              return (
                <div key={t.id} className="flex flex-col rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{t.name}</span>
                    {t.badge_label && (
                      <Badge variant="outline" className={`h-5 px-1.5 text-[10px] ${promotionBadgeClass(t.badge_color)}`}>
                        {t.badge_label}
                      </Badge>
                    )}
                  </div>
                  {t.description && <p className="mb-2 text-[12px] leading-snug text-muted-foreground">{t.description}</p>}
                  {t.benefits.length > 0 && (
                    <ul className="mb-2 space-y-0.5">
                      {t.benefits.slice(0, 3).map((b, i) => (
                        <li key={i} className="flex items-start gap-1 text-[11px] text-muted-foreground">
                          <Check className="mt-0.5 h-3 w-3 flex-shrink-0 text-emerald-500" /> {b}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{formatPromotionPrice(t.price, t.currency)}</span>
                      <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" /> {t.default_duration_days}d
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant={isActive ? 'secondary' : 'default'}
                      className="h-7 gap-1 text-xs"
                      disabled={isActive || busy}
                      onClick={() => promote(t)}
                    >
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isActive ? <Check className="h-3.5 w-3.5" /> : <Rocket className="h-3.5 w-3.5" />}
                      {isActive ? 'Active' : busy ? 'Activating' : 'Promote'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default PromoteAdDialog;
