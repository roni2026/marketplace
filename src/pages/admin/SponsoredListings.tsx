/**
 * SponsoredListings — Admin page for managing sponsored listings.
 */

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard, StatCardGrid } from '@/components/admin/StatCard';
import { useMarketplaceExperience } from '@/hooks/useMarketplaceExperience';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, Edit, Trash2, TrendingUp, MousePointerClick, DollarSign, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { SponsoredListing, SponsoredPlacement } from '@/integrations/supabase/types_v6_marketplace';

export default function SponsoredListings() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { sponsoredListings, fetchAllSponsoredListings, createSponsoredListing, updateSponsoredListing, deleteSponsoredListing } = useMarketplaceExperience();

  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<SponsoredListing | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SponsoredListing | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({
    ad_id: '', sponsor_name: '', placement: 'search_results' as SponsoredPlacement,
    priority: 0, is_active: true, starts_at: '', ends_at: '', budget: 0,
  });

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (isAdmin === false) { /* stay on page — AdminRoute already gates access */ return; }
    if (isAdmin) { fetchAllSponsoredListings().then(() => setIsLoading(false)); }
  }, [user, isAdmin, navigate, fetchAllSponsoredListings]);

  const searchAds = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) { setSearchResults([]); return; }
    const { data } = await supabase
      .from('ads')
      .select('id, title, slug')
      .or(`title.ilike.%${query}%,slug.ilike.%${query}%`)
      .limit(10);
    setSearchResults(data || []);
  };

  const openDialog = (item?: SponsoredListing) => {
    if (item) {
      setEditingItem(item);
      setForm({
        ad_id: item.ad_id, sponsor_name: item.sponsor_name || '',
        placement: item.placement, priority: item.priority,
        is_active: item.is_active,
        starts_at: item.starts_at ? item.starts_at.slice(0, 16) : '',
        ends_at: item.ends_at ? item.ends_at.slice(0, 16) : '',
        budget: item.budget,
      });
    } else {
      setEditingItem(null);
      setForm({ ad_id: '', sponsor_name: '', placement: 'search_results', priority: 0, is_active: true, starts_at: '', ends_at: '', budget: 0 });
    }
    setSearchResults([]);
    setSearchQuery('');
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.ad_id) { toast.error('Please select a listing'); return; }
    const payload = {
      ad_id: form.ad_id,
      sponsor_name: form.sponsor_name || null,
      placement: form.placement,
      priority: form.priority,
      is_active: form.is_active,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : new Date().toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      budget: form.budget,
    };
    if (editingItem) {
      await updateSponsoredListing(editingItem.id, payload);
    } else {
      await createSponsoredListing(payload);
    }
    setShowDialog(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteSponsoredListing(deleteTarget.id);
    setDeleteTarget(null);
  };

  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-64 w-64" /></div>;
  }

  const activeCount = sponsoredListings.filter(s => s.is_active).length;
  const totalImpressions = sponsoredListings.reduce((sum, s) => sum + s.impressions, 0);
  const totalClicks = sponsoredListings.reduce((sum, s) => sum + s.clicks, 0);
  const totalBudget = sponsoredListings.reduce((sum, s) => sum + s.budget, 0);

  return (
    <AdminLayout>
      <PageHeader
        title="Sponsored Listings"
        description="Manage sponsored listing placements across the marketplace"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Sponsored Listings' }]}
      />

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : (
        <>
          <StatCardGrid>
            <StatCard title="Active Sponsored" value={String(activeCount)} icon={TrendingUp} />
            <StatCard title="Total Impressions" value={String(totalImpressions)} icon={Eye} />
            <StatCard title="Total Clicks" value={String(totalClicks)} icon={MousePointerClick} />
            <StatCard title="Total Budget" value={`৳${totalBudget}`} icon={DollarSign} />
          </StatCardGrid>

          <div className="flex justify-end mb-4">
            <Button onClick={() => openDialog()} size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add Sponsored</Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Listing</TableHead><TableHead>Sponsor</TableHead><TableHead>Placement</TableHead>
                      <TableHead className="text-center">Priority</TableHead><TableHead className="text-center">Active</TableHead>
                      <TableHead>Start Date</TableHead><TableHead>End Date</TableHead>
                      <TableHead className="text-right">Impressions</TableHead><TableHead className="text-right">Clicks</TableHead>
                      <TableHead className="text-right">Budget</TableHead><TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sponsoredListings.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium text-xs">{s.ad_id.slice(0, 8)}...</TableCell>
                        <TableCell className="text-sm">{s.sponsor_name || '—'}</TableCell>
                        <TableCell><Badge variant="outline">{s.placement}</Badge></TableCell>
                        <TableCell className="text-center">{s.priority}</TableCell>
                        <TableCell className="text-center"><Switch checked={s.is_active} onCheckedChange={v => updateSponsoredListing(s.id, { is_active: v })} /></TableCell>
                        <TableCell className="text-xs">{format(new Date(s.starts_at), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="text-xs">{s.ends_at ? format(new Date(s.ends_at), 'MMM d, yyyy') : '—'}</TableCell>
                        <TableCell className="text-right">{s.impressions}</TableCell>
                        <TableCell className="text-right">{s.clicks}</TableCell>
                        <TableCell className="text-right">৳{s.budget}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openDialog(s)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(s)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {sponsoredListings.length === 0 && (
                      <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">No sponsored listings configured</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingItem ? 'Edit Sponsored Listing' : 'Add Sponsored Listing'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Listing *</Label>
              <Input value={searchQuery} onChange={e => searchAds(e.target.value)} placeholder="Search by title or slug..." className="mt-1" />
              {searchResults.length > 0 && (
                <div className="mt-1 border rounded-lg max-h-40 overflow-y-auto">
                  {searchResults.map(ad => (
                    <button key={ad.id} onClick={() => { setForm({ ...form, ad_id: ad.id }); setSearchQuery(ad.title); setSearchResults([]); }} className="w-full text-left px-3 py-2 hover:bg-accent text-sm">
                      {ad.title}
                    </button>
                  ))}
                </div>
              )}
              {form.ad_id && <p className="text-xs text-green-600 mt-1">Selected: {form.ad_id.slice(0, 8)}...</p>}
            </div>
            <div><Label>Sponsor Name</Label><Input value={form.sponsor_name} onChange={e => setForm({ ...form, sponsor_name: e.target.value })} placeholder="Optional" className="mt-1" /></div>
            <div>
              <Label>Placement</Label>
              <Select value={form.placement} onValueChange={v => setForm({ ...form, placement: v as SponsoredPlacement })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="search_results">Search Results</SelectItem>
                  <SelectItem value="category_page">Category Page</SelectItem>
                  <SelectItem value="homepage">Homepage</SelectItem>
                  <SelectItem value="discovery">Discovery</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Priority</Label><Input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 0 })} className="mt-1" /></div>
              <div><Label>Budget</Label><Input type="number" value={form.budget} onChange={e => setForm({ ...form, budget: parseFloat(e.target.value) || 0 })} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start Date</Label><Input type="datetime-local" value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} className="mt-1" /></div>
              <div><Label>End Date</Label><Input type="datetime-local" value={form.ends_at} onChange={e => setForm({ ...form, ends_at: e.target.value })} className="mt-1" /></div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingItem ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this sponsored listing?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
