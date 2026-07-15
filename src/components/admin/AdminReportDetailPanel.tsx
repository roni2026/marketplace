/**
 * AdminReportDetailPanel — Full report detail panel for report management.
 * Shows report info, reported listing, reporter, evidence, and resolution actions.
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  Flag, CheckCircle, XCircle, AlertTriangle, User, MapPin, DollarSign,
  Package, ChevronLeft, ChevronRight, MessageSquare, Ban, Shield,
  FileText, Clock, Eye, StickyNote, Loader2,
} from 'lucide-react';

interface Report {
  id: string;
  user_id: string;
  ad_id: string;
  reason: string;
  reason_code: string | null;
  status: string;
  admin_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
}

interface AdminReportDetailPanelProps {
  report: Report;
  onClose: () => void;
  onAction: (action: string, reportId: string, extra?: any) => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
}

export function AdminReportDetailPanel({ report, onClose, onAction, onNavigate }: AdminReportDetailPanelProps) {
  const [ad, setAd] = useState<any>(null);
  const [reporter, setReporter] = useState<any>(null);
  const [seller, setSeller] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => { loadDetails(); }, [report.id]);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const [adRes, reporterRes] = await Promise.all([
        supabase.from('ads').select('*, ad_images(image_url), categories(name)').eq('id', report.ad_id).single(),
        supabase.from('profiles').select('full_name, avatar_url, is_verified, is_suspended, phone_number').eq('user_id', report.user_id).single(),
      ]);
      setAd(adRes.data);
      setReporter(reporterRes.data);
      if (adRes.data?.user_id) {
        const { data: sellerData } = await supabase.from('profiles').select('full_name, avatar_url, is_verified, is_suspended, phone_number, seller_rating, total_sales').eq('user_id', adRes.data.user_id).single();
        setSeller(sellerData);
      }
    } catch {}
    setLoading(false);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { variant: any; icon: any }> = {
      pending: { variant: 'secondary', icon: Clock },
      reviewing: { variant: 'secondary', icon: Eye },
      resolved: { variant: 'default', icon: CheckCircle },
      dismissed: { variant: 'outline', icon: XCircle },
    };
    const cfg = map[status] || map.pending;
    const Icon = cfg.icon;
    return <Badge variant={cfg.variant} className="gap-1 capitalize"><Icon className="h-3 w-3" /> {status}</Badge>;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <div className="flex items-center gap-2">
          {onNavigate && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onNavigate('prev')}><ChevronLeft className="h-4 w-4" /></Button>}
          <h3 className="font-semibold text-sm">Report Details</h3>
          {onNavigate && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onNavigate('next')}><ChevronRight className="h-4 w-4" /></Button>}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="space-y-4"><Skeleton className="h-32 rounded-lg" /><Skeleton className="h-48 rounded-lg" /></div>
        ) : (
          <>
            {/* Report info */}
            <Card className={report.status === 'pending' ? 'border-orange-500/30' : ''}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flag className="h-5 w-5 text-orange-500" />
                    <span className="font-medium">{report.reason}</span>
                  </div>
                  {statusBadge(report.status)}
                </div>
                {report.reason_code && <Badge variant="outline" className="text-[10px] font-mono">{report.reason_code}</Badge>}
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Reported {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}</p>
                  <p>Report ID: {report.id.slice(0, 8)}...</p>
                  {report.resolved_at && <p>Resolved {formatDistanceToNow(new Date(report.resolved_at), { addSuffix: true })}</p>}
                </div>
                {report.admin_notes && (
                  <div className="p-2 rounded bg-muted/50 text-xs">
                    <p className="font-medium text-muted-foreground mb-1">Admin Notes:</p>
                    <p>{report.admin_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reported listing */}
            {ad && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1"><Package className="h-3 w-3" /> Reported Listing</p>
                  <div className="flex gap-3">
                    {ad.ad_images?.[0]?.image_url && (
                      <img src={ad.ad_images[0].image_url} alt="" className="w-20 h-20 rounded-lg object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-2">{ad.title}</p>
                      <p className="text-sm text-primary font-bold mt-1">৳{ad.price?.toLocaleString() || 'N/A'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[10px] capitalize">{ad.status}</Badge>
                        <span className="text-xs text-muted-foreground">{ad.categories?.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="h-3 w-3" /> {ad.district}, {ad.division}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reporter info */}
            {reporter && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1"><User className="h-3 w-3" /> Reporter</p>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={reporter.avatar_url || ''} />
                      <AvatarFallback>{(reporter.full_name || '?')[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{reporter.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{reporter.phone_number || 'No phone'}</p>
                      {reporter.is_verified && <Badge variant="default" className="text-[10px] gap-1 mt-1"><Shield className="h-3 w-3" /> Verified</Badge>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Seller info */}
            {seller && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1"><User className="h-3 w-3" /> Reported Seller</p>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={seller.avatar_url || ''} />
                      <AvatarFallback>{(seller.full_name || '?')[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{seller.full_name || 'Unknown'}</p>
                        {seller.is_verified && <Shield className="h-3 w-3 text-green-500" />}
                        {seller.is_suspended && <Badge variant="destructive" className="text-[10px]">Suspended</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{seller.phone_number || 'No phone'}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>⭐ {seller.seller_rating || 0}</span>
                        <span>📦 {seller.total_sales || 0} sold</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Resolution notes */}
            {report.status === 'pending' || report.status === 'reviewing' ? (
              <div className="space-y-2">
                <Label>Resolution Notes</Label>
                <Textarea value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} placeholder="Add notes about your decision..." rows={3} />
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Action bar */}
      {(report.status === 'pending' || report.status === 'reviewing') && (
        <div className="border-t p-3 shrink-0">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700" onClick={() => onAction('resolve', report.id, { notes: resolutionNotes })}>
              <CheckCircle className="h-4 w-4" /> Resolve
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => onAction('dismiss', report.id, { notes: resolutionNotes })}>
              <XCircle className="h-4 w-4" /> Dismiss
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => onAction('reviewing', report.id)}>
              <Eye className="h-4 w-4" /> Mark Reviewing
            </Button>
            {ad && <Button size="sm" variant="destructive" className="gap-1" onClick={() => onAction('remove_ad', report.id, { adId: report.ad_id, notes: resolutionNotes })}>
              <Ban className="h-4 w-4" /> Remove Listing
            </Button>}
            {seller && <Button size="sm" variant="destructive" className="gap-1" onClick={() => onAction('suspend_seller', report.id, { sellerId: ad?.user_id, notes: resolutionNotes })}>
              <Ban className="h-4 w-4" /> Suspend Seller
            </Button>}
          </div>
        </div>
      )}
    </div>
  );
}
