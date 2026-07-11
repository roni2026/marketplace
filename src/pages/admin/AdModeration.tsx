import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/constants';
import { toast } from 'sonner';
import { Check, X, Eye, Star, MapPin, Calendar, Zap, AlertTriangle, Trash2, CheckSquare, History, User as UserIcon } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { logAdAction } from '@/lib/audit';
import { getSpamScore, moderateContent } from '@/lib/moderation';
import { format } from 'date-fns';

interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  profiles?: { full_name: string | null } | null;
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  approve: 'Approved',
  reject: 'Rejected',
  login: 'Login',
  logout: 'Logout',
  login_failed: 'Login Failed',
  suspend: 'Suspended',
  unsuspend: 'Unsuspended',
  verify: 'Verified',
  export: 'Exported',
  bulk_action: 'Bulk Action',
  settings_change: 'Settings Changed',
};

const ACTION_COLORS: Record<string, string> = {
  approve: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  reject: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  create: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  update: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  delete: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  suspend: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  unsuspend: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  verify: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

interface Ad {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  price: number | null;
  price_type: string;
  condition: string;
  division: string;
  district: string;
  description: string | null;
  status: string;
  is_featured: boolean;
  is_premium: boolean | null;
  is_boosted: boolean | null;
  is_urgent: boolean | null;
  created_at: string;
  ad_images: { image_url: string }[];
  categories: { name: string } | null;
  profiles: { full_name: string | null; phone_number: string | null } | null;
}

const REJECTION_REASONS = [
  { code: 'prohibited_item', label: 'Prohibited item' },
  { code: 'duplicate_ad', label: 'Duplicate ad' },
  { code: 'spam', label: 'Spam or scam' },
  { code: 'inappropriate_content', label: 'Inappropriate content' },
  { code: 'misleading_info', label: 'Misleading information' },
  { code: 'wrong_category', label: 'Wrong category' },
  { code: 'poor_quality', label: 'Poor quality images/description' },
  { code: 'price_violation', label: 'Unrealistic price' },
];

export default function AdModeration() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionMessage, setRejectionMessage] = useState('');
  const [rejectionReasonCode, setRejectionReasonCode] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [spamScores, setSpamScores] = useState<Record<string, number>>({});
  const [adAuditLogs, setAdAuditLogs] = useState<Record<string, AuditLogEntry[]>>({});
  const [expandedAuditAd, setExpandedAuditAd] = useState<string | null>(null);
  const [auditLoading, setAuditLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (isAdmin === false) {
      navigate('/');
      return;
    }
    if (isAdmin) {
      fetchAds();
    }
  }, [user, isAdmin, navigate, activeTab]);

  const fetchAds = async () => {
    setIsLoading(true);
    let query = supabase
      .from('ads')
      .select('*, ad_images(image_url), categories(name), profiles!ads_user_id_fkey(full_name, phone_number)')
      .order('created_at', { ascending: false });

    if (activeTab !== 'all') {
      query = query.eq('status', activeTab);
    }

    const { data } = await query;
    const adsData = (data as Ad[]) || [];
    setAds(adsData);

    // Calculate spam scores for pending ads
    const scores: Record<string, number> = {};
    for (const ad of adsData) {
      if (ad.status === 'pending') {
        scores[ad.id] = getSpamScore(ad.title + ' ' + (ad.description || ''));
      }
    }
    setSpamScores(scores);
    setIsLoading(false);
  };

  const fetchAdAuditLogs = async (adId: string) => {
    setAuditLoading(adId);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*, profiles!audit_logs_user_id_fkey(full_name)')
        .eq('resource_type', 'ad')
        .eq('resource_id', adId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        // Try without the foreign key relation name
        const { data: fallbackData } = await supabase
          .from('audit_logs')
          .select('*')
          .eq('resource_type', 'ad')
          .eq('resource_id', adId)
          .order('created_at', { ascending: false })
          .limit(20);
        setAdAuditLogs((prev) => ({ ...prev, [adId]: (fallbackData as AuditLogEntry[]) || [] }));
      } else {
        setAdAuditLogs((prev) => ({ ...prev, [adId]: (data as AuditLogEntry[]) || [] }));
      }
    } catch {
      setAdAuditLogs((prev) => ({ ...prev, [adId]: [] }));
    }
    setAuditLoading(null);
  };

  const toggleAuditLog = (adId: string) => {
    if (expandedAuditAd === adId) {
      setExpandedAuditAd(null);
    } else {
      setExpandedAuditAd(adId);
      if (!adAuditLogs[adId]) {
        fetchAdAuditLogs(adId);
      }
    }
  };

  const handleApprove = async (adId: string) => {
    const { error } = await supabase
      .from('ads')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', adId);
    
    if (error) {
      toast.error('Failed to approve ad');
    } else {
      await logAdAction('approve', adId);
      // Notify the ad owner
      const ad = ads.find(a => a.id === adId);
      if (ad) {
        await supabase.from('notifications').insert({
          user_id: ad.user_id,
          type: 'ad_approved',
          title: 'Ad Approved',
          message: `Your ad "${ad.title}" has been approved and is now live.`,
          data: { ad_id: adId },
        }).catch(() => {});
      }
      toast.success('Ad approved');
      fetchAds();
    }
  };

  const handleReject = async () => {
    if (!selectedAd) return;
    if (!rejectionMessage.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    const { error } = await supabase
      .from('ads')
      .update({
        status: 'rejected',
        rejection_message: rejectionMessage,
        rejection_reason_code: rejectionReasonCode || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedAd.id);
    
    if (error) {
      toast.error('Failed to reject ad');
    } else {
      await logAdAction('reject', selectedAd.id, { reason: rejectionReasonCode });
      // Notify the ad owner
      await supabase.from('notifications').insert({
        user_id: selectedAd.user_id,
        type: 'ad_rejected',
        title: 'Ad Rejected',
        message: `Your ad "${selectedAd.title}" was rejected: ${rejectionMessage}`,
        data: { ad_id: selectedAd.id },
      }).catch(() => {});
      toast.success('Ad rejected');
      setShowRejectDialog(false);
      setRejectionMessage('');
      setRejectionReasonCode('');
      setSelectedAd(null);
      fetchAds();
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    const { error } = await supabase
      .from('ads')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .in('id', selectedIds);
    
    if (error) {
      toast.error('Failed to approve ads');
    } else {
      for (const adId of selectedIds) {
        await logAdAction('approve', adId, { bulk: true });
      }
      toast.success(`${selectedIds.length} ads approved`);
      setSelectedIds([]);
      fetchAds();
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.length === 0) return;
    const { error } = await supabase
      .from('ads')
      .update({
        status: 'rejected',
        rejection_message: 'Bulk rejected by moderator',
        rejection_reason_code: 'spam',
        updated_at: new Date().toISOString(),
      })
      .in('id', selectedIds);
    
    if (error) {
      toast.error('Failed to reject ads');
    } else {
      for (const adId of selectedIds) {
        await logAdAction('reject', adId, { bulk: true, reason: 'spam' });
      }
      toast.success(`${selectedIds.length} ads rejected`);
      setSelectedIds([]);
      fetchAds();
    }
  };

  const handleDelete = async (adId: string) => {
    const { error } = await supabase.from('ads').delete().eq('id', adId);
    if (error) {
      toast.error('Failed to delete ad');
    } else {
      await logAdAction('delete', adId);
      toast.success('Ad deleted');
      fetchAds();
    }
  };

  const handleFeature = async (adId: string, featured: boolean) => {
    const { error } = await supabase
      .from('ads')
      .update({ is_featured: !featured, updated_at: new Date().toISOString() })
      .eq('id', adId);
    
    if (error) {
      toast.error('Failed to update ad');
    } else {
      await logAdAction('update', adId, { featured: !featured });
      toast.success(!featured ? 'Ad featured' : 'Ad unfeatured');
      fetchAds();
    }
  };

  const toggleSelect = (adId: string) => {
    setSelectedIds(prev => 
      prev.includes(adId) 
        ? prev.filter(id => id !== adId)
        : [...prev, adId]
    );
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-64 w-64" />
      </div>
    );
  }

  const filterAdsByStatus = (status: string | null) => {
    if (!status) return ads;
    return ads.filter(ad => ad.status === status);
  };

  const AdList = ({ status }: { status: string | null }) => {
    const filteredAds = status ? ads.filter(ad => ad.status === status) : ads;

    if (filteredAds.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p>No ads in this category.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Bulk Actions */}
        {selectedIds.length > 0 && status === 'pending' && (
          <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
            <span className="text-sm font-medium">{selectedIds.length} selected</span>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleBulkApprove}>
              <Check className="h-4 w-4" />
              Approve All
            </Button>
            <Button variant="outline" size="sm" className="gap-2 text-destructive" onClick={handleBulkReject}>
              <X className="h-4 w-4" />
              Reject All
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
              Clear
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {filteredAds.map((ad) => {
            const imageUrl = ad.ad_images?.[0]?.image_url || '/placeholder.svg';
            const spamScore = spamScores[ad.id] || 0;
            return (
              <Card key={ad.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {status === 'pending' && (
                      <Checkbox
                        checked={selectedIds.includes(ad.id)}
                        onCheckedChange={() => toggleSelect(ad.id)}
                        className="mt-1"
                      />
                    )}
                    <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted shrink-0">
                      <img
                        src={imageUrl}
                        alt={ad.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{ad.title}</h3>
                          <p className="text-lg font-bold text-primary mt-1">
                            {formatPrice(ad.price, ad.price_type)}
                          </p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {ad.district}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(ad.created_at).toLocaleDateString()}
                            </span>
                            {ad.categories && (
                              <Badge variant="secondary" className="text-xs">
                                {ad.categories.name}
                              </Badge>
                            )}
                          </div>
                          {ad.profiles && (
                            <p className="text-xs text-muted-foreground mt-1">
                              by {ad.profiles.full_name || 'Unknown'}
                              {ad.profiles.phone_number && ` · ${ad.profiles.phone_number}`}
                            </p>
                          )}
                          {ad.description && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {ad.description}
                            </p>
                          )}
                          {/* Spam detection indicator */}
                          {spamScore >= 40 && (
                            <div className="mt-2 flex items-center gap-2">
                              <Badge className={spamScore >= 60 ? 'bg-red-500 hover:bg-red-500 text-white' : 'bg-yellow-500 hover:bg-yellow-500 text-white'}>
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Spam score: {spamScore}
                              </Badge>
                            </div>
                          )}
                          {/* Premium/Boosted/Urgent badges */}
                          <div className="flex gap-1 mt-2">
                            {ad.is_featured && <Badge className="bg-primary text-primary-foreground text-xs"><Star className="h-3 w-3 mr-1" />Featured</Badge>}
                            {ad.is_premium && <Badge className="bg-purple-600 hover:bg-purple-600 text-white text-xs">Premium</Badge>}
                            {ad.is_boosted && <Badge className="bg-blue-600 hover:bg-blue-600 text-white text-xs">Boosted</Badge>}
                            {ad.is_urgent && <Badge className="bg-red-600 hover:bg-red-600 text-white text-xs"><Zap className="h-3 w-3 mr-1" />Urgent</Badge>}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          {ad.status === 'pending' && (
                            <>
                              <Button size="sm" className="gap-2" onClick={() => handleApprove(ad.id)}>
                                <Check className="h-4 w-4" />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 text-destructive"
                                onClick={() => {
                                  setSelectedAd(ad);
                                  setShowRejectDialog(true);
                                }}
                              >
                                <X className="h-4 w-4" />
                                Reject
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2"
                            onClick={() => handleFeature(ad.id, ad.is_featured)}
                          >
                            <Star className={`h-4 w-4 ${ad.is_featured ? 'fill-current text-yellow-500' : ''}`} />
                            {ad.is_featured ? 'Unfeature' : 'Feature'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2 text-destructive"
                            onClick={() => handleDelete(ad.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Audit Log History for this ad */}
                  <div className="mt-3 pt-3 border-t">
                    <button
                      onClick={() => toggleAuditLog(ad.id)}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <History className="h-4 w-4" />
                      {expandedAuditAd === ad.id ? 'Hide' : 'Show'} Audit History
                      {adAuditLogs[ad.id] && adAuditLogs[ad.id].length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {adAuditLogs[ad.id].length} actions
                        </Badge>
                      )}
                    </button>
                    {expandedAuditAd === ad.id && (
                      <div className="mt-3 space-y-2">
                        {auditLoading === ad.id ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Loading audit history...
                          </div>
                        ) : adAuditLogs[ad.id] && adAuditLogs[ad.id].length > 0 ? (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {adAuditLogs[ad.id].map((log) => (
                              <div
                                key={log.id}
                                className="flex items-start gap-3 text-sm py-1.5 px-2 rounded-md hover:bg-accent/50"
                              >
                                <div className="shrink-0 mt-0.5">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                                    {ACTION_LABELS[log.action] || log.action}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <UserIcon className="h-3 w-3" />
                                    <span className="font-medium text-foreground">
                                      {log.profiles?.full_name || 'System'}
                                    </span>
                                    <span>·</span>
                                    <span>{format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}</span>
                                  </div>
                                  {log.details && Object.keys(log.details).length > 0 && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {JSON.stringify(log.details)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No audit history found for this ad.</p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Ad Moderation</h1>
        <p className="text-muted-foreground">Review, approve, and manage ads</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({filterAdsByStatus('pending').length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({filterAdsByStatus('approved').length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({filterAdsByStatus('rejected').length})</TabsTrigger>
          <TabsTrigger value="sold">Sold ({filterAdsByStatus('sold').length})</TabsTrigger>
          <TabsTrigger value="all">All ({ads.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {isLoading ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div> : <AdList status="pending" />}
        </TabsContent>
        <TabsContent value="approved" className="mt-6">
          {isLoading ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div> : <AdList status="approved" />}
        </TabsContent>
        <TabsContent value="rejected" className="mt-6">
          {isLoading ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div> : <AdList status="rejected" />}
        </TabsContent>
        <TabsContent value="sold" className="mt-6">
          {isLoading ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div> : <AdList status="sold" />}
        </TabsContent>
        <TabsContent value="all" className="mt-6">
          {isLoading ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div> : <AdList status={null} />}
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Ad</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason Code</Label>
              <Select value={rejectionReasonCode} onValueChange={setRejectionReasonCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {REJECTION_REASONS.map((reason) => (
                    <SelectItem key={reason.code} value={reason.code}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rejectionMsg">Rejection Message</Label>
              <Textarea
                id="rejectionMsg"
                value={rejectionMessage}
                onChange={(e) => setRejectionMessage(e.target.value)}
                placeholder="Explain why this ad is being rejected..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject}>Reject Ad</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
