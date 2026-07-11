import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable, Column } from '@/components/admin/DataTable';
import { formatPrice } from '@/lib/constants';
import { toast } from 'sonner';
import { logAdAction } from '@/lib/audit';
import { format } from 'date-fns';
import {
  Check, X, Eye, Star, MapPin, Calendar, Zap, AlertTriangle, Trash2,
  History, User as UserIcon, Search, Filter, Download, Upload,
  Package, Tag, DollarSign, TrendingUp, Clock,
} from 'lucide-react';

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

const ACTION_LABELS: Record<string, string> = {
  create: 'Created', update: 'Updated', delete: 'Deleted', approve: 'Approved',
  reject: 'Rejected', login: 'Login', logout: 'Logout', login_failed: 'Login Failed',
  suspend: 'Suspended', unsuspend: 'Unsuspended', verify: 'Verified',
  export: 'Exported', bulk_action: 'Bulk Action', settings_change: 'Settings Changed',
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
  const [adAuditLogs, setAdAuditLogs] = useState<Record<string, AuditLogEntry[]>>({});
  const [expandedAuditAd, setExpandedAuditAd] = useState<string | null>(null);
  const [auditLoading, setAuditLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (isAdmin === false) { navigate('/'); return; }
    if (isAdmin) fetchAds();
  }, [user, isAdmin, navigate, activeTab]);

  const fetchAds = async () => {
    setIsLoading(true);
    let query = supabase
      .from('ads')
      .select('*, ad_images(image_url), categories(name), profiles!ads_user_id_fkey(full_name, phone_number)')
      .order('created_at', { ascending: false });

    if (activeTab !== 'all') query = query.eq('status', activeTab);
    const { data } = await query;
    setAds((data as Ad[]) || []);
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
      if (!adAuditLogs[adId]) fetchAdAuditLogs(adId);
    }
  };

  const handleApprove = async (adId: string) => {
    const { error } = await supabase.from('ads').update({ status: 'approved', updated_at: new Date().toISOString() }).eq('id', adId);
    if (error) { toast.error('Failed to approve ad'); return; }
    await logAdAction('approve', adId);
    const ad = ads.find(a => a.id === adId);
    if (ad) {
      await supabase.from('notifications').insert({
        user_id: ad.user_id, type: 'ad_approved', title: 'Ad Approved',
        message: `Your ad "${ad.title}" has been approved and is now live.`, data: { ad_id: adId },
      }).catch(() => {});
    }
    toast.success('Ad approved');
    fetchAds();
  };

  const handleReject = async () => {
    if (!selectedAd || !rejectionMessage.trim()) {
      if (!selectedAd) return;
      toast.error('Please provide a rejection reason');
      return;
    }
    const { error } = await supabase.from('ads').update({
      status: 'rejected', rejection_message: rejectionMessage,
      rejection_reason_code: rejectionReasonCode || null, updated_at: new Date().toISOString(),
    }).eq('id', selectedAd.id);
    if (error) { toast.error('Failed to reject ad'); return; }
    await logAdAction('reject', selectedAd.id, { reason: rejectionReasonCode });
    await supabase.from('notifications').insert({
      user_id: selectedAd.user_id, type: 'ad_rejected', title: 'Ad Rejected',
      message: `Your ad "${selectedAd.title}" was rejected: ${rejectionMessage}`, data: { ad_id: selectedAd.id },
    }).catch(() => {});
    toast.success('Ad rejected');
    setShowRejectDialog(false);
    setRejectionMessage('');
    setRejectionReasonCode('');
    setSelectedAd(null);
    fetchAds();
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    const { error } = await supabase.from('ads').update({ status: 'approved', updated_at: new Date().toISOString() }).in('id', selectedIds);
    if (error) { toast.error('Failed to approve ads'); return; }
    for (const adId of selectedIds) await logAdAction('approve', adId, { bulk: true });
    toast.success(`${selectedIds.length} ads approved`);
    setSelectedIds([]);
    fetchAds();
  };

  const handleBulkReject = async () => {
    if (selectedIds.length === 0) return;
    const { error } = await supabase.from('ads').update({
      status: 'rejected', rejection_message: 'Bulk rejected by moderator',
      rejection_reason_code: 'spam', updated_at: new Date().toISOString(),
    }).in('id', selectedIds);
    if (error) { toast.error('Failed to reject ads'); return; }
    for (const adId of selectedIds) await logAdAction('reject', adId, { bulk: true, reason: 'spam' });
    toast.success(`${selectedIds.length} ads rejected`);
    setSelectedIds([]);
    fetchAds();
  };

  const handleDelete = async (adId: string) => {
    const { error } = await supabase.from('ads').delete().eq('id', adId);
    if (error) { toast.error('Failed to delete ad'); return; }
    await logAdAction('delete', adId);
    toast.success('Ad deleted');
    fetchAds();
  };

  const handleFeature = async (adId: string, featured: boolean) => {
    const { error } = await supabase.from('ads').update({ is_featured: !featured, updated_at: new Date().toISOString() }).eq('id', adId);
    if (error) { toast.error('Failed to update ad'); return; }
    await logAdAction('update', adId, { featured: !featured });
    toast.success(!featured ? 'Ad featured' : 'Ad unfeatured');
    fetchAds();
  };

  const toggleSelect = (adId: string) => {
    setSelectedIds(prev => prev.includes(adId) ? prev.filter(id => id !== adId) : [...prev, adId]);
  };

  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  const filteredAds = ads.filter(ad => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!ad.title.toLowerCase().includes(q) && !ad.description?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <AdminLayout>
      <PageHeader
        title="Ad Moderation"
        description="Review, approve, reject, and manage all marketplace listings"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Marketplace' }, { label: 'Ad Moderation' }]}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Upload className="h-3.5 w-3.5" /> Import
            </Button>
          </>
        }
      />

      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Pending', value: ads.filter(a => a.status === 'pending').length, color: 'text-yellow-500', icon: Clock },
          { label: 'Approved', value: ads.filter(a => a.status === 'approved').length, color: 'text-green-500', icon: Check },
          { label: 'Rejected', value: ads.filter(a => a.status === 'rejected').length, color: 'text-red-500', icon: X },
          { label: 'Featured', value: ads.filter(a => a.is_featured).length, color: 'text-blue-500', icon: Star },
          { label: 'Total', value: ads.length, color: 'text-purple-500', icon: Package },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <div>
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <TabsList>
            <TabsTrigger value="pending">Pending ({ads.filter(a => a.status === 'pending').length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({ads.filter(a => a.status === 'approved').length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({ads.filter(a => a.status === 'rejected').length})</TabsTrigger>
            <TabsTrigger value="sold">Sold ({ads.filter(a => a.status === 'sold').length})</TabsTrigger>
            <TabsTrigger value="all">All ({ads.length})</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search ads..." className="pl-8 h-9 w-48" />
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 p-3 mb-4 bg-card border border-border rounded-lg">
            <span className="text-sm font-medium">{selectedIds.length} selected</span>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleBulkApprove}>
              <Check className="h-4 w-4" /> Approve All
            </Button>
            <Button variant="outline" size="sm" className="gap-2 text-destructive" onClick={handleBulkReject}>
              <X className="h-4 w-4" /> Reject All
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>Clear</Button>
          </div>
        )}

        {['pending', 'approved', 'rejected', 'sold', 'all'].map(tab => (
          <TabsContent key={tab} value={tab} className="mt-0">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
                ))}
              </div>
            ) : filteredAds.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No ads in this category.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAds.map(ad => {
                  const imageUrl = ad.ad_images?.[0]?.image_url || '/placeholder.svg';
                  return (
                    <Card key={ad.id} className="overflow-hidden hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          {activeTab === 'pending' && (
                            <Checkbox checked={selectedIds.includes(ad.id)} onCheckedChange={() => toggleSelect(ad.id)} className="mt-1" />
                          )}
                          <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted shrink-0">
                            <img src={imageUrl} alt={ad.title} className="w-full h-full object-cover" onError={e => { e.currentTarget.src = '/placeholder.svg'; }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h3 className="font-semibold truncate">{ad.title}</h3>
                                <p className="text-lg font-bold text-primary mt-0.5">{formatPrice(ad.price, ad.price_type)}</p>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{ad.district}</span>
                                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(ad.created_at).toLocaleDateString()}</span>
                                  {ad.categories && <Badge variant="secondary" className="text-xs">{ad.categories.name}</Badge>}
                                </div>
                                {ad.profiles && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    by {ad.profiles.full_name || 'Unknown'}{ad.profiles.phone_number && ` · ${ad.profiles.phone_number}`}
                                  </p>
                                )}
                                {ad.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{ad.description}</p>}
                                <div className="flex gap-1 mt-2">
                                  {ad.is_featured && <Badge className="bg-primary text-primary-foreground text-xs"><Star className="h-3 w-3 mr-1" />Featured</Badge>}
                                  {ad.is_premium && <Badge className="bg-purple-600 text-white text-xs">Premium</Badge>}
                                  {ad.is_boosted && <Badge className="bg-blue-600 text-white text-xs">Boosted</Badge>}
                                  {ad.is_urgent && <Badge className="bg-red-600 text-white text-xs"><Zap className="h-3 w-3 mr-1" />Urgent</Badge>}
                                </div>
                              </div>
                              <div className="flex flex-col gap-2 shrink-0">
                                {ad.status === 'pending' && (
                                  <>
                                    <Button size="sm" className="gap-2" onClick={() => handleApprove(ad.id)}>
                                      <Check className="h-4 w-4" /> Approve
                                    </Button>
                                    <Button variant="outline" size="sm" className="gap-2 text-destructive" onClick={() => { setSelectedAd(ad); setShowRejectDialog(true); }}>
                                      <X className="h-4 w-4" /> Reject
                                    </Button>
                                  </>
                                )}
                                <Button variant="ghost" size="sm" className="gap-2" onClick={() => handleFeature(ad.id, ad.is_featured)}>
                                  <Star className={`h-4 w-4 ${ad.is_featured ? 'fill-current text-yellow-500' : ''}`} />
                                  {ad.is_featured ? 'Unfeature' : 'Feature'}
                                </Button>
                                <Button variant="ghost" size="sm" className="gap-2 text-destructive" onClick={() => handleDelete(ad.id)}>
                                  <Trash2 className="h-4 w-4" /> Delete
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Audit Log History */}
                        <div className="mt-3 pt-3 border-t">
                          <button onClick={() => toggleAuditLog(ad.id)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                            <History className="h-4 w-4" />
                            {expandedAuditAd === ad.id ? 'Hide' : 'Show'} Audit History
                            {adAuditLogs[ad.id] && adAuditLogs[ad.id].length > 0 && (
                              <Badge variant="secondary" className="text-xs">{adAuditLogs[ad.id].length} actions</Badge>
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
                                  {adAuditLogs[ad.id].map(log => (
                                    <div key={log.id} className="flex items-start gap-3 text-sm py-1.5 px-2 rounded-md hover:bg-accent/50">
                                      <div className="shrink-0 mt-0.5">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                                          {ACTION_LABELS[log.action] || log.action}
                                        </span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                          <UserIcon className="h-3 w-3" />
                                          <span className="font-medium text-foreground">{log.profiles?.full_name || 'System'}</span>
                                          <span>·</span>
                                          <span>{format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}</span>
                                        </div>
                                        {log.details && Object.keys(log.details).length > 0 && (
                                          <p className="text-xs text-muted-foreground mt-0.5">{JSON.stringify(log.details)}</p>
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
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Ad</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason Code</Label>
              <Select value={rejectionReasonCode} onValueChange={setRejectionReasonCode}>
                <SelectTrigger><SelectValue placeholder="Select a reason" /></SelectTrigger>
                <SelectContent>
                  {REJECTION_REASONS.map(r => <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rejectionMsg">Rejection Message</Label>
              <Textarea id="rejectionMsg" value={rejectionMessage} onChange={e => setRejectionMessage(e.target.value)} placeholder="Explain why this ad is being rejected..." rows={4} />
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
