/**
 * OfferDialog — Lets a buyer make an offer on a listing from AdDetails.
 * Shows current price, suggested offer amounts, and a message field.
 */
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Tag, Send } from 'lucide-react';

interface OfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adId: string;
  adTitle: string;
  adPrice: number | null;
  sellerId: string;
  onOfferSubmitted?: () => void;
}

export function OfferDialog({ open, onOpenChange, adId, adTitle, adPrice, sellerId, onOfferSubmitted }: OfferDialogProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const suggestedAmounts = adPrice ? [
    Math.round(adPrice * 0.9),
    Math.round(adPrice * 0.85),
    Math.round(adPrice * 0.8),
  ] : [];

  const handleSubmit = async () => {
    if (!user) { toast.error('Please login to make an offer'); return; }
    if (user.id === sellerId) { toast.error('You cannot make an offer on your own listing'); return; }
    const offerAmount = parseFloat(amount);
    if (!offerAmount || offerAmount <= 0) { toast.error('Enter a valid amount'); return; }
    if (adPrice && offerAmount > adPrice) {
      toast.error('Offer cannot be higher than the listing price');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('offers').insert({
        ad_id: adId,
        buyer_id: user.id,
        seller_id: sellerId,
        amount: offerAmount,
        message: message.trim() || null,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      if (error) throw error;

      // Send notification to seller
      await supabase.from('notifications').insert({
        user_id: sellerId,
        type: 'new_offer',
        title: 'New Offer Received',
        message: `You received an offer of ৳${offerAmount.toLocaleString()} for "${adTitle}"`,
        data: { ad_id: adId, offer_amount: offerAmount },
      }).catch(() => {});

      toast.success('Offer sent! The seller will be notified.');
      setAmount('');
      setMessage('');
      onOpenChange(false);
      onOfferSubmitted?.();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send offer');
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" /> Make an Offer
          </DialogTitle>
          <DialogDescription>
            Make an offer on "{adTitle}"
            {adPrice && ` · Listed at ৳${adPrice.toLocaleString()}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {suggestedAmounts.length > 0 && (
            <div>
              <Label>Quick Offer</Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {suggestedAmounts.map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmount(String(amt))}
                    className="px-3 py-1.5 rounded-lg border bg-card hover:border-primary hover:text-primary transition-colors text-sm font-medium"
                  >
                    ৳{amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label>Your Offer (৳)</Label>
            <Input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="mt-1"
            />
            {adPrice && amount && parseFloat(amount) > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {parseFloat(amount) < adPrice ? (
                  <Badge variant="secondary" className="gap-1">
                    {Math.round((1 - parseFloat(amount) / adPrice) * 100)}% below asking
                  </Badge>
                ) : parseFloat(amount) === adPrice ? (
                  <Badge variant="secondary">Full asking price</Badge>
                ) : (
                  <Badge variant="destructive">Above asking price</Badge>
                )}
              </p>
            )}
          </div>

          <div>
            <Label>Message (optional)</Label>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Add a message to the seller..."
              rows={3}
              maxLength={300}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !amount} className="gap-2">
            {submitting ? 'Sending...' : (<><Send className="h-4 w-4" /> Send Offer</>)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
