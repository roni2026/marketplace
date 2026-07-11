/**
 * UserActivity — User marketplace activity history page.
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  Eye, Heart, Share2, UserPlus, Store, FolderTree, EyeOff, Ban,
  Flag, Package, QrCode, MessageCircle, ExternalLink, Search,
  Trash2, Activity, ChevronLeft, Compare,
} from 'lucide-react';
import type { ActivityType } from '@/integrations/supabase/types_v6_marketplace';

const ACTIVITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  view: Eye, favorite: Heart, unfavorite: Heart, share: Share2, compare: Compare,
  follow_seller: UserPlus, unfollow_seller: UserPlus, follow_store: Store,
  unfollow_store: Store, follow_category: FolderTree, unfollow_category: FolderTree,
  hide_listing: EyeOff, unhide_listing: EyeOff, block_seller: Ban, unblock_seller: Ban,
  report_listing: Flag, report_seller: Flag, wishlist_add: Package, wishlist_remove: Package,
  qr_scan: QrCode, contact_seller: MessageCircle, visit_store: ExternalLink, save_search: Search,
};

const ACTIVITY_LABELS: Record<string, string> = {
  view: 'Viewed a listing', favorite: 'Favorited', unfavorite: 'Unfavorited',
  share: 'Shared a listing', compare: 'Compared listings',
  follow_seller: 'Followed a seller', unfollow_seller: 'Unfollowed a seller',
  follow_store: 'Followed a store', unfollow_store: 'Unfollowed a store',
  follow_category: 'Followed a category', unfollow_category: 'Unfollowed a category',
  hide_listing: 'Hid a listing', unhide_listing: 'Unhid a listing',
  block_seller: 'Blocked a seller', unblock_seller: 'Unblocked a seller',
  report_listing: 'Reported a listing', report_seller: 'Reported a seller',
  wishlist_add: 'Added to wishlist', wishlist_remove: 'Removed from wishlist',
  qr_scan: 'Scanned a QR code', contact_seller: 'Contacted a seller',
  visit_store: 'Visited a store', save_search: 'Saved a search',
};

export default function UserActivity() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { userActivity, fetchUserActivity, clearUserActivity } = useMarketplaceExperience();
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) { fetchUserActivity(100).then(() => setIsLoading(false)); }
  }, [user, fetchUserActivity]);

  const handleClear = async () => {
    await clearUserActivity();
    setShowClearConfirm(false);
  };

  const filtered = filter === 'all' ? userActivity : userActivity.filter(a => a.activity_type === filter);

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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">My Activity</h1>
              <p className="text-sm text-muted-foreground">Your marketplace interaction history</p>
            </div>
          </div>
          {userActivity.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowClearConfirm(true)} className="gap-2">
              <Trash2 className="h-3.5 w-3.5" /> Clear All
            </Button>
          )}
        </div>

        {userActivity.length > 0 && (
          <div className="mb-4">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Filter by activity type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                <SelectItem value="view">Views</SelectItem>
                <SelectItem value="favorite">Favorites</SelectItem>
                <SelectItem value="share">Shares</SelectItem>
                <SelectItem value="compare">Comparisons</SelectItem>
                <SelectItem value="follow_seller">Followed Sellers</SelectItem>
                <SelectItem value="follow_store">Followed Stores</SelectItem>
                <SelectItem value="follow_category">Followed Categories</SelectItem>
                <SelectItem value="hide_listing">Hidden Listings</SelectItem>
                <SelectItem value="block_seller">Blocked Sellers</SelectItem>
                <SelectItem value="report_listing">Listing Reports</SelectItem>
                <SelectItem value="report_seller">Seller Reports</SelectItem>
                <SelectItem value="qr_scan">QR Scans</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12">
              <Activity className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No activity recorded yet</p>
              <p className="text-sm text-muted-foreground mt-1">Your marketplace interactions will appear here</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1">
            {filtered.map(a => {
              const Icon = ACTIVITY_ICONS[a.activity_type] || Activity;
              return (
                <div key={a.id} className="flex items-center gap-3 p-3 border-b last:border-0 hover:bg-accent/30 transition-colors">
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{ACTIVITY_LABELS[a.activity_type] || a.activity_type.replace(/_/g, ' ')}</p>
                    {a.entity_type && a.entity_id && (
                      <p className="text-xs text-muted-foreground">{a.entity_type}: {a.entity_id.slice(0, 8)}...</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
      <MobileNav />

      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all activity history?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete all your activity records. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClear} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Clear All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
