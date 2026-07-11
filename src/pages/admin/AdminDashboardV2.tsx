/**
 * AdminDashboardV2 — Redesigned admin dashboard with customizable widgets,
 * real-time stats, charts, system health, and quick actions.
 */

import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAdminPortal } from '@/hooks/useAdminPortal';
import { useAuth } from '@/hooks/useAuth';
import { StatCard, StatCardGrid } from '@/components/admin/StatCard';
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
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import {
  Users, UserCheck, Circle, UserPlus, Package, Clock, DollarSign, Flag,
  TrendingUp, Activity, Bell, Settings, Download, CheckCircle, XCircle,
  Star, Zap, Ban, BadgeCheck, Send, RefreshCw, AlertTriangle, ChevronRight,
} from 'lucide-react';

export default function AdminDashboardV2() {
  const { user } = useAuth();
  const {
    stats, userGrowth, listingGrowth, widgets, activityLog,
    healthMetrics, healthStatus, notifications, unreadNotifications,
    isLoading, fetchDashboardData, fetchActivityLog, fetchHealthMetrics,
    fetchNotifications, toggleWidget, resetDashboard, markNotificationRead,
    markAllNotificationsRead,
  } = useAdminPortal();

  const [showCustomize, setShowCustomize] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchActivityLog(10);
    fetchHealthMetrics();
    if (user) fetchNotifications();
  }, [user, fetchDashboardData, fetchActivityLog, fetchHealthMetrics, fetchNotifications]);

  const healthColor = healthStatus === 'healthy' ? 'text-green-500' : healthStatus === 'warning' ? 'text-yellow-500' : 'text-red-500';
  const healthBg = healthStatus === 'healthy' ? 'bg-green-500/10' : healthStatus === 'warning' ? 'bg-yellow-500/10' : 'bg-red-500/10';

  if (isLoading && !stats) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-64" />)}</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Header with actions */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Marketplace overview and quick actions</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <div className="relative">
            <Button variant="outline" size="icon" onClick={() => setShowNotifications(!showNotifications)} className="relative">
              <Bell className="h-4 w-4" />
              {unreadNotifications > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 px-1 text-[10px]">{unreadNotifications}</Badge>
              )}
            </Button>
            {showNotifications && (
              <div className="absolute top-full right-0 mt-1 w-80 bg-popover border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between p-3 border-b">
                  <span className="font-medium text-sm">Notifications</span>
                  {unreadNotifications > 0 && (
                    <Button variant="ghost" size="sm" onClick={markAllNotificationsRead} className="text-xs">Mark all read</Button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-6">No notifications</p>
                ) : (
                  notifications.slice(0, 20).map(n => (
                    <div key={n.id} onClick={() => markNotificationRead(n.id)} className={`p-3 border-b last:border-0 cursor-pointer hover:bg-accent ${!n.is_read ? 'bg-primary/5' : ''}`}>
                      <div className="flex items-start gap-2">
                        <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${n.severity === 'critical' ? 'bg-red-500' : n.severity === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{n.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowCustomize(true)} className="gap-2">
            <Settings className="h-4 w-4" /> Customize
          </Button>
          <Button variant="outline" size="icon" onClick={fetchDashboardData} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <StatCardGrid>
        <StatCard title="Total Users" value={String(stats?.total_users || 0)} icon={Users} />
        <StatCard title="Active Users" value={String(stats?.active_users || 0)} icon={UserCheck} />
        <StatCard title="Online Now" value={String(stats?.online_users || 0)} icon={Circle} />
        <StatCard title="New Today" value={String(stats?.new_users_today || 0)} icon={UserPlus} />
        <StatCard title="Total Listings" value={String(stats?.total_listings || 0)} icon={Package} />
        <StatCard title="Pending Listings" value={String(stats?.pending_listings || 0)} icon={Clock} />
        <StatCard title="Total Revenue" value={`৳${(stats?.total_revenue || 0).toLocaleString()}`} icon={DollarSign} />
        <StatCard title="Pending Reports" value={String((stats?.pending_reports || 0) + (stats?.pending_seller_reports || 0) + (stats?.pending_message_reports || 0))} icon={Flag} />
      </StatCardGrid>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> User Growth (30 days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={userGrowth}>
                <defs>
                  <linearGradient id="userGrowthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={5} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#userGrowthGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" /> Listing Growth (30 days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={listingGrowth}>
                <defs>
                  <linearGradient id="listingGrowthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={5} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#22c55e" fill="url(#listingGrowthGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* System Health & Pending Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" /> System Health</CardTitle></CardHeader>
          <CardContent>
            <div className={`flex items-center gap-3 p-3 rounded-lg ${healthBg}`}>
              <div className={`h-3 w-3 rounded-full ${healthColor.replace('text', 'bg')}`} />
              <div>
                <p className={`font-medium capitalize ${healthColor}`}>{healthStatus}</p>
                <p className="text-xs text-muted-foreground">{healthMetrics.length} metrics monitored</p>
              </div>
            </div>
            {healthMetrics.slice(0, 5).map(m => (
              <div key={m.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm">{m.metric_name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{m.metric_value}{m.metric_unit}</span>
                  <div className={`h-2 w-2 rounded-full ${m.status === 'healthy' ? 'bg-green-500' : m.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Pending Items</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Link to="/admin/ads" className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors">
              <span className="text-sm">Pending Listings</span>
              <div className="flex items-center gap-1"><Badge variant="secondary">{stats?.pending_listings || 0}</Badge><ChevronRight className="h-4 w-4 text-muted-foreground" /></div>
            </Link>
            <Link to="/admin/reports" className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors">
              <span className="text-sm">Listing Reports</span>
              <div className="flex items-center gap-1"><Badge variant="secondary">{stats?.pending_reports || 0}</Badge><ChevronRight className="h-4 w-4 text-muted-foreground" /></div>
            </Link>
            <Link to="/admin/seller-reports" className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors">
              <span className="text-sm">Seller Reports</span>
              <div className="flex items-center gap-1"><Badge variant="secondary">{stats?.pending_seller_reports || 0}</Badge><ChevronRight className="h-4 w-4 text-muted-foreground" /></div>
            </Link>
            <Link to="/admin/messages" className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors">
              <span className="text-sm">Message Reports</span>
              <div className="flex items-center gap-1"><Badge variant="secondary">{stats?.pending_message_reports || 0}</Badge><ChevronRight className="h-4 w-4 text-muted-foreground" /></div>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4" /> Quick Actions</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" asChild className="gap-1.5"><Link to="/admin/ads"><CheckCircle className="h-3.5 w-3.5" /> Approve</Link></Button>
            <Button variant="outline" size="sm" asChild className="gap-1.5"><Link to="/admin/ads"><XCircle className="h-3.5 w-3.5" /> Reject</Link></Button>
            <Button variant="outline" size="sm" asChild className="gap-1.5"><Link to="/admin/products"><Star className="h-3.5 w-3.5" /> Feature</Link></Button>
            <Button variant="outline" size="sm" asChild className="gap-1.5"><Link to="/admin/products"><Zap className="h-3.5 w-3.5" /> Boost</Link></Button>
            <Button variant="outline" size="sm" asChild className="gap-1.5"><Link to="/admin/users"><Ban className="h-3.5 w-3.5" /> Suspend</Link></Button>
            <Button variant="outline" size="sm" asChild className="gap-1.5"><Link to="/admin/users"><BadgeCheck className="h-3.5 w-3.5" /> Verify</Link></Button>
            <Button variant="outline" size="sm" asChild className="gap-1.5"><Link to="/admin/bulk-operations"><Layers className="h-3.5 w-3.5" /> Bulk Ops</Link></Button>
            <Button variant="outline" size="sm" asChild className="gap-1.5"><Link to="/admin/settings"><Download className="h-3.5 w-3.5" /> Export</Link></Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" /> Recent Admin Activity</CardTitle>
            <Button variant="ghost" size="sm" asChild className="gap-1"><Link to="/admin/activity-log">View All <ChevronRight className="h-4 w-4" /></Link></Button>
          </div>
        </CardHeader>
        <CardContent>
          {activityLog.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">No recent activity</p>
          ) : (
            <div className="space-y-1">
              {activityLog.slice(0, 10).map(log => (
                <div key={log.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{log.action.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.resource_type && <span>{log.resource_type}</span>}
                      {log.resource_id && <span> · {log.resource_id.slice(0, 8)}</span>}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customize Dashboard Dialog */}
      <Dialog open={showCustomize} onOpenChange={setShowCustomize}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Customize Dashboard</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Toggle widgets on or off. Reset to restore defaults.</p>
            <Separator />
            {widgets.map(w => (
              <div key={w.id} className="flex items-center justify-between">
                <Label className="text-sm">{w.title}</Label>
                <Switch checked={w.is_visible} onCheckedChange={v => toggleWidget(w.id, v)} />
              </div>
            ))}
            <Separator />
            <Button variant="outline" onClick={() => { resetDashboard(); setShowCustomize(false); }} className="w-full gap-2">
              <RefreshCw className="h-4 w-4" /> Reset to Default
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

import { Layers } from 'lucide-react';
