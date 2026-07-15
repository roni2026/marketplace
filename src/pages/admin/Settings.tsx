import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Settings as SettingsIcon, Save, Shield, Bell, Globe, Database } from 'lucide-react';
import { toast } from 'sonner';
import { logSettingsChange } from '@/lib/audit';

interface AppSettings {
  siteName: string;
  siteDescription: string;
  autoApproveAds: boolean;
  requireEmailVerification: boolean;
  maxImagesPerAd: number;
  adExpirationDays: number;
  enableMessaging: boolean;
  enableOffers: boolean;
  enableSavedSearches: boolean;
  maintenanceMode: boolean;
  bannedKeywords: string;
  profanityFilter: boolean;
  spamDetection: boolean;
  defaultCurrency: string;
  defaultLanguage: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  siteName: 'BazarBD',
  siteDescription: 'Bangladesh\'s premier online marketplace',
  autoApproveAds: false,
  requireEmailVerification: true,
  maxImagesPerAd: 8,
  adExpirationDays: 30,
  enableMessaging: true,
  enableOffers: true,
  enableSavedSearches: true,
  maintenanceMode: false,
  bannedKeywords: '',
  profanityFilter: true,
  spamDetection: true,
  defaultCurrency: 'BDT',
  defaultLanguage: 'en',
};

export default function SettingsPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (isAdmin === false) { /* stay on page — AdminRoute already gates access */ return; }
    if (isAdmin) {
      // In a real app, these would be fetched from a settings table
      // For now we use defaults stored in localStorage
      const stored = localStorage.getItem('bazarbd_settings');
      if (stored) {
        try {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
        } catch {
          // Use defaults
        }
      }
      setIsLoading(false);
    }
  }, [user, isAdmin, navigate]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-64 w-64" />
      </div>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    const oldSettings = localStorage.getItem('bazarbd_settings');
    localStorage.setItem('bazarbd_settings', JSON.stringify(settings));
    await logSettingsChange('app_settings', oldSettings, settings);
    setIsSaving(false);
    toast.success('Settings saved successfully');
  };

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <SettingsIcon className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
        <p className="text-muted-foreground">Manage platform configuration and preferences</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-96" />
        </div>
      ) : (
        <Tabs defaultValue="general">
          <TabsList className="mb-6">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="moderation">Moderation</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="h-5 w-5" />
                  General Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input
                    id="siteName"
                    value={settings.siteName}
                    onChange={(e) => updateSetting('siteName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siteDescription">Site Description</Label>
                  <Textarea
                    id="siteDescription"
                    value={settings.siteDescription}
                    onChange={(e) => updateSetting('siteDescription', e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Default Currency</Label>
                    <Select
                      value={settings.defaultCurrency}
                      onValueChange={(v) => updateSetting('defaultCurrency', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BDT">BDT (৳)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Default Language</Label>
                    <Select
                      value={settings.defaultLanguage}
                      onValueChange={(v) => updateSetting('defaultLanguage', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="bn">বাংলা</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Moderation Settings */}
          <TabsContent value="moderation">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-5 w-5" />
                  Moderation Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-approve Ads</Label>
                    <p className="text-sm text-muted-foreground">Automatically approve new ads without review</p>
                  </div>
                  <Switch
                    checked={settings.autoApproveAds}
                    onCheckedChange={(v) => updateSetting('autoApproveAds', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Profanity Filter</Label>
                    <p className="text-sm text-muted-foreground">Filter profanity in ad titles and descriptions</p>
                  </div>
                  <Switch
                    checked={settings.profanityFilter}
                    onCheckedChange={(v) => updateSetting('profanityFilter', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Spam Detection</Label>
                    <p className="text-sm text-muted-foreground">Automatically flag suspicious content</p>
                  </div>
                  <Switch
                    checked={settings.spamDetection}
                    onCheckedChange={(v) => updateSetting('spamDetection', v)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bannedKeywords">Banned Keywords (comma-separated)</Label>
                  <Textarea
                    id="bannedKeywords"
                    value={settings.bannedKeywords}
                    onChange={(e) => updateSetting('bannedKeywords', e.target.value)}
                    placeholder="keyword1, keyword2, keyword3..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxImages">Max Images Per Ad</Label>
                  <Input
                    id="maxImages"
                    type="number"
                    min={1}
                    max={20}
                    value={settings.maxImagesPerAd}
                    onChange={(e) => updateSetting('maxImagesPerAd', parseInt(e.target.value) || 8)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expirationDays">Ad Expiration (days)</Label>
                  <Input
                    id="expirationDays"
                    type="number"
                    min={1}
                    max={365}
                    value={settings.adExpirationDays}
                    onChange={(e) => updateSetting('adExpirationDays', parseInt(e.target.value) || 30)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features Settings */}
          <TabsContent value="features">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Database className="h-5 w-5" />
                  Feature Toggles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Messaging</Label>
                    <p className="text-sm text-muted-foreground">Allow users to send messages to each other</p>
                  </div>
                  <Switch
                    checked={settings.enableMessaging}
                    onCheckedChange={(v) => updateSetting('enableMessaging', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Offers</Label>
                    <p className="text-sm text-muted-foreground">Allow price offers on ads</p>
                  </div>
                  <Switch
                    checked={settings.enableOffers}
                    onCheckedChange={(v) => updateSetting('enableOffers', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Saved Searches</Label>
                    <p className="text-sm text-muted-foreground">Allow users to save search criteria</p>
                  </div>
                  <Switch
                    checked={settings.enableSavedSearches}
                    onCheckedChange={(v) => updateSetting('enableSavedSearches', v)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-5 w-5" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Email Verification</Label>
                    <p className="text-sm text-muted-foreground">Users must verify email before posting</p>
                  </div>
                  <Switch
                    checked={settings.requireEmailVerification}
                    onCheckedChange={(v) => updateSetting('requireEmailVerification', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">Take the site offline for maintenance</p>
                  </div>
                  <Switch
                    checked={settings.maintenanceMode}
                    onCheckedChange={(v) => updateSetting('maintenanceMode', v)}
                  />
                </div>
                {settings.maintenanceMode && (
                  <Badge variant="destructive">Maintenance mode is active</Badge>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <div className="mt-6">
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? null : <Save className="h-4 w-4" />}
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </Tabs>
      )}
    </AdminLayout>
  );
}
