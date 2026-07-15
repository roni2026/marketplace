/**
 * AdminRejectDialog — Structured rejection dialog with reason codes and notes.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { XCircle, AlertTriangle } from 'lucide-react';

interface AdminRejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reasonCode: string, notes: string, notifySeller: boolean) => void;
  adTitle?: string;
  bulkCount?: number;
}

const REJECTION_REASONS = [
  { code: 'prohibited_item', label: 'Prohibited Item', description: 'Item is banned or illegal to sell' },
  { code: 'spam_duplicate', label: 'Spam / Duplicate', description: 'Duplicate or spam listing' },
  { code: 'inappropriate_content', label: 'Inappropriate Content', description: 'Adult, violent, or offensive content' },
  { code: 'fake_counterfeit', label: 'Fake / Counterfeit', description: 'Counterfeit or replica product' },
  { code: 'price_manipulation', label: 'Price Manipulation', description: 'Unrealistic or misleading price' },
  { code: 'misleading_description', label: 'Misleading Description', description: 'Description does not match the item' },
  { code: 'contact_info_in_description', label: 'Contact Info in Description', description: 'Phone/email in description (should use messaging)' },
  { code: 'other', label: 'Other', description: 'Custom reason (specify in notes)' },
];

export function AdminRejectDialog({ open, onOpenChange, onConfirm, adTitle, bulkCount }: AdminRejectDialogProps) {
  const [reasonCode, setReasonCode] = useState('');
  const [notes, setNotes] = useState('');
  const [notifySeller, setNotifySeller] = useState(true);

  const handleConfirm = () => {
    if (!reasonCode) return;
    onConfirm(reasonCode, notes.trim(), notifySeller);
    setReasonCode('');
    setNotes('');
    setNotifySeller(true);
  };

  const selectedReason = REJECTION_REASONS.find(r => r.code === reasonCode);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" /> Reject {bulkCount ? `${bulkCount} Listings` : 'Listing'}
          </DialogTitle>
          <DialogDescription>
            {adTitle ? `"${adTitle}"` : `${bulkCount} selected listings`} will be rejected and the seller(s) will be notified.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Reason *</Label>
            <Select value={reasonCode} onValueChange={setReasonCode}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select a reason" /></SelectTrigger>
              <SelectContent>
                {REJECTION_REASONS.map(r => (
                  <SelectItem key={r.code} value={r.code}>
                    <div>
                      <span className="font-medium">{r.label}</span>
                      <span className="text-xs text-muted-foreground block">{r.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Additional Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add specific feedback for the seller..."
              rows={3}
              maxLength={500}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">{notes.length}/500 characters</p>
          </div>

          {/* Preview */}
          {selectedReason && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs font-medium text-muted-foreground mb-1">Seller will see:</p>
              <p className="text-sm">
                <span className="font-medium">{selectedReason.label}</span>
                {notes && <span className="text-muted-foreground"> — {notes}</span>}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Switch checked={notifySeller} onCheckedChange={setNotifySeller} id="notify-seller" />
            <Label htmlFor="notify-seller" className="text-sm cursor-pointer">
              Notify seller via in-app notification
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reasonCode}
            className="gap-2"
          >
            <XCircle className="h-4 w-4" /> Confirm Rejection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
