/**
 * HideListingButton — Lets users hide a listing from search results.
 * Adds to hidden_listings table. Shown on AdCard dropdown and AdDetails.
 */
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { EyeOff } from 'lucide-react';

interface HideListingButtonProps {
  adId: string;
  onHidden?: () => void;
  variant?: 'button' | 'menu-item';
}

export function HideListingButton({ adId, onHidden, variant = 'button' }: HideListingButtonProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleHide = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { toast.error('Please login to hide listings'); return; }

    setLoading(true);
    try {
      const { error } = await supabase.from('hidden_listings').insert({
        user_id: user.id,
        ad_id: adId,
      });
      if (error) {
        if (error.code === '23505') {
          toast.info('This listing is already hidden');
        } else {
          throw error;
        }
      } else {
        toast.success('Listing hidden from results');
        onHidden?.();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to hide listing');
    }
    setLoading(false);
  };

  if (variant === 'menu-item') {
    return (
      <button
        type="button"
        onClick={handleHide}
        disabled={loading}
        className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded w-full text-left"
      >
        <EyeOff className="h-4 w-4" /> Hide this listing
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleHide}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      title="Hide from results"
    >
      <EyeOff className="h-3.5 w-3.5" /> Hide
    </button>
  );
}
