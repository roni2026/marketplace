/**
 * BlockedSellers — Manage blocked sellers page.
 */

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { useMarketplaceExperience } from '@/hooks/useMarketplaceExperience';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Ban, UserX, ChevronLeft } from 'lucide-react';
import type { BlockedUser } from '@/integrations/supabase/types_v6_marketplace';

export default function BlockedSellers() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { blockedUsers, fetchBlockedUsers, unblockSeller } = useMarketplaceExperience();
  const [isLoading, setIsLoading] = useState(true);
  const [unblockTarget, setUnblockTarget] = useState<BlockedUser | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) { fetchBlockedUsers().then(() => setIsLoading(false)); }
  }, [user, fetchBlockedUsers]);

  const handleUnblock = async () => {
    if (!unblockTarget) return;
    await unblockSeller(unblockTarget.blocked_user_id);
    setUnblockTarget(null);
  };

  if (authLoading || (!user && !authLoading)) {
    return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-64 w-64" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <Button variant="ghost" size="sm" onClick={() => navigate('/preferences')} className="gap-1 mb-4">
          <ChevronLeft className="h-4 w-4" /> Back to Preferences
        </Button>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
            <Ban className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Blocked Sellers</h1>
            <p className="text-sm text-muted-foreground">Manage sellers you've blocked. Their listings won't appear in your search results.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : blockedUsers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12">
              <UserX className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">You haven't blocked any sellers</p>
              <Button variant="outline" onClick={() => navigate('/search')} className="mt-4">Browse Marketplace</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {blockedUsers.map(b => (
              <Card key={b.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-lg font-medium shrink-0">
                      {(b.blocked_user_profile?.full_name || '?')[0]}
                    </div>
                    <div>
                      <p className="font-medium">{b.blocked_user_profile?.full_name || 'Unknown Seller'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-xs">Blocked</Badge>
                        <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(b.created_at), { addSuffix: true })}</span>
                      </div>
                      {b.reason && <p className="text-xs text-muted-foreground mt-1">Reason: {b.reason}</p>}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setUnblockTarget(b)}>Unblock</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Footer />
      <MobileNav />

      <AlertDialog open={!!unblockTarget} onOpenChange={open => !open && setUnblockTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unblock this seller?</AlertDialogTitle>
            <AlertDialogDescription>
              {unblockTarget?.blocked_user_profile?.full_name || 'This seller'} will be able to appear in your search results and contact you again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnblock}>Unblock</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
