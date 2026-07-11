/**
 * ReportDialog — Reporting dialog for listings and sellers.
 */

import { useState, useEffect } from 'react';
import { useMarketplaceExperience } from '@/hooks/useMarketplaceExperience';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Flag, AlertCircle, CheckCircle2 } from 'lucide-react';
import { LISTING_REPORT_REASONS, SELLER_REPORT_REASONS } from '@/integrations/supabase/types_v6_marketplace';

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: 'listing' | 'seller';
  targetId: string;
  targetName?: string;
}

export function ReportDialog({ open, onOpenChange, targetType, targetId, targetName }: ReportDialogProps) {
  const { createListingReport, createSellerReport } = useMarketplaceExperience();
  const [reasonCode, setReasonCode] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setReasonCode(''); setDescription(''); setIsSuccess(false); setError(null); }
  }, [open]);

  const reasons = targetType === 'listing' ? LISTING_REPORT_REASONS : SELLER_REPORT_REASONS;

  const handleSubmit = async () => {
    if (!reasonCode) { setError('Please select a reason'); return; }
    setIsSubmitting(true);
    setError(null);
    try {
      const reasonLabel = reasons.find(r => r.code === reasonCode)?.label || reasonCode;
      if (targetType === 'listing') {
        await createListingReport(targetId, reasonLabel, reasonCode, description || undefined);
      } else {
        await createSellerReport({ seller_id: targetId, reason: reasonLabel, reason_code: reasonCode, description: description || undefined });
      }
      setIsSuccess(true);
      setTimeout(() => onOpenChange(false), 2000);
    } catch (err) {
      setError('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isSubmitting && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Flag className="h-5 w-5 text-destructive" /> Report {targetType === 'listing' ? 'Listing' : 'Seller'}</DialogTitle>
          <DialogDescription>
            {targetName ? `Reporting: ${targetName}` : `Report this ${targetType}`}
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="flex flex-col items-center py-6 gap-3">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="font-medium">Report Submitted</p>
            <p className="text-sm text-muted-foreground text-center">Thank you. Our team will review this report and take appropriate action.</p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {error && (
              <div className="flex items-center gap-2 p-3 border border-destructive/20 bg-destructive/5 rounded-lg">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            <div>
              <Label>Reason *</Label>
              <Select value={reasonCode} onValueChange={setReasonCode}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select a reason" /></SelectTrigger>
                <SelectContent>
                  {reasons.map(r => <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Additional Details (optional)</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Provide more context about the issue..." maxLength={1000} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">{description.length}/1000</p>
            </div>
          </div>
        )}

        {!isSuccess && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button variant="destructive" onClick={handleSubmit} disabled={isSubmitting || !reasonCode} className="gap-2">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ReportDialog;
