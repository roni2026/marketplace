/**
 * AdminAdDetailPanel — Full listing detail panel for moderation.
 * Shows images, metadata, seller info, stats, reports, admin notes, and actions.
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatPrice } from '@/lib/constants';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  CheckCircle, XCircle, Star, Zap, TrendingUp, Eye, Heart, Share2,
  Tag, MapPin, Clock, DollarSign, Package, Shield, AlertTriangle,
  FileText, MessageSquare, ShoppingCart, ChevronLeft, ChevronRight,
  StickyNote, Flag, User, Loader2, Ban, Archive, Crown,
  Mail, Phone, Copy, Calendar,
} from 'lucide-react';

interface Ad {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  price: number | null;
  price_type: string;
  condition: string;
  status: string;
  division: string;
  district: string;
  area: string | null;
  brand: string | null;
  model: string | null;
  tags: string[] | null;
  is_featured: boolean;
  is_premium: boolean | null;
  is_boosted: boolean | null;
  is_urgent: boolean | null;
  is_negotiable: boolean | null;
  views_count: number | null;
  favorites_count: number | null;
  shares_count: number | null;
  offers_count: number | null;
  rejection_message: string | null;
  rejection_reason_code: string | null;
  created_at: string;
  updated_at: string | null;
  expires_at: string | null;
  user_id: string;
  category_id: string;
  subcategory_id: string | null;
  ad_images: { image_url: string; sort_order: number }[];
  categories: { name: string; slug: string } | null;
  subcategories: { name: string } | null;
}

interface AdminNote {
  id: string;
  note: string;
  created_at: string;
}

interface Report {
  id: string;
  reason: string;
  reason_code: string | null;
  status: string;
  created_at: string;
}

interface AdDetailPanelProps {
  ad: Ad;
  onClose: () => void;
  onAction: (action: string, adId: string, extra?: any) => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
}

export function AdminAdDetailPanel({ ad, onClose, onAction, onNavigate }: AdDetailPanelProps) {
  const { user } = useAuth();
  const [seller, setSeller] = useState<any>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updatingSeller, setUpdatingSeller] = useState(false);

  const copyToClipboard = (value: string, label: string) => {
    navigator.clipboard?.writeText(value);
    toast.success(`${label} copied`);
  };

  // #7 Editable seller status directly from the moderation panel.
  const updateSellerStatus = async (updates: Record<string, boolean>) => {
    setUpdatingSeller(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', ad.user_id);
      if (error) throw error;
      setSeller((prev: any) => ({ ...prev, ...updates }));
      toast.success('Seller updated');
    } catch {
      toast.error('Failed to update seller');
    } finally {
      setUpdatingSeller(false);
    }
  };

  useEffect(() => {
    setCurrentImage(0);
    loadDetails();
  }, [ad.id]);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const [sellerRes, reportsRes, notesRes] = await Promise.all([
        supabase.from('profiles').select('full_name, avatar_url, is_verified, is_suspended, is_blocked, phone_number, secondary_phone, email, division, created_at, seller_rating, total_sales').eq('user_id', ad.user_id).single(),
        supabase.from('reports').select('id, reason, reason_code, status, created_at').eq('ad_id', ad.id).order('created_at', { ascending: false }),
        supabase.from('admin_notes').select('id, note, created_at').eq('entity_type', 'ad').eq('entity_id', ad.id).order('created_at', { ascending: false }),
      ]);
      if (sellerRes.data) setSeller(sellerRes.data);
      setReports((reportsRes.data as Report[]) || []);
      setNotes((notesRes.data as AdminNote[]) || []);
    } catch { /* best-effort enrichment; panel still renders core ad data */ }
    setLoading(false);
  };

  const handleAddNote = async () => {
    if (!user || !newNote.trim()) return;
    setSavingNote(true);
    try {
      const { data, error } = await supabase.from('admin_notes').insert({
        admin_id: user.id,
        entity_type: 'ad',
        entity_id: ad.id,
        note: newNote.trim(),
      }).select().single();
      if (error) throw error;
      setNotes(prev => [data as AdminNote, ...prev]);
      setNewNote('');
      toast.success('Note added');
    } catch (err: any) {
      toast.error('Failed to add note');
    }
    setSavingNote(false);
  };

  const images = ad.ad_images || [];
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    approved: 'bg-green-500/10 text-green-600 border-green-500/20',
    rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
    sold: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    expired: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
    boosted: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    premium: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <div className="flex items-center gap-2">
          {onNavigate && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onNavigate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <h3 className="font-semibold text-sm truncate max-w-[300px]">{ad.title}</h3>
          {onNavigate && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onNavigate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </div>
        ) : (
          <>
            {/* Image gallery */}
            {images.length > 0 && (
              <div className="relative rounded-lg overflow-hidden bg-muted">
                <img src={images[currentImage]?.image_url} alt={ad.title} className="w-full h-64 object-contain" />
                {images.length > 1 && (
                  <>
                    <Button variant="ghost" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 bg-card/80 hover:bg-card h-8 w-8"
                      onClick={() => setCurrentImage(prev => (prev - 1 + images.length) % images.length)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 bg-card/80 hover:bg-card h-8 w-8"
                      onClick={() => setCurrentImage(prev => (prev + 1) % images.length)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-card/80 px-2 py-0.5 rounded text-xs">
                      {currentImage + 1} / {images.length}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Status & badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={statusColors[ad.status] || 'bg-muted text-muted-foreground'} variant="outline">
                {ad.status}
              </Badge>
              {ad.is_featured && <Badge className="gap-1"><Star className="h-3 w-3" /> Featured</Badge>}
              {ad.is_premium && <Badge className="bg-indigo-600 gap-1"><Crown className="h-3 w-3" /> Premium</Badge>}
              {ad.is_boosted && <Badge className="bg-purple-600 gap-1"><Zap className="h-3 w-3" /> Boosted</Badge>}
              {ad.is_urgent && <Badge className="bg-red-600 gap-1"><AlertTriangle className="h-3 w-3" /> Urgent</Badge>}
              {reports.length > 0 && <Badge variant="destructive" className="gap-1"><Flag className="h-3 w-3" /> {reports.length} Report{reports.length > 1 ? 's' : ''}</Badge>}
            </div>

            {/* Price & key info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Price</p>
                <p className="font-bold text-lg text-primary">{formatPrice(ad.price, ad.price_type)}</p>
                {ad.is_negotiable && <p className="text-xs text-muted-foreground">Negotiable</p>}
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Condition</p>
                <p className="font-medium capitalize">{ad.condition}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Category</p>
                <p className="font-medium text-sm">{ad.categories?.name || 'N/A'}</p>
                {ad.subcategories && <p className="text-xs text-muted-foreground">{ad.subcategories.name}</p>}
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="font-medium text-sm flex items-center gap-1"><MapPin className="h-3 w-3" /> {ad.district}, {ad.division}</p>
              </div>
              {ad.brand && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Brand</p>
                  <p className="font-medium text-sm">{ad.brand}</p>
                </div>
              )}
              {ad.model && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Model</p>
                  <p className="font-medium text-sm">{ad.model}</p>
                </div>
              )}
            </div>

            {/* Tags */}
            {ad.tags && ad.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {ad.tags.map(tag => <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>)}
              </div>
            )}

            {/* Description */}
            {ad.description && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                <div className="text-sm p-3 rounded-lg bg-muted/50 max-h-40 overflow-y-auto whitespace-pre-wrap">{ad.description}</div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: Eye, label: 'Views', value: ad.views_count || 0 },
                { icon: Heart, label: 'Favs', value: ad.favorites_count || 0 },
                { icon: Share2, label: 'Shares', value: ad.shares_count || 0 },
                { icon: ShoppingCart, label: 'Offers', value: ad.offers_count || 0 },
              ].map(stat => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="text-center p-2 rounded-lg border">
                    <Icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="font-bold text-sm">{stat.value}</p>
                    <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Seller info */}
            {seller && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs flex items-center gap-2"><User className="h-3 w-3" /> Seller</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={seller.avatar_url || ''} />
                      <AvatarFallback>{(seller.full_name || '?')[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-sm truncate">{seller.full_name || 'Unknown'}</p>
                        {seller.is_verified && <Shield className="h-3 w-3 text-green-500 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span>⭐ {seller.seller_rating || 0}</span>
                        <span>📦 {seller.total_sales || 0} sold</span>
                      </div>
                    </div>
                  </div>

                  {/* Seller details */}
                  <dl className="grid grid-cols-1 gap-1.5 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <dt className="flex items-center gap-1.5 text-muted-foreground shrink-0"><Mail className="h-3 w-3" /> Email</dt>
                      <dd className="flex items-center gap-1 min-w-0">
                        <span className="truncate">{seller.email || 'Not available'}</span>
                        {seller.email && (
                          <button type="button" onClick={() => copyToClipboard(seller.email, 'Email')} className="text-muted-foreground hover:text-foreground shrink-0" aria-label="Copy email">
                            <Copy className="h-3 w-3" />
                          </button>
                        )}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="flex items-center gap-1.5 text-muted-foreground shrink-0"><Phone className="h-3 w-3" /> Primary phone</dt>
                      <dd className="truncate">{seller.phone_number || 'Not provided'}</dd>
                    </div>
                    {seller.secondary_phone && (
                      <div className="flex items-center justify-between gap-2">
                        <dt className="flex items-center gap-1.5 text-muted-foreground shrink-0"><Phone className="h-3 w-3" /> Secondary phone</dt>
                        <dd className="truncate">{seller.secondary_phone}</dd>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <dt className="flex items-center gap-1.5 text-muted-foreground shrink-0"><User className="h-3 w-3" /> User ID</dt>
                      <dd className="flex items-center gap-1 min-w-0">
                        <span className="font-mono truncate">{ad.user_id}</span>
                        <button type="button" onClick={() => copyToClipboard(ad.user_id, 'User ID')} className="text-muted-foreground hover:text-foreground shrink-0" aria-label="Copy user ID">
                          <Copy className="h-3 w-3" />
                        </button>
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="flex items-center gap-1.5 text-muted-foreground shrink-0"><Calendar className="h-3 w-3" /> Joined</dt>
                      <dd className="truncate">{seller.created_at ? format(new Date(seller.created_at), 'MMM d, yyyy') : 'Unknown'}</dd>
                    </div>
                  </dl>

                  <Separator />

                  {/* Verification status (editable) */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground">Verification</span>
                      {seller.is_verified
                        ? <Badge className="text-[10px] bg-green-500/15 text-green-600 hover:bg-green-500/15">Verified</Badge>
                        : <Badge variant="secondary" className="text-[10px]">Unverified</Badge>}
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-xs" disabled={updatingSeller}
                      onClick={() => updateSellerStatus({ is_verified: !seller.is_verified })}>
                      {updatingSeller ? <Loader2 className="h-3 w-3 animate-spin" /> : (seller.is_verified ? 'Unverify' : 'Verify')}
                    </Button>
                  </div>

                  {/* Account status (editable) */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground">Account</span>
                      {seller.is_blocked
                        ? <Badge variant="destructive" className="text-[10px]">Blocked</Badge>
                        : seller.is_suspended
                          ? <Badge variant="destructive" className="text-[10px]">Suspended</Badge>
                          : <Badge className="text-[10px] bg-green-500/15 text-green-600 hover:bg-green-500/15">Active</Badge>}
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={updatingSeller}
                      onClick={() => updateSellerStatus({ is_suspended: !seller.is_suspended })}>
                      {updatingSeller ? <Loader2 className="h-3 w-3 animate-spin" /> : (<><Ban className="h-3 w-3" />{seller.is_suspended ? 'Unsuspend' : 'Suspend'}</>)}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Rejection info */}
            {ad.rejection_message && (
              <Card className="border-red-500/30 bg-red-500/5">
                <CardContent className="p-3">
                  <p className="text-xs font-medium text-red-600 mb-1 flex items-center gap-1"><XCircle className="h-3 w-3" /> Rejection Reason</p>
                  <p className="text-sm">{ad.rejection_message}</p>
                  {ad.rejection_reason_code && <Badge variant="destructive" className="text-[10px] mt-1">{ad.rejection_reason_code}</Badge>}
                </CardContent>
              </Card>
            )}

            {/* Reports */}
            {reports.length > 0 && (
              <Card className="border-orange-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs flex items-center gap-2 text-orange-600"><Flag className="h-3 w-3" /> Reports ({reports.length})</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {reports.map(r => (
                    <div key={r.id} className="text-xs p-2 rounded border">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{r.reason}</span>
                        <Badge variant="secondary" className="text-[10px]">{r.status}</Badge>
                      </div>
                      {r.reason_code && <p className="text-muted-foreground mt-0.5">Code: {r.reason_code}</p>}
                      <p className="text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Admin notes */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-2"><StickyNote className="h-3 w-3" /> Admin Notes</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {notes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No notes yet</p>
                ) : (
                  notes.map(n => (
                    <div key={n.id} className="text-xs p-2 rounded bg-muted/50">
                      <p>{n.note}</p>
                      <p className="text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                    </div>
                  ))
                )}
                <div className="flex gap-2">
                  <Textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add a private note..." rows={2} className="text-sm" />
                </div>
                <Button size="sm" onClick={handleAddNote} disabled={savingNote || !newNote.trim()} className="gap-2">
                  {savingNote ? <Loader2 className="h-3 w-3 animate-spin" /> : <StickyNote className="h-3 w-3" />} Add Note
                </Button>
              </CardContent>
            </Card>

            {/* Timestamps */}
            <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
              <p>Created: {format(new Date(ad.created_at), 'MMM d, yyyy h:mm a')}</p>
              {ad.updated_at && <p>Updated: {formatDistanceToNow(new Date(ad.updated_at), { addSuffix: true })}</p>}
              {ad.expires_at && <p>Expires: {format(new Date(ad.expires_at), 'MMM d, yyyy')}</p>}
            </div>
          </>
        )}
      </div>

      {/* Action bar */}
      <div className="border-t p-3 shrink-0">
        <div className="flex flex-wrap gap-2">
          {ad.status === 'pending' && (
            <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700" onClick={() => onAction('approve', ad.id)}>
              <CheckCircle className="h-4 w-4" /> Approve
            </Button>
          )}
          {ad.status !== 'rejected' && ad.status !== 'sold' && (
            <Button size="sm" variant="destructive" className="gap-1" onClick={() => onAction('reject', ad.id)}>
              <XCircle className="h-4 w-4" /> Reject
            </Button>
          )}
          {ad.status === 'approved' || ad.status === 'boosted' || ad.status === 'premium' ? (
            <>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => onAction(ad.is_featured ? 'unfeature' : 'feature', ad.id)}>
                <Star className={`h-4 w-4 ${ad.is_featured ? 'fill-current' : ''}`} /> {ad.is_featured ? 'Unfeature' : 'Feature'}
              </Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => onAction(ad.is_boosted ? 'unboost' : 'boost', ad.id)}>
                <Zap className="h-4 w-4" /> {ad.is_boosted ? 'Unboost' : 'Boost'}
              </Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => onAction(ad.is_premium ? 'unpremium' : 'premium', ad.id)}>
                <Crown className="h-4 w-4" /> {ad.is_premium ? 'Unpremium' : 'Premium'}
              </Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => onAction('sold', ad.id)}>
                <DollarSign className="h-4 w-4" /> Mark Sold
              </Button>
            </>
          ) : null}
          <Button size="sm" variant="outline" className="gap-1" onClick={() => onAction('archive', ad.id)}>
            <Archive className="h-4 w-4" /> Archive
          </Button>
          <Button size="sm" variant="outline" className="gap-1 text-destructive hover:text-destructive" onClick={() => onAction('delete', ad.id)}>
            <Ban className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
