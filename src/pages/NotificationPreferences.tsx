/**
 * NotificationPreferences — User notification preferences with channel toggles,
 * frequency selection, quiet hours, and compact enterprise UI.
 */

import { useEffect, useState, useCallback } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bell, Mail, MessageSquare, Smartphone, Moon, Clock, Globe,
  Save, Check, Volume2, VolumeX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NotificationCategory, NotificationFrequency } from '@/lib/notifications';

const CATEGORIES: { key: NotificationCategory; label: string; description: string; shopOnly?: boolean }[] = [
  { key: 'account', label: 'Account', description: 'Welcome, verification, security' },
  { key: 'listings', label: 'Listings', description: 'Approvals, rejections, expiry' },
  { key: 'offers', label: 'Offers', description: 'Received, accepted, rejected' },
  { key: 'messages', label: 'Messages', description: 'New messages, mentions' },
  { key: 'saved_searches', label: 'Saved Searches', description: 'New matching listings' },
  { key: 'wishlist', label: 'Wishlist', description: 'Price drops, availability' },
  { key: 'reviews', label: 'Reviews', description: 'New reviews, replies' },
  { key: 'orders', label: 'Orders', description: 'New, accepted, completed', shopOnly: true },
  { key: 'payments', label: 'Payments', description: 'Received, pending, failed', shopOnly: true },
  { key: 'delivery', label: 'Delivery', description: 'Shipped, out for delivery', shopOnly: true },
  { key: 'system', label: 'System', description: 'Maintenance, updates' },
  { key: 'security', label: 'Security', description: 'Login alerts, suspicious activity' },
  { key: 'promotions', label: 'Promotions', description: 'Special offers, deals' },
];

const FREQUENCIES: { value: NotificationFrequency; label: string }[] = [
  { value: 'instant', label: 'Instant' },
  { value: 'daily', label: 'Daily Summary' },
  { value: 'weekly', label: 'Weekly Summary' },
  { value: 'disabled', label: 'Disabled' },
];

