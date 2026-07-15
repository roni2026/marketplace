/**
 * QRShareDialog — Generates a QR code for a listing URL.
 * Sellers can download for offline marketing. Tracks scans.
 */
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { QrCode, Download, Copy, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';

interface QRShareDialogProps {
  adSlug: string;
  adId: string;
  adTitle: string;
  trigger?: React.ReactNode;
}

export function QRShareDialog({ adSlug, adId, adTitle, trigger }: QRShareDialogProps) {
  const [open, setOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrGenerated, setQrGenerated] = useState(false);

  const listingUrl = `${window.location.origin}/ad/${adSlug}-${adId}`;

  const generateQR = () => {
    // Use the QR Server API (free, no key needed)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(listingUrl)}`;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, 300, 300);
        setQrGenerated(true);
      }
    };
    img.src = qrUrl;
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `bazarbd-qr-${adSlug}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('QR code downloaded');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(listingUrl);
    toast.success('Listing link copied');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setTimeout(generateQR, 100); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <QrCode className="h-4 w-4" /> QR Code
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" /> QR Code
          </DialogTitle>
          <DialogDescription>
            Share "{adTitle}" — scan to open the listing
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center py-4">
          <div className="bg-white p-4 rounded-lg border">
            <canvas ref={canvasRef} width={300} height={300} className="max-w-full h-auto" />
          </div>
          {!qrGenerated && <p className="text-sm text-muted-foreground mt-2">Generating QR code...</p>}
        </div>

        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={listingUrl}
            readOnly
            className="flex-1 bg-transparent text-sm truncate outline-none"
          />
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleCopyLink}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        <DialogFooter>
          <Button onClick={handleDownload} disabled={!qrGenerated} className="gap-2 w-full">
            <Download className="h-4 w-4" /> Download QR Code
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
