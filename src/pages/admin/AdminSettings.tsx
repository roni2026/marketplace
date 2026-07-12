/**
 * AdminSettings — Redesigned admin settings with tabs for general,
 * commission, security, notifications, and roles.
 */

import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminPortal } from '@/hooks/useAdminPortal';
import { toast } from 'sonner';
import {
  Settings as SettingsIcon, Globe, DollarSign, Shield, Users,
  Mail, Bell, Save, RotateCcw, Loader2,
} from 'lucide-react';

export default function AdminSettings() {
  const { user } = useAuth();
  const { getSystemSettings, updateSystemSetting, logActivity } = useAdminPortal();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const s = await getSystemSettings();
      setSettings(s);
      setLoading(false);
    })();
  }, [getSystemSettings]);

  const handleSave = useCallback(async (tab: string) => {
    setSaving(true);
    if (!user) return;
    const tabSettings: Record<string, any> = {};
    Object.entries(settings).forEach(([key, value]) => {
      if (key.startsWith(`${tab}_`)) tabSettings[key] = value;
    });
    for (const [key, value] of Object.entries(tabSettings)) {
      await updateSystemSetting(key, value, user.id);
    }
    await logActivity('update_settings', 'system', tab, { keys: Object.keys(tabSettings) });
    toast.success(`${tab} settings saved`);
    setSaving(false);
  }, [user, settings, updateSystemSetting, logActivity]);

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const SettingRow = ({ label, children, description }: { label: string; children: React.ReactNode; description?: string }) => (
    <div className="flex items-center justify-between py-2">
      <div className="min-w-0">
        <Label className="text-xs font-medium">{label}</Label>
        {description && <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );

  if (loading) {
    return (
      <AdminLayout>
        <PageHeader title="Settings" description="Configure marketplace settings" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PageHeader title="Settings" description="Configure marketplace-wide settings" />

      <Tabs defaultValue="general">
        <TabsList className="h-8">
          <TabsTrigger value="general" className="text-xs">General</TabsTrigger>
          <TabsTrigger value="commission" className="text-xs">Commission & Payouts</TabsTrigger>
          <TabsTrigger value="security" className="text-xs">Security</TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs">Notifications</TabsTrigger>
          <TabsTrigger value="roles" className="text-xs">Roles & Permissions</TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general" className="mt-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">General Settings</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              <SettingRow label="Marketplace Name" description="Displayed across the platform">
                <Input value={settings.general_marketplace_name || 'BazarBD'} onChange={(e) => updateSetting('general_marketplace_name', e.target.value)} className="h-8 w-48 text-xs" />
              </SettingRow>
              <Separator />
              <SettingRow label="Support Email" description="Customer support contact">
                <Input value={settings.general_support_email || ''} onChange={(e) => updateSetting('general_support_email', e.target.value)} className="h-8 w-48 text-xs" placeholder="support@bazarbd.com" />
              </SettingRow>
              <Separator />
              <SettingRow label="Registration Enabled" description="Allow new user signups">
                <Switch checked={settings.general_registration_enabled ?? true} onCheckedChange={(v) => updateSetting('general_registration_enabled', v)} />
              </SettingRow>
              <Separator />
              <SettingRow label="Maintenance Mode" description="Temporarily disable access">
                <Switch checked={settings.general_maintenance_mode ?? false} onCheckedChange={(v) => updateSetting('general_maintenance_mode', v)} />
              </SettingRow>
              <Separator />
              <SettingRow label="Default Language">
                <Select value={settings.general_language || 'en'} onValueChange={(v) => updateSetting('general_language', v)}>
                  <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="bn">বাংলা</SelectItem>
                    <SelectItem value="hi">हिन्दी</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
              <div className="mt-4 flex justify-end">
                <Button size="sm" className="h-8 gap-1.5 text-xs" disabled={saving} onClick={() => handleSave('general')}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save General
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commission */}
        <TabsContent value="commission" className="mt-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Commission & Payout Settings</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              <SettingRow label="Default Commission (%)" description="Platform commission on each sale">
                <Input type="number" value={settings.commission_default_percent ?? 5} onChange={(e) => updateSetting('commission_default_percent', parseInt(e.target.value) || 0)} className="h-8 w-20 text-xs" />
              </SettingRow>
              <Separator />
              <SettingRow label="Minimum Payout ($)" description="Minimum amount for seller withdrawals">
                <Input type="number" value={settings.commission_min_payout ?? 50} onChange={(e) => updateSetting('commission_min_payout', parseInt(e.target.value) || 0)} className="h-8 w-20 text-xs" />
              </SettingRow>
              <Separator />
              <SettingRow label="Payout Schedule (days)" description="How often payouts are processed">
                <Input type="number" value={settings.commission_payout_days ?? 7} onChange={(e) => updateSetting('commission_payout_days', parseInt(e.target.value) || 7)} className="h-8 w-20 text-xs" />
              </SettingRow>
              <Separator />
              <SettingRow label="Max Listings per Seller" description="Limit listings per seller account">
                <Input type="number" value={settings.commission_max_listings ?? 100} onChange={(e) => updateSetting('commission_max_listings', parseInt(e.target.value) || 100)} className="h-8 w-20 text-xs" />
              </SettingRow>
              <Separator />
              <SettingRow label="Listing Approval Required" description="All listings need admin approval">
                <Switch checked={settings.commission_approval_required ?? true} onCheckedChange={(v) => updateSetting('commission_approval_required', v)} />
              </SettingRow>
              <Separator />
              <SettingRow label="KYC Required for Sellers" description="Sellers must complete KYC">
                <Switch checked={settings.commission_kyc_required ?? false} onCheckedChange={(v) => updateSetting('commission_kyc_required', v)} />
              </SettingRow>
              <div className="mt-4 flex justify-end">
                <Button size="sm" className="h-8 gap-1.5 text-xs" disabled={saving} onClick={() => handleSave('commission')}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save Commission
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="mt-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Security Settings</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              <SettingRow label="Require 2FA for Admins" description="Mandatory two-factor authentication">
                <Switch checked={settings.security_2fa_required ?? false} onCheckedChange={(v) => updateSetting('security_2fa_required', v)} />
              </SettingRow>
              <Separator />
              <SettingRow label="IP Whitelist" description="Comma-separated list of allowed IPs">
                <Textarea value={settings.security_ip_whitelist || ''} onChange={(e) => updateSetting('security_ip_whitelist', e.target.value)} className="text-xs" placeholder="192.168.1.1, 10.0.0.1" />
              </SettingRow>
              <Separator />
              <SettingRow label="Session Timeout (minutes)">
                <Select value={String(settings.security_session_timeout ?? 60)} onValueChange={(v) => updateSetting('security_session_timeout', parseInt(v))}>
                  <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="480">8 hours</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
              <Separator />
              <SettingRow label="Min Password Length">
                <Input type="number" value={settings.security_password_min_length ?? 8} onChange={(e) => updateSetting('security_password_min_length', parseInt(e.target.value) || 8)} className="h-8 w-20 text-xs" />
              </SettingRow>
              <Separator />
              <SettingRow label="Require Uppercase">
                <Switch checked={settings.security_password_uppercase ?? true} onCheckedChange={(v) => updateSetting('security_password_uppercase', v)} />
              </SettingRow>
              <Separator />
              <SettingRow label="Require Numbers">
                <Switch checked={settings.security_password_numbers ?? true} onCheckedChange={(v) => updateSetting('security_password_numbers', v)} />
              </SettingRow>
              <Separator />
              <SettingRow label="Require Special Characters">
                <Switch checked={settings.security_password_special ?? false} onCheckedChange={(v) => updateSetting('security_password_special', v)} />
              </SettingRow>
              <div className="mt-4 flex justify-end">
                <Button size="sm" className="h-8 gap-1.5 text-xs" disabled={saving} onClick={() => handleSave('security')}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save Security
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="mt-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Notification Preferences</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              <SettingRow label="Email Notifications" description="Receive admin alerts via email">
                <Switch checked={settings.notif_email ?? true} onCheckedChange={(v) => updateSetting('notif_email', v)} />
              </SettingRow>
              <Separator />
              <SettingRow label="Push Notifications" description="Browser push notifications">
                <Switch checked={settings.notif_push ?? true} onCheckedChange={(v) => updateSetting('notif_push', v)} />
              </SettingRow>
              <Separator />
              <SettingRow label="Critical Alerts" description="System-critical events">
                <div className="flex items-center gap-2">
                  <Switch checked={settings.notif_critical ?? true} onCheckedChange={(v) => updateSetting('notif_critical', v)} />
                  {settings.notif_critical && <Badge variant="destructive" className="text-[9px]">On</Badge>}
                </div>
              </SettingRow>
              <Separator />
              <SettingRow label="Warning Alerts" description="Non-critical warnings">
                <Switch checked={settings.notif_warning ?? true} onCheckedChange={(v) => updateSetting('notif_warning', v)} />
              </SettingRow>
              <Separator />
              <SettingRow label="Info Alerts" description="Informational updates">
                <Switch checked={settings.notif_info ?? false} onCheckedChange={(v) => updateSetting('notif_info', v)} />
              </SettingRow>
              <div className="mt-4 flex justify-end">
                <Button size="sm" className="h-8 gap-1.5 text-xs" disabled={saving} onClick={() => handleSave('notif')}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save Notifications
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles */}
        <TabsContent value="roles" className="mt-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Roles & Permissions</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-md border border-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-3 py-2 text-left font-semibold">Role</th>
                      <th className="px-3 py-2 text-left font-semibold">Permissions</th>
                      <th className="px-3 py-2 text-center font-semibold">Status</th>
                      <th className="px-3 py-2 text-right font-semibold">Toggle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { role: 'Super Admin', perms: 'Full access', active: true },
                      { role: 'Admin', perms: 'All except system config', active: true },
                      { role: 'Moderator', perms: 'Listings, Reports, Users', active: true },
                      { role: 'Customer Support', perms: 'Tickets, Messages', active: true },
                      { role: 'Seller', perms: 'Products, Orders, Coupons', active: true },
                      { role: 'Buyer', perms: 'Browse, Cart, Orders', active: true },
                      { role: 'Guest', perms: 'Browse only', active: true },
                    ].map((r, i) => (
                      <tr key={r.role} className={i % 2 === 1 ? 'bg-muted/20' : ''}>
                        <td className="px-3 py-2 font-medium">{r.role}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.perms}</td>
                        <td className="px-3 py-2 text-center">
                          <Badge variant={r.active ? 'success' : 'secondary'} className="text-[10px]">
                            {r.active ? 'Active' : 'Disabled'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Switch defaultChecked={r.active} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
