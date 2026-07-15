/**
 * NotificationPreferencesPage — Full notification settings with per-category toggles,
 * quiet hours, and push notification opt-in.
 */
import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Bell, Moon, Smartphone, Mail, MessageSquare, Tag, Heart, ShoppingCart, Shield, Megaphone, Save } from 'lucide-react';

interface NotificationPrefs {
  browser_enabled: boolean;
  mobile_push_enabled: boolean;
  digest_email_enabled: boolean;
  marketing_enabled: boolean;
  category_alerts: boolean;
  saved_search_alerts: boolean;
  wishlist_alerts: boolean;
  seller_alerts: boolean;
  admin_announcements: boolean;
}

interface QuietHours {
  enabled: boolean;
  start_time: string;
  end_time: string;
  timezone: string;
}

const DEFAULT_PREFS: NotificationPrefs = {
  browser_enabled: true,
  mobile_push_enabled: false,
  digest_email_enabled: true,
  marketing_enabled: false,
  category_alerts: true,
  saved_search_alerts: true,
  wishlist_alerts: true,
  seller_alerts: true,
  admin_announcements: true,
};

const DEFAULT_QUIET: QuietHours = {
  enabled: false,
  start_time: '22:00',
  end_time: '07:00',
  timezone: 'Asia/Dhaka',
};

