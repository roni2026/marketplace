/**
 * AdminBulkActions — Floating bulk action bar for selected listings.
 */
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';
import { CheckCircle, XCircle, Star, Zap, Archive, Trash2, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AdminBulkActionsProps {
  selectedCount: number;
  onClear: () => void;
  onBulkAction: (action: string) => Promise<void>;
}

export function AdminBulkActions({ selectedCount, onClear, onBulkAction }: AdminBulkActionsProps) {
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  if (selectedCount === 0) return null;

  const actions = [
    { key: 'approve', label: 'Approve', icon: CheckCircle, variant: 'default' as const, destructive: false },
    { key: 'reject', label: 'Reject', icon: XCircle, variant: 'destructive' as const, destructive: true },
    { key: 'feature', label: 'Feature', icon: Star, variant: 'outline' as const, destructive: false },
    { key: 'boost', label: 'Boost', icon: Zap, variant: 'outline' as const, destructive: false },
    { key: 'archive', label: 'Archive', icon: Archive, variant: 'outline' as const, destructive: false },
    { key: 'delete', label: 'Delete', icon: Trash2, variant: 'outline' as const, destructive: true },
  ];

  const handleConfirm = async () => {
    if (!confirmAction) return;
    setProcessing(true);
    try {
      await onBulkAction(confirmAction);
      setConfirmAction(null);
    } catch (err: any) {
      toast.error(err?.message || 'Bulk action failed');
    }
    setProcessing(false);
  };

  return (
    <>
      <div className="sticky bottom-4 z-50 mx-auto max-w-3xl">
        <div className="bg-card border rounded-lg shadow-lg p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="gap-1">
              {selectedCount} selected
            </Badge>
            <Button variant="ghost" size="sm" onClick={onClear} className="gap-1 text-xs">
              <X className="h-3 w-3" /> Clear
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {actions.map(action => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.key}
                  variant={action.variant}
                  size="sm"
                  className={`gap-1.5 text-xs ${action.destructive ? 'text-destructive hover:text-destructive' : ''}`}
                  onClick={() => setConfirmAction(action.key)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {action.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      <AlertDialog open={!!confirmAction} onOpenChange={(v) => !v && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'delete' ? 'Delete' : confirmAction === 'reject' ? 'Reject' : 'Apply'} {selectedCount} {selectedCount === 1 ? 'listing' : 'listings'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'delete' && 'This will permanently delete the selected listings. This action cannot be undone.'}
              {confirmAction === 'reject' && 'The selected listings will be rejected and the sellers will be notified.'}
              {confirmAction === 'approve' && 'The selected listings will be approved and visible on the marketplace.'}
              {confirmAction === 'feature' && 'The selected listings will be marked as featured.'}
              {confirmAction === 'boost' && 'The selected listings will be boosted for increased visibility.'}
              {confirmAction === 'archive' && 'The selected listings will be archived and removed from the marketplace.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={processing}
              className={confirmAction === 'delete' || confirmAction === 'reject' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : `Confirm ${confirmAction}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
