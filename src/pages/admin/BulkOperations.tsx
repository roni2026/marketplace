/**
 * BulkOperations — Admin page for executing and tracking bulk operations.
 */

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard, StatCardGrid } from '@/components/admin/StatCard';
import { useAdminPortal } from '@/hooks/useAdminPortal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Layers, Play, CheckCircle2, XCircle, AlertCircle, Eye, Zap } from 'lucide-react';
import type { BulkOperationType, AdminBulkOperation } from '@/integrations/supabase/types_v14_admin';

const OPERATION_OPTIONS: Array<{ value: BulkOperationType; label: string; needsReason?: boolean; needsRole?: boolean; needsDays?: boolean }> = [
  { value: 'approve_listings', label: 'Approve Listings' },
  { value: 'reject_listings', label: 'Reject Listings', needsReason: true },
  { value: 'delete_listings', label: 'Delete Listings' },
  { value: 'feature_listings', label: 'Feature Listings' },
  { value: 'boost_listings', label: 'Boost Listings', needsDays: true },
  { value: 'suspend_users', label: 'Suspend Users', needsReason: true },
  { value: 'verify_users', label: 'Verify Users' },
  { value: 'delete_users', label: 'Delete Users' },
  { value: 'assign_role', label: 'Assign Role', needsRole: true },
  { value: 'cleanup_expired', label: 'Cleanup Expired Listings' },
];

export default function BulkOperations() {
  const { bulkOperations, bulkOperation, fetchBulkOperations } = useAdminPortal();
  const [isLoading, setIsLoading] = useState(true);
  const [operationType, setOperationType] = useState<BulkOperationType>('approve_listings');
  const [targetIdsText, setTargetIdsText] = useState('');
  const [reason, setReason] = useState('');
  const [role, setRole] = useState('seller');
  const [days, setDays] = useState('7');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [selectedOp, setSelectedOp] = useState<AdminBulkOperation | null>(null);

  useEffect(() => {
    fetchBulkOperations().then(() => setIsLoading(false));
  }, [fetchBulkOperations]);

  const targetIds = targetIdsText.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
  const selectedOpConfig = OPERATION_OPTIONS.find(o => o.value === operationType);

  const handleExecute = async () => {
    if (targetIds.length === 0) { toast.error('Enter at least one target ID'); return; }
    setIsExecuting(true);
    const params: Record<string, unknown> = {};
    if (selectedOpConfig?.needsReason) params.reason = reason;
    if (selectedOpConfig?.needsRole) params.role = role;
    if (selectedOpConfig?.needsDays) params.days = parseInt(days);
    await bulkOperation(operationType, targetIds, params);
    setIsExecuting(false);
    setShowConfirm(false);
    setTargetIdsText('');
    setReason('');
  };

  const completedCount = bulkOperations.filter(o => o.status === 'completed').length;
  const failedCount = bulkOperations.filter(o => o.status === 'failed').length;
  const partialCount = bulkOperations.filter(o => o.status === 'partial').length;

  const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    completed: 'default', failed: 'destructive', partial: 'secondary', processing: 'outline',
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Bulk Operations"
        description="Execute and track bulk administrative actions"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Bulk Operations' }]}
      />

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : (
        <>
          <StatCardGrid>
            <StatCard title="Total Operations" value={String(bulkOperations.length)} icon={Layers} />
            <StatCard title="Completed" value={String(completedCount)} icon={CheckCircle2} />
            <StatCard title="Failed" value={String(failedCount)} icon={XCircle} />
            <StatCard title="Partial" value={String(partialCount)} icon={AlertCircle} />
          </StatCardGrid>

          {/* New Operation */}
          <Card className="mt-6">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4" /> New Bulk Operation</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Operation Type</Label>
                <Select value={operationType} onValueChange={v => setOperationType(v as BulkOperationType)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OPERATION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Target IDs ({targetIds.length} selected)</Label>
                <Textarea value={targetIdsText} onChange={e => setTargetIdsText(e.target.value)} rows={4} placeholder="Paste IDs here, one per line or comma-separated..." className="mt-1 font-mono text-xs" />
              </div>
              {selectedOpConfig?.needsReason && (
                <div><Label>Reason</Label><Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for this action..." className="mt-1" /></div>
              )}
              {selectedOpConfig?.needsRole && (
                <div>
                  <Label>Role to Assign</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="seller">Seller</SelectItem>
                      <SelectItem value="buyer">Buyer</SelectItem>
                      <SelectItem value="moderator">Moderator</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {selectedOpConfig?.needsDays && (
                <div><Label>Duration (days)</Label><Input type="number" value={days} onChange={e => setDays(e.target.value)} className="mt-1" /></div>
              )}
              <Button onClick={() => setShowConfirm(true)} disabled={targetIds.length === 0} className="gap-2">
                <Play className="h-4 w-4" /> Execute Operation ({targetIds.length} items)
              </Button>
            </CardContent>
          </Card>

          {/* History */}
          <Card className="mt-6">
            <CardHeader><CardTitle className="text-base">Operation History</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Operation</TableHead><TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead><TableHead className="text-right">Success</TableHead>
                      <TableHead className="text-right">Failed</TableHead><TableHead>Started</TableHead><TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulkOperations.map(op => (
                      <TableRow key={op.id}>
                        <TableCell className="text-sm capitalize">{op.operation_type.replace(/_/g, ' ')}</TableCell>
                        <TableCell><Badge variant={STATUS_VARIANTS[op.status] || 'secondary'} className="capitalize">{op.status}</Badge></TableCell>
                        <TableCell className="text-right">{op.total_count}</TableCell>
                        <TableCell className="text-right text-green-600">{op.success_count}</TableCell>
                        <TableCell className="text-right text-red-600">{op.failure_count}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(op.started_at), { addSuffix: true })}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => setSelectedOp(op)} disabled={op.error_details.length === 0}><Eye className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {bulkOperations.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No bulk operations yet</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Confirmation */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Execute Bulk Operation?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to {operationType.replace(/_/g, ' ')} {targetIds.length} items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleExecute} disabled={isExecuting}>
              {isExecuting ? 'Executing...' : 'Execute'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Details Dialog */}
      <Dialog open={!!selectedOp} onOpenChange={open => !open && setSelectedOp(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Operation Details</DialogTitle></DialogHeader>
          {selectedOp && (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANTS[selectedOp.status] || 'secondary'} className="capitalize">{selectedOp.status}</Badge>
                <span className="text-sm font-medium capitalize">{selectedOp.operation_type.replace(/_/g, ' ')}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 border rounded"><p className="text-lg font-bold">{selectedOp.total_count}</p><p className="text-xs text-muted-foreground">Total</p></div>
                <div className="p-2 border rounded"><p className="text-lg font-bold text-green-600">{selectedOp.success_count}</p><p className="text-xs text-muted-foreground">Success</p></div>
                <div className="p-2 border rounded"><p className="text-lg font-bold text-red-600">{selectedOp.failure_count}</p><p className="text-xs text-muted-foreground">Failed</p></div>
              </div>
              {selectedOp.error_details.length > 0 && (
                <div>
                  <Label>Error Details</Label>
                  <div className="mt-1 max-h-48 overflow-y-auto border rounded p-2 space-y-1">
                    {selectedOp.error_details.map((err, i) => (
                      <div key={i} className="text-xs">
                        <span className="font-mono text-muted-foreground">{err.id.slice(0, 12)}</span>: <span className="text-destructive">{err.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
