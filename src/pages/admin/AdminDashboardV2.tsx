/**
 * AdminDashboardV2 — Redesigned enterprise admin dashboard with customizable widgets,
 * real-time stats, charts, system health, and quick actions.
 */

import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAdminPortal } from '@/hooks/useAdminPortal';
import { useAuth } from '@/hooks/useAuth';
import { StatCard, StatCardGrid } from '@/components/admin/StatCard';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import {
  Users, UserCheck, Package, Clock, DollarSign, Flag, HeadphonesIcon,
  TrendingUp, Activity, Bell, Settings as SettingsIcon, Download,
  CheckCircle2, XCircle, Star, Zap, Ban, BadgeCheck, Send, RefreshCw,
  AlertTriangle, ChevronRight, ShieldCheck, Server, Database,
  LayoutDashboard, FileCheck, BarChart3, Wallet,
} from 'lucide-react';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'];

export default function AdminDashboardV2() {
  const { user } = useAuth();
  const {
    stats, userGrowth, listingGrowth, widgets, activityLog,
    healthMetrics, healthStatus, notifications, unreadNotifications,
    isLoading, fetchDashboardData, fetchActivityLog, fetchHealthMetrics,
    fetchNotifications, toggleWidget, resetDashboard, markNotificationRead,
    markAllNotificationsRead, quickApprove, quickReject, exportData, downloadExport,
  } = useAdminPortal();

  const [showCustomize, setShowCustomize] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingAds, setPendingAds] = useState<any[]>([]);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [loadingExtra, setLoadingExtra] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
    fetchActivityLog(10);
    fetchHealthMetrics();
    fetchNotifications();
  }, [fetchDashboardData, fetchActivityLog, fetchHealthMetrics, fetchNotifications]);

  useEffect(() => {
    if (user) {
      setLoadingExtra(true);
      Promise.all([
        (async () => {
          const { data } = await import('@/integrations/supabase/client').then(m => 
            m.supabase.from('ads').select('id, title, slug, price, created_at, status').eq('status', 'pending').order('created_at', { ascending: false }).limit(5)
          );
          setPendingAds(data || []);
        })(),
        (async () => {
          const { data } = await import('@/integrations/supabase/client').then(m =>
            m.supabase.from('reports').select('id, reason, status, created_at, report_type').eq('status', 'pending').order('created_at', { ascending: false }).limit(5)
          );
          setRecentReports(data || []);
        })(),
      ]).finally(() => setLoadingExtra(false));
    }
  }, [user]);

  const handleQuickApprove = useCallback(async (adId: string) => {
    setActionLoading(adId);
    await quickApprove(adId);
    setPendingAds(prev => prev.filter(a => a.id !== adId));
    setActionLoading(null);
  }, [quickApprove]);

  const handleQuickReject = useCallback(async (adId: string) => {
    setActionLoading(adId);
    await quickReject(adId);
    setPendingAds(prev => prev.filter(a => a.id !== adId));
    setActionLoading(null);
  }, [quickReject]);

  const handleExport = useCallback(async () => {
    const csv = await exportData('profiles', 'csv');
    if (csv) downloadExport(csv, 'admin_users_export.csv', 'csv');
  }, [exportData, downloadExport]);

  const s = stats as any;
  const healthColor = healthStatus === 'healthy' ? 'green' : healthStatus === 'warning' ? 'yellow' : 'red';

  return (
    <AdminLayout>
      <PageHeader
        title="Dashboard"
        description="Marketplace overview and live statistics"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleExport}>
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setShowNotifications(true)}>
              <Bell className="h-3.5 w-3.5" />
              {unreadNotifications > 0 && <Badge variant="destructive" className="h-4 px-1 text-[9px]">{unreadNotifications}</Badge>}
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setShowCustomize(true)}>
              <SettingsIcon className="h-3.5 w-3.5" /> Customize
            </Button>
          </div>
        }
      />

      {/* Stat Cards */}
      <StatCardGrid>
        <StatCard title="Total Users" value={s?.total_users ?? 0} icon={Users} color="blue" loading={isLoading} />
        <StatCard title="Active Listings" value={s?.active_listings ?? 0} icon={Package} color="green" loading={isLoading} />
        <StatCard title="Pending Approvals" value={s?.pending_listings ?? 0} icon={Clock} color="yellow" loading={isLoading} />
        <StatCard title="Total Revenue" value={`$${(s?.total_revenue ?? 0).toLocaleString()}`} icon={DollarSign} color="purple" loading={isLoading} />
        <StatCard title="Pending Reports" value={s?.pending_reports ?? 0} icon={Flag} color="red" loading={isLoading} />
        <StatCard title="Total Shops" value={s?.total_shops ?? 0} icon={BadgeCheck} color="cyan" loading={isLoading} />
        <StatCard title="Sponsored Active" value={s?.sponsored_active ?? 0} icon={Star} color="orange" loading={isLoading} />
        <StatCard title="System Health" value={healthStatus === 'healthy' ? 'Healthy' : healthStatus === 'warning' ? 'Warning' : 'Critical'} icon={Server} color={healthColor as any} loading={isLoading} />
      </StatCardGrid>

      {/* Charts */}
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">User Growth (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={userGrowth}>
                  <defs>
                    <linearGradient id="userGrowth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                  <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#userGrowth)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Listing Growth (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={listingGrowth}>
                  <defs>
                    <linearGradient id="listingGrowth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                  <Area type="monotone" dataKey="count" stroke="#10b981" fill="url(#listingGrowth)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
            {[
              { label: 'Users', path: '/admin/users', icon: Users, color: 'text-blue-500' },
              { label: 'Moderation', path: '/admin/ads', icon: FileCheck, color: 'text-amber-500' },
              { label: 'Reports', path: '/admin/reports', icon: Flag, color: 'text-red-500' },
              { label: 'Analytics', path: '/admin/analytics', icon: BarChart3, color: 'text-purple-500' },
              { label: 'Payouts', path: '/admin/payouts', icon: Wallet, color: 'text-green-500' },
              { label: 'Settings', path: '/admin/settings', icon: SettingsIcon, color: 'text-cyan-500' },
            ].map((action) => (
              <Link
                key={action.label}
                to={action.path}
                className="flex flex-col items-center gap-1.5 rounded-md border border-border p-3 hover:border-primary/50 hover:bg-accent/50 transition-colors"
              >
                <action.icon className={`h-5 w-5 ${action.color}`} />
                <span className="text-[11px] font-medium">{action.label}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bottom Grid: Activity, Pending Listings, Reports, Health */}
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Recent Activity</CardTitle>
              <Link to="/admin/activity-log" className="text-[11px] text-primary hover:underline">View all</Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : activityLog.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">No recent activity</p>
            ) : (
              <ScrollArea className="h-[240px]">
                <div className="space-y-1.5">
                  {activityLog.slice(0, 10).map((log: any) => (
                    <div key={log.id} className="flex items-center gap-2 rounded-md border border-border/50 px-2 py-1.5">
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-primary/10">
                        <Activity className="h-3 w-3 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{log.action}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{log.resource_type} {log.resource_id && `· ${log.resource_id.slice(0, 8)}`}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {log.created_at ? formatDistanceToNow(new Date(log.created_at), { addSuffix: true }) : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Pending Listings */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Pending Listings</CardTitle>
              <Link to="/admin/ads" className="text-[11px] text-primary hover:underline">View all</Link>
            </div>
          </CardHeader>
          <CardContent>
            {loadingExtra ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : pendingAds.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">No pending listings</p>
            ) : (
              <div className="space-y-1.5">
                {pendingAds.map((ad) => (
                  <div key={ad.id} className="flex items-center gap-2 rounded-md border border-border/50 px-2 py-1.5">
                    <Package className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{ad.title}</p>
                      <p className="text-[10px] text-muted-foreground">${ad.price}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                        disabled={actionLoading === ad.id}
                        onClick={() => handleQuickApprove(ad.id)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        disabled={actionLoading === ad.id}
                        onClick={() => handleQuickReject(ad.id)}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Reports */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Latest Reports</CardTitle>
              <Link to="/admin/reports" className="text-[11px] text-primary hover:underline">View all</Link>
            </div>
          </CardHeader>
          <CardContent>
            {loadingExtra ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : recentReports.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">No pending reports</p>
            ) : (
              <div className="space-y-1.5">
                {recentReports.map((report: any) => (
                  <div key={report.id} className="flex items-center gap-2 rounded-md border border-border/50 px-2 py-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{report.reason}</p>
                      <p className="text-[10px] text-muted-foreground">{report.report_type}</p>
                    </div>
                    <Badge variant="warning" className="text-[9px]">Pending</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">System Health</CardTitle>
              <Link to="/admin/monitoring" className="text-[11px] text-primary hover:underline">Details</Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : healthMetrics.length === 0 ? (
              <div className="space-y-2">
                {[
                  { label: 'Database', status: 'healthy', icon: Database },
                  { label: 'API', status: 'healthy', icon: Activity },
                  { label: 'Storage', status: 'healthy', icon: Server },
                  { label: 'Queue', status: 'healthy', icon: Zap },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs">{item.label}</span>
                    </div>
                    <Badge variant="success" className="text-[9px]">{item.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {healthMetrics.slice(0, 6).map((metric: any) => (
                  <div key={metric.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs">{metric.metric_name}</span>
                    </div>
                    <Badge
                      variant={metric.status === 'healthy' ? 'success' : metric.status === 'warning' ? 'warning' : 'destructive'}
                      className="text-[9px]"
                    >
                      {metric.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Customize Widgets Dialog */}
      <Dialog open={showCustomize} onOpenChange={setShowCustomize}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Customize Dashboard</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {widgets.map((widget: any) => (
              <div key={widget.id} className="flex items-center justify-between">
                <Label className="text-xs">{widget.title}</Label>
                <Switch
                  checked={widget.is_visible}
                  onCheckedChange={(v) => toggleWidget(widget.id, v)}
                />
              </div>
            ))}
            <Separator />
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => { resetDashboard(); setShowCustomize(false); }}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Reset to Default
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notifications Dialog */}
      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base">Notifications</DialogTitle>
              {unreadNotifications > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllNotificationsRead}>
                  Mark all read
                </Button>
              )}
            </div>
          </DialogHeader>
          <ScrollArea className="h-[300px]">
            <div className="space-y-1.5">
              {notifications.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">No notifications</p>
              ) : (
                notifications.map((notif: any) => (
                  <button
                    key={notif.id}
                    onClick={() => !notif.is_read && markNotificationRead(notif.id)}
                    className={`flex w-full flex-col gap-0.5 rounded-md border px-3 py-2 text-left hover:bg-accent/50 ${!notif.is_read ? 'border-primary/20 bg-primary/5' : 'border-border'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{notif.title}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {notif.created_at ? formatDistanceToNow(new Date(notif.created_at), { addSuffix: true }) : ''}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{notif.message}</p>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
