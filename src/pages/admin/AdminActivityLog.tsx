/**
 * AdminActivityLog — Admin activity log page with filtering and export.
 */

import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard, StatCardGrid } from '@/components/admin/StatCard';
import { useAdminPortal } from '@/hooks/useAdminPortal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { exportData, downloadExport } from '@/lib/adminPortal';
import { formatDistanceToNow, format, isToday, isThisWeek } from 'date-fns';
import { Activity, Search, Download, Clock, User, ChevronRight } from 'lucide-react';
import type { AdminActivityLogRecord } from '@/integrations/supabase/types_v14_admin';

export default function AdminActivityLog() {
  const { activityLog, activityCount, fetchActivityLog } = useAdminPortal();
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [page, setPage] = useState(1);
  const perPage = 25;

  useEffect(() => {
    fetchActivityLog(perPage * page, 0).then(() => setIsLoading(false));
  }, [fetchActivityLog, page]);

  const filtered = activityLog.filter(log => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!log.action.toLowerCase().includes(q) && !(log.resource_type || '').toLowerCase().includes(q) && !(log.resource_id || '').includes(q)) return false;
    }
    if (actionFilter !== 'all' && !log.action.includes(actionFilter)) return false;
    return true;
  });

  const todayCount = activityLog.filter(l => isToday(new Date(l.created_at))).length;
  const weekCount = activityLog.filter(l => isThisWeek(new Date(l.created_at))).length;
  const uniqueAdmins = new Set(activityLog.map(l => l.admin_id)).size;

  const handleExport = async () => {
    const data = await exportData('admin_activity_log', 'csv');
    if (data) {
      downloadExport(data, `admin_activity_log_${format(new Date(), 'yyyy-MM-dd')}.csv`, 'csv');
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Admin Activity Log"
        description="Track all administrative actions across the marketplace"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Activity Log' }]}
      />

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : (
        <>
          <StatCardGrid>
            <StatCard title="Total Actions" value={String(activityCount)} icon={Activity} />
            <StatCard title="Actions Today" value={String(todayCount)} icon={Clock} />
            <StatCard title="This Week" value={String(weekCount)} icon={Activity} />
            <StatCard title="Unique Admins" value={String(uniqueAdmins)} icon={User} />
          </StatCardGrid>

          <div className="flex flex-col sm:flex-row gap-3 mt-6 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by action or resource..." className="pl-8" />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Filter by action" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="approve">Approve</SelectItem>
                <SelectItem value="reject">Reject</SelectItem>
                <SelectItem value="suspend">Suspend</SelectItem>
                <SelectItem value="verify">Verify</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="bulk">Bulk Operations</SelectItem>
                <SelectItem value="update">Update</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExport} className="gap-2"><Download className="h-4 w-4" /> Export CSV</Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Admin</TableHead><TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead><TableHead>Resource ID</TableHead>
                      <TableHead>Details</TableHead><TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                              {(log.admin?.full_name || 'A')[0]}
                            </div>
                            <span className="truncate">{log.admin?.full_name || 'Admin'}</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-xs capitalize">{log.action.replace(/_/g, ' ')}</Badge></TableCell>
                        <TableCell className="text-sm">{log.resource_type || '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">{log.resource_id ? log.resource_id.slice(0, 12) : '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{log.details ? JSON.stringify(log.details).slice(0, 80) : '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No activity found</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {activityCount > page * perPage && (
            <div className="flex justify-center mt-4">
              <Button variant="outline" onClick={() => setPage(p => p + 1)}>Load More</Button>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}
