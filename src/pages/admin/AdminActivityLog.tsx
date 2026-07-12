/**
 * AdminActivityLog — Admin activity log with filters and export.
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { StatCard, StatCardGrid } from '@/components/admin/StatCard';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useAdminPortal } from '@/hooks/useAdminPortal';
import { exportData, downloadExport } from '@/lib/adminPortal';
import { Button } from '@/components/ui/button';
import { format, formatDistanceToNow } from 'date-fns';
import { Activity, Download, ScrollText, Clock, User } from 'lucide-react';

interface LogEntry {
  id: string; admin_id: string; action: string; resource_type: string | null;
  resource_id: string | null; details: any; ip_address: string | null; created_at: string;
  admin?: { full_name: string | null; avatar_url: string | null } | null;
}

export default function AdminActivityLog() {
  const { activityLog, activityCount, fetchActivityLog, isLoading } = useAdminPortal();
  const [actionFilter, setActionFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, today: 0, week: 0, admins: 0 });

  useEffect(() => { fetchActivityLog(100, 0); }, [fetchActivityLog]);

  useEffect(() => {
    (async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [totalRes, todayRes, weekRes, adminsRes] = await Promise.all([
        supabase.from('admin_activity_log').select('id', { count: 'exact', head: true }),
        supabase.from('admin_activity_log').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
        supabase.from('admin_activity_log').select('id', { count: 'exact', head: true }).gte('created_at', weekStart),
        supabase.from('admin_activity_log').select('admin_id').limit(100),
      ]);
      const uniqueAdmins = new Set((adminsRes.data || []).map((d: any) => d.admin_id));
      setStats({ total: totalRes.count ?? 0, today: todayRes.count ?? 0, week: weekRes.count ?? 0, admins: uniqueAdmins.size });
    })();
  }, []);

  const filteredLogs = useMemo(() => {
    if (!activityLog) return [];
    if (actionFilter === 'all') return activityLog as LogEntry[];
    return (activityLog as LogEntry[]).filter(log => log.action.toLowerCase().includes(actionFilter));
  }, [activityLog, actionFilter]);

  const handleExport = useCallback(async () => {
    const csv = await exportData('admin_activity_log', 'csv');
    if (csv) downloadExport(csv, 'activity_log_export.csv', 'csv');
  }, [exportData, downloadExport]);

  const columns: Column<LogEntry>[] = useMemo(() => [
    { key: 'created_at', label: 'Timestamp', sortable: true, sortValue: (r) => r.created_at, render: (r) => <div><p className="text-[11px]">{format(new Date(r.created_at), 'MMM d, yyyy HH:mm')}</p><p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</p></div> },
    {
      key: 'action', label: 'Action', sortable: true, sortValue: (r) => r.action,
      render: (r) => {
        const variant = r.action.includes('delete') ? 'destructive' : r.action.includes('create') ? 'success' : r.action.includes('update') ? 'warning' : 'info';
        return <Badge variant={variant as any} className="text-[10px]">{r.action.replace(/_/g, ' ')}</Badge>;
      },
    },
    { key: 'resource_type', label: 'Resource', render: (r) => <span className="text-xs text-muted-foreground">{r.resource_type || '—'}</span> },
    { key: 'resource_id', label: 'Resource ID', render: (r) => <span className="font-mono text-[10px] text-muted-foreground">{r.resource_id ? r.resource_id.slice(0, 12) : '—'}</span> },
    { key: 'admin', label: 'Admin', render: (r) => <span className="text-xs">{r.admin?.full_name || r.admin_id.slice(0, 8)}</span> },
    { key: 'ip_address', label: 'IP', render: (r) => <span className="font-mono text-[10px] text-muted-foreground">{r.ip_address || '—'}</span> },
    { key: 'details', label: 'Details', render: (r) => r.details && Object.keys(r.details).length > 0 ? <span className="text-[10px] text-muted-foreground">{JSON.stringify(r.details).slice(0, 50)}...</span> : <span className="text-muted-foreground">—</span> },
  ], []);

  return (
    <AdminLayout>
      <PageHeader title="Activity Log" description={`${stats.total} total log entries`} actions={<Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleExport}><Download className="h-3.5 w-3.5" /> Export</Button>} />
      <StatCardGrid>
        <StatCard title="Total Logs" value={stats.total} icon={ScrollText} color="blue" loading={isLoading} />
        <StatCard title="Today" value={stats.today} icon={Clock} color="green" loading={isLoading} />
        <StatCard title="This Week" value={stats.week} icon={Activity} color="purple" loading={isLoading} />
        <StatCard title="Active Admins" value={stats.admins} icon={User} color="orange" loading={isLoading} />
      </StatCardGrid>
      <div className="mt-4">
        <DataTable
          columns={columns} data={filteredLogs} searchable searchPlaceholder="Search by action..." searchKeys={['action', 'resource_type'] as any}
          pageSize={25} loading={isLoading} getRowId={(r) => r.id} emptyMessage="No activity logs found" dense
          filters={
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /><SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="approve">Approve</SelectItem>
                <SelectItem value="reject">Reject</SelectItem>
                <SelectItem value="suspend">Suspend</SelectItem>
                <SelectItem value="verify">Verify</SelectItem>
                <SelectItem value="login">Login</SelectItem>
              </SelectContent></SelectTrigger>
            </Select>
          }
        />
      </div>
    </AdminLayout>
  );
}
