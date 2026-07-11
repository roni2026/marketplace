import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useAuditLog } from '@/hooks/useAuditLog';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, Search, Download } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function AuditLogPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [resourceFilter, setResourceFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { logs, isLoading, totalPages, page, setPage } = useAuditLog({
    action: actionFilter !== 'all' ? actionFilter : undefined,
    resource_type: resourceFilter !== 'all' ? resourceFilter : undefined,
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (isAdmin === false) {
      navigate('/');
    }
  }, [user, isAdmin, navigate]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-64 w-64" />
      </div>
    );
  }

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const text = `${log.action} ${log.resource_type} ${log.resource_id || ''} ${log.profiles?.full_name || ''}`;
    return text.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleExport = () => {
    const csv = ['Timestamp,User,Action,Resource Type,Resource ID,Details'];
    filteredLogs.forEach(log => {
      csv.push([
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        log.profiles?.full_name || 'System',
        log.action,
        log.resource_type,
        log.resource_id || '',
        JSON.stringify(log.details || {}),
      ].join(','));
    });
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Audit logs exported');
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Audit Logs</h1>
        </div>
        <p className="text-muted-foreground">Track all administrative actions and system events</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="create">Create</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
            <SelectItem value="approve">Approve</SelectItem>
            <SelectItem value="reject">Reject</SelectItem>
            <SelectItem value="login">Login</SelectItem>
            <SelectItem value="logout">Logout</SelectItem>
            <SelectItem value="suspend">Suspend</SelectItem>
            <SelectItem value="verify">Verify</SelectItem>
            <SelectItem value="settings_change">Settings Change</SelectItem>
          </SelectContent>
        </Select>
        <Select value={resourceFilter} onValueChange={setResourceFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Resource" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Resources</SelectItem>
            <SelectItem value="ad">Ads</SelectItem>
            <SelectItem value="user">Users</SelectItem>
            <SelectItem value="report">Reports</SelectItem>
            <SelectItem value="auth">Auth</SelectItem>
            <SelectItem value="settings">Settings</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No audit logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {log.profiles?.full_name || 'System'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize text-xs">
                          {log.action.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="capitalize">{log.resource_type}</span>
                        {log.resource_id && (
                          <span className="text-muted-foreground ml-1 text-xs">
                            #{log.resource_id.slice(0, 8)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {log.details ? JSON.stringify(log.details).slice(0, 80) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </AdminLayout>
  );
}
