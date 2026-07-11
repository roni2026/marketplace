/**
 * UserPreferences — User preferences and privacy controls page.
 */

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { useMarketplaceExperience } from '@/hooks/useMarketplaceExperience';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { Bell, Shield, Eye, Clock, Activity, Ban, EyeOff, Settings, Trash2, Globe, Lock, ChevronRight } from 'lucide-react';
import type { UserPreferencesUpdate } from '@/integrations/supabase/types_v6_marketplace';

export default function UserPreferences() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const {
    preferences, fetchPreferences, updatePreferences,
    blockedUsers, fetchBlockedUsers,
    hiddenListings, fetchHiddenListings,
    userActivity, fetchUserActivity,
    recentlyViewed, fetchRecentlyViewed,
    clearRecentlyViewed, clearUserActivity,
    unblockSeller,
  } = useMarketplaceExperience();

  const [isLoading, setIsLoading] = useState(true);
  const [clearingViewed, setClearingViewed] = useState(false);
  const [clearingActivity, setClearingActivity] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      Promise.all([
        fetchPreferences(),
        fetchBlockedUsers(),
        fetchHiddenListings(),
        fetchUserActivity(1),
        fetchRecentlyViewed(1),
      ]).then(() => setIsLoading(false));
    }
  }, [user, fetchPreferences, fetchBlockedUsers, fetchHiddenListings, fetchUserActivity, fetchRecentlyViewed]);

  const handleToggle = async (key: keyof UserPreferencesUpdate, value: boolean) => {
    await updatePreferences({ [key]: value });
  };

  const handleClearViewed = async () => {
    setClearingViewed(true);
    await clearRecentlyViewed();
    setClearingViewed(false);
  };

  const handleClearActivity = async () => {
    setClearingActivity(true);
    await clearUserActivity();
    setClearingActivity(false);
  };

  if (authLoading || (!user && !authLoading)) {
    return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-64 w-64" /></div>;
  }

  const ToggleRow = ({ id, label, description, checked, onChange }: {
    id: string; label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
  }) => (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 pr-4">
        <Label htmlFor={id} className="text-sm font-medium cursor-pointer">{label}</Label>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="h-6 w-6" /> Preferences & Privacy</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your marketplace notification, privacy, and activity settings</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}</div>
        ) : (
          <div className="space-y-6">
            {/* Notification Preferences */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" /> Notification Preferences</CardTitle></CardHeader>
              <CardContent className="divide-y">
                <ToggleRow id="notify_new_listings" label="New Listings" description="Get notified about new listings matching your interests" checked={preferences?.notify_new_listings ?? true} onChange={v => handleToggle('notify_new_listings', v)} />
                <ToggleRow id="notify_price_drops" label="Price Drops" description="Notifications when favorited items drop in price" checked={preferences?.notify_price_drops ?? true} onChange={v => handleToggle('notify_price_drops', v)} />
                <ToggleRow id="notify_seller_new" label="Followed Sellers" description="New listings from sellers you follow" checked={preferences?.notify_seller_new_listings ?? true} onChange={v => handleToggle('notify_seller_new_listings', v)} />
                <ToggleRow id="notify_store_new" label="Followed Stores" description="New products from stores you follow" checked={preferences?.notify_store_new_products ?? true} onChange={v => handleToggle('notify_store_new_products', v)} />
                <ToggleRow id="notify_cat_new" label="Followed Categories" description="New listings in categories you follow" checked={preferences?.notify_category_new_listings ?? true} onChange={v => handleToggle('notify_category_new_listings', v)} />
                <ToggleRow id="notify_expiring" label="Expiring Listings" description="Alerts when your saved listings are about to expire" checked={preferences?.notify_expiring_listings ?? true} onChange={v => handleToggle('notify_expiring_listings', v)} />
                <ToggleRow id="notify_messages" label="Messages" description="Notifications for new messages" checked={preferences?.notify_messages ?? true} onChange={v => handleToggle('notify_messages', v)} />
                <ToggleRow id="notify_offers" label="Offers" description="Notifications for new offers on your listings" checked={preferences?.notify_offers ?? true} onChange={v => handleToggle('notify_offers', v)} />
              </CardContent>
            </Card>

            {/* Privacy Controls */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" /> Privacy Controls</CardTitle></CardHeader>
              <CardContent className="divide-y">
                <ToggleRow id="show_recent" label="Show Recently Viewed" description="Display recently viewed items on the homepage" checked={preferences?.show_recently_viewed ?? true} onChange={v => handleToggle('show_recently_viewed', v)} />
                <ToggleRow id="public_collections" label="Allow Public Collections" description="Allow your collections to be visible to other users" checked={preferences?.allow_public_collections ?? true} onChange={v => handleToggle('allow_public_collections', v)} />
                <ToggleRow id="activity_tracking" label="Activity Tracking" description="Allow tracking your marketplace activity for recommendations" checked={preferences?.allow_activity_tracking ?? true} onChange={v => handleToggle('allow_activity_tracking', v)} />
                <div className="flex items-center justify-between py-3">
                  <div className="flex-1 pr-4">
                    <Label className="text-sm font-medium">Default Wishlist Visibility</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Default privacy setting for new collections</p>
                  </div>
                  <Select value={preferences?.default_wishlist_visibility || 'private'} onValueChange={v => handleToggle('default_wishlist_visibility', v)}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private"><span className="flex items-center gap-2"><Lock className="h-4 w-4" /> Private</span></SelectItem>
                      <SelectItem value="public"><span className="flex items-center gap-2"><Globe className="h-4 w-4" /> Public</span></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Data Management */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Eye className="h-4 w-4" /> Data Management</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Recently Viewed History</p>
                      <p className="text-xs text-muted-foreground">{recentlyViewed.length} items</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleClearViewed} disabled={clearingViewed || recentlyViewed.length === 0} className="gap-2">
                    <Trash2 className="h-3.5 w-3.5" /> {clearingViewed ? 'Clearing...' : 'Clear'}
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Activity History</p>
                      <p className="text-xs text-muted-foreground">{userActivity.length} records</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleClearActivity} disabled={clearingActivity || userActivity.length === 0} className="gap-2">
                    <Trash2 className="h-3.5 w-3.5" /> {clearingActivity ? 'Clearing...' : 'Clear'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Blocked Sellers */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><Ban className="h-4 w-4" /> Blocked Sellers</CardTitle>
                  <Badge variant="secondary">{blockedUsers.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {blockedUsers.length > 0 ? (
                  <div className="space-y-2">
                    {blockedUsers.slice(0, 3).map(b => (
                      <div key={b.id} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                            {(b.blocked_user_profile?.full_name || '?')[0]}
                          </div>
                          <span className="text-sm font-medium">{b.blocked_user_profile?.full_name || 'Unknown'}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => unblockSeller(b.blocked_user_id)}>Unblock</Button>
                      </div>
                    ))}
                    {blockedUsers.length > 3 && (
                      <Button variant="ghost" size="sm" onClick={() => navigate('/blocked-sellers')} className="w-full gap-1">
                        View all {blockedUsers.length} <ChevronRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No blocked sellers</p>
                )}
              </CardContent>
            </Card>

            {/* Hidden Listings */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><EyeOff className="h-4 w-4" /> Hidden Listings</CardTitle>
                  <Badge variant="secondary">{hiddenListings.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" onClick={() => navigate('/hidden-listings')} className="w-full gap-2">
                  Manage Hidden Listings <ChevronRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      <Footer />
      <MobileNav />
    </div>
  );
}
