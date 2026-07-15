/**
 * SellerReviewForm — Lets a buyer submit a star rating + review for a seller.
 * Can be used on AdDetails or after a completed sale.
 */
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SellerReviewFormProps {
  sellerId: string;
  adId?: string;
  onSubmitted?: () => void;
}

export function SellerReviewForm({ sellerId, adId, onSubmitted }: SellerReviewFormProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  const handleSubmit = async () => {
    if (!user) { toast.error('Please login to leave a review'); return; }
    if (rating === 0) { toast.error('Please select a star rating'); return; }
    if (sellerId === user.id) { toast.error('You cannot review yourself'); return; }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('reviews').insert({
        seller_id: sellerId,
        buyer_id: user.id,
        ad_id: adId || null,
        rating,
        comment: comment.trim() || null,
        status: 'pending',
      });
      if (error) throw error;
      toast.success('Review submitted! It will appear after approval.');
      setHasReviewed(true);
      setRating(0);
      setComment('');
      onSubmitted?.();
    } catch (err: any) {
      if (err?.code === '23505') {
        toast.error('You have already reviewed this seller');
        setHasReviewed(true);
      } else {
        toast.error(err?.message || 'Failed to submit review');
      }
    }
    setSubmitting(false);
  };

  if (hasReviewed) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        <Star className="h-6 w-6 text-yellow-500 mx-auto mb-2 fill-current" />
        You've already reviewed this seller. Thank you!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Rate this seller</Label>
        <div className="flex gap-1 mt-2">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-1 transition-transform hover:scale-110"
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
            >
              <Star
                className={cn(
                  'h-7 w-7 transition-colors',
                  (hoverRating || rating) >= star
                    ? 'text-yellow-500 fill-current'
                    : 'text-muted-foreground'
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Review (optional)</Label>
        <Textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Share your experience with this seller..."
          rows={3}
          maxLength={500}
          className="mt-1"
        />
        <p className="text-xs text-muted-foreground mt-1">{comment.length}/500 characters</p>
      </div>

      <Button onClick={handleSubmit} disabled={submitting || rating === 0} className="w-full sm:w-auto">
        {submitting ? 'Submitting...' : 'Submit Review'}
      </Button>
    </div>
  );
}
