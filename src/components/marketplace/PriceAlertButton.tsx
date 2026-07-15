/**
 * PriceAlertButton — Button shown on AdDetails to set a price drop alert.
 */
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Bell, BellRing } from 'lucide-react';

interface PriceAlertButtonProps {
  adId: string;
  adTitle: string;
  adPrice: number | null;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function PriceAlertButton({ adId, adTitle, adPrice, variant = 'outline', size = 'sm' }: PriceAlertButtonProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasAlert, setHasAlert] = useState(false);

  const suggestedTarget = adPrice ? Math.round(adPrice * 0.9) : 0;

  const handleSubmit = async () => {
    if (!user) { toast.error('Please login to set price alerts'); return; }
    const price = parseFloat(targetPrice);
    if (!price || price <= 0) { toast.error('Enter a valid target price'); return; }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('price_drop_alerts').insert({
        user_id: user.id,
        ad_id: adId,
        target_price: price,
      });
      if (error) {
        if (error.code === '23505') {
          toast.error('You already have a price alert for this listing');
        } else {
          throw error;
        }
      } else {
        toast.success(`Price alert set! We'll notify you when "${adTitle}" drops to ৳${price.toLocaleString()}`);
        setHasAlert(true);
        setOpen(false);
        setTargetPrice('');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to set alert');
    }
    setSubmitting(false);
  };

  if (hasAlert) {
    return (
      <Button variant={variant} size={size} disabled className="gap-2">
        <BellRing className="h-4 w-4" /> Alert Set
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className="gap-2">
          <Bell className="h-4 w-4" /> Price Alert
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" /> Set Price Alert
          </DialogTitle>
          <DialogDescription>
            Get notified when "{adTitle}" drops to your target price.
            {adPrice && ` Current price: ৳${adPrice.toLocaleString()}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {suggestedTarget > 0 && (
            <div>
              <Label>Suggested Target (10% off)</Label>
              <button
                type="button"
                onClick={() => setTargetPrice(String(suggestedTarget))}
                className="mt-2 px-3 py-1.5 rounded-lg border bg-card hover:border-primary hover:text-primary transition-colors text-sm font-medium"
              >
                ৳{suggestedTarget.toLocaleString()}
              </button>
            </div>
          )}

          <div>
            <Label>Your Target Price (৳)</Label>
            <Input
              type="number"
              value={targetPrice}
              onChange={e => setTargetPrice(e.target.value)}
              placeholder="Enter target price"
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !targetPrice}>
            {submitting ? 'Setting...' : 'Set Alert'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