export default function NotificationPreferencesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [quiet, setQuiet] = useState<QuietHours>(DEFAULT_QUIET);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Load notification preferences
    const { data: prefsData } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();
    if (prefsData) setPrefs({ ...DEFAULT_PREFS, ...prefsData });

    // Load quiet hours
    const { data: quietData } = await supabase
      .from('quiet_hours')
      .select('*')
      .eq('user_id', user.id)
      .single();
    if (quietData) setQuiet({ ...DEFAULT_QUIET, ...quietData });

    // Check push subscription
    const { data: pushData } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);
    setPushSubscribed((pushData || []).length > 0);

    // Check push support
    setPushSupported('Notification' in window && 'serviceWorker' in navigator);

    setLoading(false);
  }, [user]);

  useEffect(() => { if (user) loadData(); }, [user, loadData]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Save preferences
      await supabase.from('notification_preferences').upsert({
        user_id: user.id,
        ...prefs,
      }, { onConflict: 'user_id' });

      // Save quiet hours
      await supabase.from('quiet_hours').upsert({
        user_id: user.id,
        ...quiet,
      }, { onConflict: 'user_id' });

      toast.success('Notification preferences saved');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save preferences');
    }
    setSaving(false);
  };

  const handlePushOptIn = async () => {
    if (!user || !pushSupported) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Push notification permission denied');
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
      });

      await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        subscription: JSON.stringify(subscription),
        endpoint: subscription.endpoint,
        is_active: true,
      }, { onConflict: 'user_id' });

      setPushSubscribed(true);
      setPrefs(prev => ({ ...prev, mobile_push_enabled: true }));
      toast.success('Push notifications enabled!');
    } catch (err: any) {
      toast.error('Failed to enable push notifications');
    }
  };

  const ToggleRow = ({ icon: Icon, label, description, checked, onChange }: any) => (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <Label className="text-sm font-medium cursor-pointer">{label}</Label>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );

  if (!authLoading && !user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container max-w-3xl mx-auto px-4 py-8 pb-20 lg:pb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Notification Preferences</h1>
            <p className="text-muted-foreground">Control how and when you receive notifications</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Push Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Smartphone className="h-5 w-5" /> Push Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!pushSupported && (
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                    Push notifications are not supported in this browser.
                  </p>
                )}
                {pushSupported && !pushSubscribed && (
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <Label className="text-sm font-medium">Enable Push Notifications</Label>
                      <p className="text-xs text-muted-foreground">Get instant alerts on your device</p>
                    </div>
                    <Button size="sm" onClick={handlePushOptIn}>Enable</Button>
                  </div>
                )}
                {pushSubscribed && (
                  <ToggleRow
                    icon={Smartphone}
                    label="Mobile Push"
                    description="Receive push notifications on your device"
                    checked={prefs.mobile_push_enabled}
                    onChange={(v: boolean) => setPrefs(prev => ({ ...prev, mobile_push_enabled: v }))}
                  />
                )}
                <ToggleRow
                  icon={Bell}
                  label="Browser Notifications"
                  description="Show notifications in your browser"
                  checked={prefs.browser_enabled}
                  onChange={(v: boolean) => setPrefs(prev => ({ ...prev, browser_enabled: v }))}
                />
                <ToggleRow
                  icon={Mail}
                  label="Email Digest"
                  description="Receive a daily email summary"
                  checked={prefs.digest_email_enabled}
                  onChange={(v: boolean) => setPrefs(prev => ({ ...prev, digest_email_enabled: v }))}
                />
              </CardContent>
            </Card>

            {/* Category Toggles */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">What to Notify</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <ToggleRow icon={Tag} label="Category Alerts" description="New listings in your categories" checked={prefs.category_alerts} onChange={(v: boolean) => setPrefs(prev => ({ ...prev, category_alerts: v }))} />
                <ToggleRow icon={Bell} label="Saved Search Alerts" description="New matches for your saved searches" checked={prefs.saved_search_alerts} onChange={(v: boolean) => setPrefs(prev => ({ ...prev, saved_search_alerts: v }))} />
                <ToggleRow icon={Heart} label="Wishlist Alerts" description="Price drops on favorited items" checked={prefs.wishlist_alerts} onChange={(v: boolean) => setPrefs(prev => ({ ...prev, wishlist_alerts: v }))} />
                <ToggleRow icon={ShoppingCart} label="Seller Alerts" description="Offers and messages on your listings" checked={prefs.seller_alerts} onChange={(v: boolean) => setPrefs(prev => ({ ...prev, seller_alerts: v }))} />
                <ToggleRow icon={Megaphone} label="Admin Announcements" description="Platform updates and news" checked={prefs.admin_announcements} onChange={(v: boolean) => setPrefs(prev => ({ ...prev, admin_announcements: v }))} />
                <Separator className="my-2" />
                <ToggleRow icon={Mail} label="Marketing Emails" description="Promotions and special offers" checked={prefs.marketing_enabled} onChange={(v: boolean) => setPrefs(prev => ({ ...prev, marketing_enabled: v }))} />
              </CardContent>
            </Card>

            {/* Quiet Hours */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Moon className="h-5 w-5" /> Quiet Hours
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ToggleRow
                  icon={Moon}
                  label="Enable Quiet Hours"
                  description="Suppress notifications during specified hours"
                  checked={quiet.enabled}
                  onChange={(v: boolean) => setQuiet(prev => ({ ...prev, enabled: v }))}
                />
                {quiet.enabled && (
                  <div className="grid grid-cols-2 gap-4 pl-11">
                    <div>
                      <Label className="text-xs">Start Time</Label>
                      <Input type="time" value={quiet.start_time} onChange={e => setQuiet(prev => ({ ...prev, start_time: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">End Time</Label>
                      <Input type="time" value={quiet.end_time} onChange={e => setQuiet(prev => ({ ...prev, end_time: e.target.value }))} className="mt-1" />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Timezone</Label>
                      <Select value={quiet.timezone} onValueChange={v => setQuiet(prev => ({ ...prev, timezone: v }))}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Asia/Dhaka">Bangladesh (GMT+6)</SelectItem>
                          <SelectItem value="UTC">UTC</SelectItem>
                          <SelectItem value="America/New_York">US Eastern</SelectItem>
                          <SelectItem value="Europe/London">UK</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Badge variant="secondary" className="gap-1">
                        <Moon className="h-3 w-3" /> Notifications muted from {quiet.start_time} to {quiet.end_time}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
              <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        )}
      </main>
      <MobileNav />
      <Footer />
    </div>
  );
}
