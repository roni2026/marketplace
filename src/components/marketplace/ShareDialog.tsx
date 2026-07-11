/**
 * ShareDialog — Comprehensive sharing dialog with social platforms and QR code.
 */

import { useState } from 'react';
import { useMarketplaceExperience } from '@/hooks/useMarketplaceExperience';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Link as LinkIcon, QrCode, MessageCircle, Facebook, Mail, Phone,
  Share2, Download, Printer, Send, Twitter,
} from 'lucide-react';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
  text?: string;
  adId?: string;
}

const PLATFORM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  copy_link: LinkIcon, qr_code: QrCode, whatsapp: MessageCircle, facebook: Facebook,
  messenger: MessageCircle, twitter: Twitter, telegram: Send, email: Mail,
  sms: Phone, native: Share2,
};

export function ShareDialog({ open, onOpenChange, url, title, text, adId }: ShareDialogProps) {
  const { share, generateQRCodeUrl, downloadQRCode, printQRCode, SHARE_OPTIONS } = useMarketplaceExperience();
  const [activeTab, setActiveTab] = useState('share');
  const [copied, setCopied] = useState(false);

  const handlePlatformClick = async (platform: string) => {
    if (platform === 'qr_code') {
      setActiveTab('qr');
      return;
    }
    const success = await share(platform as any, url, title, text, adId);
    if (platform === 'copy_link' && success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const qrUrl = generateQRCodeUrl(url, 300);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Share Listing</DialogTitle></DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="share" className="flex-1">Share</TabsTrigger>
            <TabsTrigger value="qr" className="flex-1">QR Code</TabsTrigger>
          </TabsList>

          <TabsContent value="share" className="space-y-4">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {SHARE_OPTIONS.map(opt => {
                const Icon = PLATFORM_ICONS[opt.platform] || Share2;
                return (
                  <button
                    key={opt.platform}
                    onClick={() => handlePlatformClick(opt.platform)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${opt.color}15` }}>
                      <Icon className="h-5 w-5" style={{ color: opt.color }} />
                    </div>
                    <span className="text-xs font-medium">{opt.label}</span>
                  </button>
                );
              })}
            </div>
            {copied && <p className="text-sm text-green-600 text-center">Link copied to clipboard!</p>}
            <div className="bg-muted rounded-lg p-2 flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground truncate flex-1">{url}</p>
            </div>
          </TabsContent>

          <TabsContent value="qr" className="space-y-4">
            <div className="flex flex-col items-center gap-3">
              <div className="bg-white p-4 rounded-lg border">
                <img src={qrUrl} alt="QR Code" className="w-48 h-48" />
              </div>
              <p className="text-sm text-muted-foreground text-center">Scan this QR code to open the listing</p>
              <div className="flex gap-2 w-full">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => downloadQRCode(qrUrl, `qr-${adId || 'listing'}.png`)}>
                  <Download className="h-4 w-4" /> Download
                </Button>
                <Button variant="outline" className="flex-1 gap-2" onClick={() => printQRCode(qrUrl, title)}>
                  <Printer className="h-4 w-4" /> Print
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default ShareDialog;
