/**
 * AdminUserDetailPanel — Full user profile panel for user management.
 * Shows profile, activity, listings, reports, trust score, and admin actions.
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  User, Shield, ShieldCheck, ShieldAlert, Ban, CheckCircle, XCircle,
  Eye, Heart, Package, Flag, Star, MapPin, Phone, Mail, Clock,
  TrendingUp, DollarSign, MessageSquare, StickyNote, Loader2,
  ChevronLeft, ChevronRight, Activity, AlertTriangle, FileText,
} from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  division: string | null;
  district: string | null;
  area: string | null;
  is_verified: boolean;
  is_suspended: boolean;
  suspended_at: string | null;
  suspended_reason: string | null;
  deleted_at: string | null;
  last_login_at: string | null;
  last_login_ip: string | null;
  seller_rating: number | null;
  buyer_rating: number | null;
  total_sales: number | null;
  total_purchases: number | null;
  total_followers: number | null;
  total_following: number | null;
  bio: string | null;
  website: string | null;
  created_at: string;
}

interface AdminUserDetailPanelProps {
  profile: UserProfile;
  onClose: () => void;
  onAction: (action: string, userId: string, extra?: any) => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
}

export function AdminUserDetailPanel({ profile, onClose, onAction, onNavigate }: AdminUserDetailPanelProps) {
  const { user } = useAuth();
  const [roles, setRoles] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalAds: 0, pendingAds: 0, totalReports: 0, totalViews: 0 });

  useEffect(() => { loadDetails(); }, [profile.user_id]);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const [rolesRes, adsRes, reportsRes, notesRes] = await Promise.all([
        supabase.from('user_roles').select('role, created_at').eq('user_id', profile.user_id),
        supabase.from('ads').select('id, title, status, price, created_at, views_count, favorites_count').eq('user_id', profile.user_id).order('created_at', { ascending: false }).limit(10),
        supabase.from('reports').select('id, reason, status, created_at').eq('user_id', profile.user_id).order('created_at', { ascending: false }).limit(10),
        supabase.from('admin_notes').select('id, note, created_at').eq('entity_type', 'user').eq('entity_id', profile.user_id).order('created_at', { ascending: false }),
      ]);
      setRoles(rolesRes.data || []);
      setAds(adsRes.data || []);
      setReports(reportsRes.data || []);
      setNotes(notesRes.data || []);

      const totalAds = adsRes.data?.length || 0;
      const pendingAds = (adsRes.data || []).filter(a => a.status === 'pending').length;
      const totalReports = reportsRes.data?.length || 0;
      const totalViews = (adsRes.data || []).reduce((sum, a) => sum + (a.views_count || 0), 0);
      setStats({ totalAds, pendingAds, totalReports, totalViews });
    } catch {}
    setLoading(false);
  };

  const handleAddNote = async () => {
    if (!user || !newNote.trim()) return;
    setSavingNote(true);
    try {
      const { data, error } = await supabase.from('admin_notes').insert({
        admin_id: user.id, entity_type: 'user', entity_id: profile.user_id, note: newNote.trim(),
      }).select().single();
      if (error) throw error;
      setNotes(prev => [data, ...prev]);
      setNewNote('');
      toast.success('Note added');
    } catch { toast.error('Failed to add note'); }
    setSavingNote(false);
  };

  const trustScore = ((profile.seller_rating || 0) * 20 + (profile.is_verified ? 20 : 0) + (profile.total_sales || 0 > 10 ? 20 : 0) + (stats.totalReports === 0 ? 20 : 0) + (profile.is_suspended ? 0 : 20));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <div className="flex items-center gap-2">
          {onNavigate && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onNavigate('prev')}><ChevronLeft className="h-4 w-4" /></Button>}
          <h3 className="font-semibold text-sm truncate max-w-[300px]">{profile.full_name || 'Unknown User'}</h3>
          {onNavigate && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onNavigate('next')}><ChevronRight className="h-4 w-4" /></Button>}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="space-y-4"><Skeleton className="h-32 rounded-lg" /><Skeleton className="h-48 rounded-lg" /></div>
        ) : (
          <>
            {/* Profile header */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile.avatar_url || ''} />
                <AvatarFallback className="text-xl">{(profile.full_name || '?')[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-lg truncate">{profile.full_name || 'Unknown'}</p>
                  {profile.is_verified && <ShieldCheck className="h-4 w-4 text-green-500" />}
                  {profile.is_suspended && <Badge variant="destructive" className="text-[10px] gap-1"><Ban className="h-3 w-3" /> Suspended</Badge>}
                </div>
                <p className="text-xs text-muted-foreground font-mono">{profile.user_id.slice(0, 8)}...</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {roles.map(r => <Badge key={r.role} variant="secondary" className="text-[10px] capitalize">{r.role.replace('_', ' ')}</Badge>)}
                </div>
              </div>
            </div>

            {/* Trust score */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium flex items-center gap-2"><Shield className="h-4 w-4" /> Trust Score</span>
                  <span className={`text-2xl font-bold ${trustScore >= 70 ? 'text-green-500' : trustScore >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>{trustScore}/100</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className={`h-2 rounded-full ${trustScore >= 70 ? 'bg-green-500' : trustScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${trustScore}%` }} />
                </div>
              </CardContent>
            </Card>

            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: Package, label: 'Listings', value: stats.totalAds },
                { icon: Clock, label: 'Pending', value: stats.pendingAds },
                { icon: Flag, label: 'Reports', value: stats.totalReports },
                { icon: Eye, label: 'Views', value: stats.totalViews },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="text-center p-2 rounded-lg border">
                    <Icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="font-bold text-sm">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Contact info */}
            <div className="space-y-2 text-sm">
              {profile.phone_number && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {profile.phone_number}</p>}
              {profile.division && <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /> {profile.district}, {profile.division}</p>}
              {profile.last_login_at && <p className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-muted-foreground" /> Last login {formatDistanceToNow(new Date(profile.last_login_at), { addSuffix: true })}</p>}
              {profile.last_login_ip && <p className="flex items-center gap-2 text-xs text-muted-foreground">IP: {profile.last_login_ip}</p>}
              <p className="text-xs text-muted-foreground">Joined {format(new Date(profile.created_at), 'MMM d, yyyy')}</p>
            </div>

            {/* Ratings */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Seller Rating</p>
                <p className="font-bold flex items-center gap-1"><Star className="h-4 w-4 text-yellow-500" /> {profile.seller_rating?.toFixed(1) || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Total Sales</p>
                <p className="font-bold">{profile.total_sales || 0}</p>
              </div>
            </div>

            {/* Tabs: Listings / Reports / Notes */}
            <Tabs defaultValue="listings">
              <TabsList className="w-full">
                <TabsTrigger value="listings" className="flex-1 text-xs gap-1"><Package className="h-3 w-3" /> Listings</TabsTrigger>
                <TabsTrigger value="reports" className="flex-1 text-xs gap-1"><Flag className="h-3 w-3" /> Reports</TabsTrigger>
                <TabsTrigger value="notes" className="flex-1 text-xs gap-1"><StickyNote className="h-3 w-3" /> Notes</TabsTrigger>
              </TabsList>

              <TabsContent value="listings" className="space-y-2 mt-2">
                {ads.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">No listings</p> : ads.map(ad => (
                  <div key={ad.id} className="flex items-center justify-between p-2 rounded border text-xs">
                    <span className="truncate flex-1">{ad.title}</span>
                    <Badge variant="secondary" className="text-[10px] ml-2">{ad.status}</Badge>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="reports" className="space-y-2 mt-2">
                {reports.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">No reports</p> : reports.map(r => (
                  <div key={r.id} className="p-2 rounded border text-xs">
                    <div className="flex items-center justify-between"><span className="font-medium">{r.reason}</span><Badge variant="secondary" className="text-[10px]">{r.status}</Badge></div>
                    <p className="text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</p>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="notes" className="space-y-2 mt-2">
                {notes.map(n => (
                  <div key={n.id} className="text-xs p-2 rounded bg-muted/50">
                    <p>{n.note}</p>
                    <p className="text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                  </div>
                ))}
                <Textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add a private note..." rows={2} className="text-sm" />
                <Button size="sm" onClick={handleAddNote} disabled={savingNote || !newNote.trim()} className="gap-2">
                  {savingNote ? <Loader2 className="h-3 w-3 animate-spin" /> : <StickyNote className="h-3 w-3" />} Add Note
                </Button>
              </TabsContent>
            </Tabs>

            {/* Suspension info */}
            {profile.is_suspended && (
              <Card className="border-red-500/30 bg-red-500/5">
                <CardContent className="p-3">
                  <p className="text-xs font-medium text-red-600 flex items-center gap-1"><Ban className="h-3 w-3" /> Suspended</p>
                  {profile.suspended_reason && <p className="text-sm mt-1">{profile.suspended_reason}</p>}
                  {profile.suspended_at && <p className="text-xs text-muted-foreground mt-1">Since {format(new Date(profile.suspended_at), 'MMM d, yyyy')}</p>}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Action bar */}
      <div className="border-t p-3 shrink-0">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={profile.is_verified ? 'outline' : 'default'} className="gap-1" onClick={() => onAction(profile.is_verified ? 'unverify' : 'verify', profile.user_id)}>
            <ShieldCheck className="h-4 w-4" /> {profile.is_verified ? 'Unverify' : 'Verify'}
          </Button>
          <Button size="sm" variant={profile.is_suspended ? 'outline' : 'destructive'} className="gap-1" onClick={() => onAction(profile.is_suspended ? 'unsuspend' : 'suspend', profile.user_id)}>
            <Ban className="h-4 w-4" /> {profile.is_suspended ? 'Unsuspend' : 'Suspend'}
          </Button>
          <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => onAction('delete', profile.user_id)}>
            <XCircle className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
