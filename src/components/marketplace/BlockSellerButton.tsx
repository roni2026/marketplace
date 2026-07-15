/**
 * BlockSellerButton — Lets a user block a seller from AdDetails.
 * Adds to blocked_users table.
 */
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Ban, Check } from 'lucide-react';

interface BlockSellerButtonProps {
  sellerId: string;
  sellerName?: string;
  variant?: 'button' | 'menu-item';
  size?: 'default' | 'sm' | 'icon';
}

export function BlockSellerButton({ sellerId, sellerName, variant = 'button', size = 'sm' }: BlockSellerButtonProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const handleBlock = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { toast.error('Please login to block sellers'); return; }
    if (user.id === sellerId) { toast.error('You cannot block yourself'); return; }

    setLoading(true);
    try {
      if (isBlocked) {
        await supabase.from('blocked_users').delete().eq('user_id', user.id).eq('blocked_user_id', sellerId);
        setIsBlocked(false);
        toast.success(`Unblocked ${sellerName || 'seller'}`);
      } else {
        const { error } = await supabase.from('blocked_users').insert({
          user_id: user.id,
          blocked_user_id: sellerId,
        });
        if (error) {
          if (error.code === '23505') {
            setIsBlocked(true);
            toast.info('This seller is already blocked');
          } else {
            throw error;
          }
        } else {
          setIsBlocked(true);
          toast.success(`Blocked ${sellerName || 'seller'}. Their listings will be hidden from your results.`);
        }
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to block seller');
    }
    setLoading(false);
  };

  if (variant === 'menu-item') {
    return (
      <button
        type="button"
        onClick={handleBlock}
        disabled={loading}
        className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded w-full text-left text-destructive"
      >
        {isBlocked ? <Check className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
        {isBlocked ? 'Unblock seller' : 'Block seller'}
      </button>
    );
  }

  return (
    <Button variant="outline" size={size} onClick={handleBlock} disabled={loading} className="gap-2 text-destructive hover:text-destructive">
      {isBlocked ? <Check className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
      {isBlocked ? 'Unblock' : 'Block Seller'}
    </Button>
  );
}