export default function NotificationPreferences() {
  const {
    preferences, quietHours, loading,
    fetchPreferences, updatePreference, fetchQuietHours, updateQuietHours,
  } = useNotifications();

  const [saving, setSaving] = useState(false);
  const [quietForm, setQuietForm] = useState({
    is_enabled: false,
    start_time: '22:00',
    end_time: '07:00',
    timezone: 'Asia/Dhaka',
  });

  useEffect(() => {
    fetchPreferences();
    fetchQuietHours();
  }, [fetchPreferences, fetchQuietHours]);

  useEffect(() => {
    if (quietHours) {
      setQuietForm({
        is_enabled: quietHours.is_enabled,
        start_time: quietHours.start_time,
        end_time: quietHours.end_time,
        timezone: quietHours.timezone,
      });
    }
  }, [quietHours]);

  const handleChannelToggle = useCallback(async (
    category: NotificationCategory,
    channel: 'in_app_enabled' | 'push_enabled' | 'email_enabled' | 'sms_enabled',
    value: boolean,
  ) => {
    await updatePreference(category, { [channel]: value });
  }, [updatePreference]);

  const handleFrequencyChange = useCallback(async (
    category: NotificationCategory,
    frequency: NotificationFrequency,
  ) => {
    await updatePreference(category, { frequency });
  }, [updatePreference]);

  const handleSaveQuietHours = useCallback(async () => {
    setSaving(true);
    await updateQuietHours(quietForm);
    setSaving(false);
  }, [quietForm, updateQuietHours]);

  const getPref = (cat: NotificationCategory) => preferences.find(p => p.category === cat);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight">Notification Preferences</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage how you receive notifications across channels
          </p>
        </div>

        <Tabs defaultValue="channels">
          <TabsList className="h-8">
            <TabsTrigger value="channels" className="text-xs">Channels</TabsTrigger>
            <TabsTrigger value="quiet" className="text-xs">Quiet Hours</TabsTrigger>
          </TabsList>

          {/* Channels Tab */}
          <TabsContent value="channels" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_40px_40px_40px_40px_100px] gap-2 border-b border-border bg-muted/50 px-3 py-2">
                  <span className="text-[11px] font-semibold text-muted-foreground">Category</span>
                  <span className="text-[10px] font-semibold text-muted-foreground text-center" title="In-App"><Bell className="h-3 w-3 mx-auto" /></span>
                  <span className="text-[10px] font-semibold text-muted-foreground text-center" title="Push"><Volume2 className="h-3 w-3 mx-auto" /></span>
                  <span className="text-[10px] font-semibold text-muted-foreground text-center" title="Email"><Mail className="h-3 w-3 mx-auto" /></span>
                  <span className="text-[10px] font-semibold text-muted-foreground text-center" title="SMS"><Smartphone className="h-3 w-3 mx-auto" /></span>
                  <span className="text-[10px] font-semibold text-muted-foreground text-center">Frequency</span>
                </div>

                {/* Category rows */}
                {loading && preferences.length === 0 ? (
                  <div className="space-y-1 p-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (
                  CATEGORIES.map((cat, idx) => {
                    const pref = getPref(cat.key);
                    return (
                      <div
                        key={cat.key}
                        className={cn(
                          'grid grid-cols-[1fr_40px_40px_40px_40px_100px] gap-2 items-center px-3 py-2.5',
                          idx % 2 === 1 && 'bg-muted/20',
                        )}
                      >
                        {/* Category info */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium">{cat.label}</span>
                            {cat.shopOnly && <Badge variant="secondary" className="text-[9px] h-3.5 px-1">Shop</Badge>}
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">{cat.description}</p>
                        </div>

                        {/* In-App */}
                        <div className="flex justify-center">
                          <Switch
                            checked={pref?.in_app_enabled ?? true}
                            onCheckedChange={(v) => handleChannelToggle(cat.key, 'in_app_enabled', v)}
                            aria-label="In-App"
                          />
                        </div>

                        {/* Push */}
                        <div className="flex justify-center">
                          <Switch
                            checked={pref?.push_enabled ?? true}
                            onCheckedChange={(v) => handleChannelToggle(cat.key, 'push_enabled', v)}
                            aria-label="Push"
                          />
                        </div>

                        {/* Email */}
                        <div className="flex justify-center">
                          <Switch
                            checked={pref?.email_enabled ?? false}
                            onCheckedChange={(v) => handleChannelToggle(cat.key, 'email_enabled', v)}
                            aria-label="Email"
                          />
                        </div>

                        {/* SMS */}
                        <div className="flex justify-center">
                          <Switch
                            checked={pref?.sms_enabled ?? false}
                            onCheckedChange={(v) => handleChannelToggle(cat.key, 'sms_enabled', v)}
                            aria-label="SMS"
                          />
                        </div>

                        {/* Frequency */}
                        <div className="flex justify-center">
                          <Select
                            value={pref?.frequency ?? 'instant'}
                            onValueChange={(v) => handleFrequencyChange(cat.key, v as NotificationFrequency)}
                          >
                            <SelectTrigger className="h-7 w-[90px] text-[10px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FREQUENCIES.map(f => (
                                <SelectItem key={f.value} value={f.value} className="text-xs">
                                  {f.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Channel legend */}
            <div className="mt-3 flex items-center gap-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><Bell className="h-3 w-3" /> In-App</span>
              <span className="flex items-center gap-1"><Volume2 className="h-3 w-3" /> Push</span>
              <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> Email</span>
              <span className="flex items-center gap-1"><Smartphone className="h-3 w-3" /> SMS</span>
            </div>
          </TabsContent>

          {/* Quiet Hours Tab */}
          <TabsContent value="quiet" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Moon className="h-4 w-4" /> Quiet Hours
                  </CardTitle>
                  <Switch
                    checked={quietForm.is_enabled}
                    onCheckedChange={(v) => setQuietForm(prev => ({ ...prev, is_enabled: v }))}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  During quiet hours, push and SMS notifications are silenced.
                  In-app and email notifications are still delivered but won't trigger alerts.
                </p>

                <div className={cn('space-y-3', !quietForm.is_enabled && 'opacity-50 pointer-events-none')}>
                  {/* Time range */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs flex items-center gap-1 mb-1.5">
                        <Clock className="h-3 w-3" /> Start Time
                      </Label>
                      <Input
                        type="time"
                        value={quietForm.start_time}
                        onChange={(e) => setQuietForm(prev => ({ ...prev, start_time: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs flex items-center gap-1 mb-1.5">
                        <Clock className="h-3 w-3" /> End Time
                      </Label>
                      <Input
                        type="time"
                        value={quietForm.end_time}
                        onChange={(e) => setQuietForm(prev => ({ ...prev, end_time: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  {/* Timezone */}
                  <div>
                    <Label className="text-xs flex items-center gap-1 mb-1.5">
                      <Globe className="h-3 w-3" /> Time Zone
                    </Label>
                    <Select
                      value={quietForm.timezone}
                      onValueChange={(v) => setQuietForm(prev => ({ ...prev, timezone: v }))}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Dhaka">Asia/Dhaka (GMT+6)</SelectItem>
                        <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                        <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                        <SelectItem value="Asia/Karachi">Asia/Karachi (PKT)</SelectItem>
                        <SelectItem value="Asia/Singapore">Asia/Singapore (SGT)</SelectItem>
                        <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                        <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                        <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Preview */}
                  <div className="rounded-md bg-muted/50 p-3">
                    <p className="text-[11px] text-muted-foreground">
                      {quietForm.is_enabled ? (
                        <>Quiet mode is <span className="font-medium text-foreground">active</span> from{' '}
                        <span className="font-medium">{quietForm.start_time}</span> to{' '}
                        <span className="font-medium">{quietForm.end_time}</span> ({quietForm.timezone})</>
                      ) : (
                        <>Quiet mode is <span className="font-medium">disabled</span>. Enable to silence notifications during specific hours.</>
                      )}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Save */}
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    disabled={saving}
                    onClick={handleSaveQuietHours}
                  >
                    {saving ? <Skeleton className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                    Save Quiet Hours
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
