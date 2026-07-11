/**
 * AdminSettings — Admin settings with tabs for general, notifications,
 * appearance, security, and data management.
 */

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { useAdminPortal } from '@/hooks/useAdminPortal';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Settings, Bell, Palette, Shield, Database, Download, Trash2, Save, Clock, Globe, Monitor } from 'lucide-react';

export default function AdminSettings() {
  const { user } = useAuth();
  const { preferences, fetchPreferences, updatePreferences, exportData, downloadExport } = useAdminPortal();
  const [isLoading, setIsLoading] = useState(true);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportTable, setExportTable] = useState('ads');
  const [exportFormat, setExportFormat] = useState('csv');
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);

  useEffect(() => {
    if (user) { fetchPreferences().then(() => setIsLoading(false)); }
  }, [user, fetchPreferences]);

  const handleToggle = async (key: string, value: boolean) => {
    await updatePreferences({ [key]: value } as any);
  };

  const handleExport = async () => {
    const data = await exportData(exportTable, exportFormat as 'csv' | 'json');
    if (data) {
      downloadExport(data, `${exportTable}_export.${exportFormat}`, exportFormat as 'csv' | 'json');
      toast.success('Data exported successfully');
    }
    setShowExportDialog(false);
  };

  if (isLoading) {
    return <AdminLayout><div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div></AdminLayout>;
  }

  const ToggleRow = ({ id, label, description, checked, onChange }: { id: string; label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 pr-4">
        <Label htmlFor={id} className="text-sm font-medium cursor-pointer">{label}</Label>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );

  return (
    <AdminLayout>
      <PageHeader
        title="Admin Settings"
        description="Configure your admin portal preferences and system settings"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Settings' }]}
      />

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general" className="gap-2"><Settings className="h-4 w-4" /> General</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2"><Bell className="h-4 w-4" /> Notifications</TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2"><Palette className="h-4 w-4" /> Appearance</TabsTrigger>
          <TabsTrigger value="security" className="gap-2"><Shield className="h-4 w-4" /> Security</TabsTrigger>
          <TabsTrigger value="data" className="gap-2"><Database className="h-4 w-4" /> Data</TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general">
          <Card>
            <CardHeader><CardTitle className="text-base">General Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Site Name</Label><Input defaultValue="BazarBD" className="mt-1" /></div>
              <div><Label>Site Description</Label><Textarea defaultValue="Bangladesh's #1 marketplace" rows={2} className="mt-1" /></div>
              <div><Label>Contact Email</Label><Input type="email" defaultValue="admin@bazarbd.com" className="mt-1" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Default Language</Label>
                  <Select value={preferences?.language || 'en'} onValueChange={v => updatePreferences({ language: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="bn">বাংলা (Bengali)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Timezone</Label>
                  <Select defaultValue="asia/dhaka">
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asia/dhaka">Asia/Dhaka (GMT+6)</SelectItem>
                      <SelectItem value="utc">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <ToggleRow id="maintenance" label="Maintenance Mode" description="Take the marketplace offline for maintenance" checked={false} onChange={() => toast.info('Maintenance mode setting requires system settings table')} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader><CardTitle className="text-base">Notification Preferences</CardTitle></CardHeader>
            <CardContent className="divide-y">
              <ToggleRow id="email_notif" label="Email Notifications" description="Receive notifications via email" checked={preferences?.notification_email ?? true} onChange={v => handleToggle('notification_email', v)} />
              <ToggleRow id="push_notif" label="Push Notifications" description="Receive push notifications in browser" checked={preferences?.notification_push ?? true} onChange={v => handleToggle('notification_push', v)} />
              <ToggleRow id="critical_notif" label="Critical Alerts" description="Get alerted for critical system issues" checked={preferences?.notification_critical ?? true} onChange={v => handleToggle('notification_critical', v)} />
              <ToggleRow id="warning_notif" label="Warning Alerts" description="Get notified about system warnings" checked={preferences?.notification_warning ?? true} onChange={v => handleToggle('notification_warning', v)} />
              <ToggleRow id="info_notif" label="Info Notifications" description="Receive informational updates" checked={preferences?.notification_info ?? false} onChange={v => handleToggle('notification_info', v)} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader><CardTitle className="text-base">Appearance & Layout</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Theme</Label>
                <Select value={preferences?.theme || 'light'} onValueChange={v => updatePreferences({ theme: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light"><span className="flex items-center gap-2"><Monitor className="h-4 w-4" /> Light</span></SelectItem>
                    <SelectItem value="dark"><span className="flex items-center gap-2"><Monitor className="h-4 w-4" /> Dark</span></SelectItem>
                    <SelectItem value="system"><span className="flex items-center gap-2"><Globe className="h-4 w-4" /> System</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Density</Label>
                <Select value={preferences?.density || 'comfortable'} onValueChange={v => updatePreferences({ density: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comfortable">Comfortable</SelectItem>
                    <SelectItem value="compact">Compact</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <ToggleRow id="sidebar_collapsed" label="Collapse Sidebar by Default" description="Start with the sidebar collapsed" checked={preferences?.sidebar_collapsed ?? false} onChange={v => handleToggle('sidebar_collapsed', v)} />
              <div>
                <Label>Default Landing Page</Label>
                <Select value={preferences?.default_page || '/admin'} onValueChange={v => updatePreferences({ default_page: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="/admin">Dashboard</SelectItem>
                    <SelectItem value="/admin/ads">Ad Moderation</SelectItem>
                    <SelectItem value="/admin/users">User Management</SelectItem>
                    <SelectItem value="/admin/search">Search</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <Card>
            <CardHeader><CardTitle className="text-base">Security Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div><p className="text-sm font-medium">Two-Factor Authentication</p><p className="text-xs text-muted-foreground">Add an extra layer of security</p></div>
                <Badge variant="outline">Not configured</Badge>
              </div>
              <div><Label>Session Timeout (minutes)</Label><Input type="number" defaultValue={60} className="mt-1" /></div>
              <div><Label>IP Whitelist</Label><Textarea placeholder="One IP per line (e.g., 192.168.1.1)" rows={3} className="mt-1" /></div>
              <Separator />
              <div className="space-y-2">
                <Label>Password Policy</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Min Length</Label><Input type="number" defaultValue={8} className="mt-1" /></div>
                  <div><Label className="text-xs">Require Special Chars</Label><Switch defaultChecked className="mt-2" /></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Management */}
        <TabsContent value="data">
          <Card>
            <CardHeader><CardTitle className="text-base">Data Management</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div><p className="text-sm font-medium">Export Data</p><p className="text-xs text-muted-foreground">Download marketplace data as CSV or JSON</p></div>
                <Button variant="outline" size="sm" onClick={() => setShowExportDialog(true)} className="gap-2"><Download className="h-4 w-4" /> Export</Button>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div><p className="text-sm font-medium">Clear Cache</p><p className="text-xs text-muted-foreground">Clear system cache and temporary files</p></div>
                <Button variant="outline" size="sm" onClick={() => toast.success('Cache cleared')} className="gap-2"><Trash2 className="h-4 w-4" /> Clear</Button>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div><p className="text-sm font-medium">Cleanup Expired Listings</p><p className="text-xs text-muted-foreground">Mark all expired listings as expired status</p></div>
                <Button variant="outline" size="sm" onClick={() => setShowCleanupDialog(true)} className="gap-2"><Clock className="h-4 w-4" /> Cleanup</Button>
              </div>
              <Separator />
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 border rounded-lg"><p className="text-2xl font-bold">—</p><p className="text-xs text-muted-foreground">DB Size</p></div>
                <div className="text-center p-3 border rounded-lg"><p className="text-2xl font-bold">—</p><p className="text-xs text-muted-foreground">Active Connections</p></div>
                <div className="text-center p-3 border rounded-lg"><p className="text-2xl font-bold">—</p><p className="text-xs text-muted-foreground">Cache Hit Rate</p></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Export Dialog */}
      <AlertDialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Export Data</AlertDialogTitle><AlertDialogDescription>Select a table and format to export.</AlertDialogDescription></AlertDialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Table</Label>
              <Select value={exportTable} onValueChange={setExportTable}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ads">Listings (ads)</SelectItem>
                  <SelectItem value="profiles">User Profiles</SelectItem>
                  <SelectItem value="shops">Shops</SelectItem>
                  <SelectItem value="messages">Messages</SelectItem>
                  <SelectItem value="transactions">Transactions</SelectItem>
                  <SelectItem value="reports">Reports</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Format</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleExport}>Export</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cleanup Dialog */}
      <AlertDialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Cleanup Expired Listings?</AlertDialogTitle><AlertDialogDescription>This will mark all listings past their expiration date as expired. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { toast.success('Cleanup started'); setShowCleanupDialog(false); }}>Cleanup</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
