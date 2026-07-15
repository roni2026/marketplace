/**
 * SearchAnalytics — Admin page for search analytics, suggestion management,
 * and discovery section configuration.
 */

import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard, StatCardGrid } from '@/components/admin/StatCard';
import { useAuth } from '@/hooks/useAuth';
import { useSearchDiscovery } from '@/hooks/useSearchDiscovery';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search, TrendingUp, AlertCircle, MousePointerClick, BarChart3,
  Plus, Edit, Trash2, Star, Zap, Activity, Hash, Eye, ArrowUp, ArrowDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SearchAnalytics() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const {
    analytics, fetchAnalytics,
    allSuggestions, fetchAllSuggestions, createSuggestion, updateSuggestion, deleteSuggestion,
    allDiscoverySections, fetchAllDiscoverySections, createDiscoverySection, updateDiscoverySection, deleteDiscoverySection,
  } = useSearchDiscovery();

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('analytics');
  const [showSuggestionDialog, setShowSuggestionDialog] = useState(false);
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [editingSuggestion, setEditingSuggestion] = useState<any>(null);
  const [editingSection, setEditingSection] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; name: string } | null>(null);

  const [suggestionForm, setSuggestionForm] = useState({
    term: '', entity_type: 'listing', is_featured: false, is_trending: false, is_active: true,
  });
  const [sectionForm, setSectionForm] = useState({
    title: '', section_type: 'featured', subtitle: '', icon: 'star', is_active: true, sort_order: 0,
  });

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (isAdmin === false) { /* stay on page — AdminRoute already gates access */ return; }
    if (isAdmin) {
      fetchAnalytics().then(() => setIsLoading(false));
    }
  }, [user, isAdmin, navigate, fetchAnalytics]);

  // Load tab data on tab switch
  useEffect(() => {
    if (activeTab === 'suggestions' && allSuggestions.length === 0) {
      fetchAllSuggestions();
    } else if (activeTab === 'discovery' && allDiscoverySections.length === 0) {
      fetchAllDiscoverySections();
    }
  }, [activeTab, allSuggestions.length, allDiscoverySections.length, fetchAllSuggestions, fetchAllDiscoverySections]);

  // Suggestion handlers
  const openSuggestionDialog = (item?: any) => {
    if (item) {
      setEditingSuggestion(item);
      setSuggestionForm({ term: item.term, entity_type: item.entity_type, is_featured: item.is_featured, is_trending: item.is_trending, is_active: item.is_active });
    } else {
      setEditingSuggestion(null);
      setSuggestionForm({ term: '', entity_type: 'listing', is_featured: false, is_trending: false, is_active: true });
    }
    setShowSuggestionDialog(true);
  };

  const handleSaveSuggestion = async () => {
    if (!suggestionForm.term.trim()) { toast.error('Term is required'); return; }
    if (editingSuggestion) {
      await updateSuggestion(editingSuggestion.id, suggestionForm);
    } else {
      await createSuggestion(suggestionForm);
    }
    setShowSuggestionDialog(false);
    fetchAllSuggestions();
  };

  // Section handlers
  const openSectionDialog = (item?: any) => {
    if (item) {
      setEditingSection(item);
      setSectionForm({ title: item.title, section_type: item.section_type, subtitle: item.subtitle || '', icon: item.icon || 'star', is_active: item.is_active, sort_order: item.sort_order });
    } else {
      setEditingSection(null);
      setSectionForm({ title: '', section_type: 'featured', subtitle: '', icon: 'star', is_active: true, sort_order: allDiscoverySections.length + 1 });
    }
    setShowSectionDialog(true);
  };

  const handleSaveSection = async () => {
    if (!sectionForm.title.trim()) { toast.error('Title is required'); return; }
    if (editingSection) {
      await updateDiscoverySection(editingSection.id, { ...sectionForm, subtitle: sectionForm.subtitle || null });
    } else {
      await createDiscoverySection({ ...sectionForm, subtitle: sectionForm.subtitle || null });
    }
    setShowSectionDialog(false);
    fetchAllDiscoverySections();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'suggestion') { await deleteSuggestion(deleteTarget.id); fetchAllSuggestions(); }
    else if (deleteTarget.type === 'section') { await deleteDiscoverySection(deleteTarget.id); fetchAllDiscoverySections(); }
    setDeleteTarget(null);
  };

  const handleReorder = async (section: any, direction: 'up' | 'down') => {
    const newOrder = direction === 'up' ? section.sort_order - 1 : section.sort_order + 1;
    await updateDiscoverySection(section.id, { sort_order: newOrder });
    fetchAllDiscoverySections();
  };

  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-64 w-64" /></div>;
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Search & Discovery"
        description="Monitor search performance, manage suggestions, and configure discovery sections"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Search & Discovery' }]}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="analytics" className="gap-2"><BarChart3 className="h-4 w-4" /> Analytics</TabsTrigger>
          <TabsTrigger value="suggestions" className="gap-2"><Hash className="h-4 w-4" /> Suggestions</TabsTrigger>
          <TabsTrigger value="discovery" className="gap-2"><Eye className="h-4 w-4" /> Discovery</TabsTrigger>
        </TabsList>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {isLoading || !analytics ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
            </div>
          ) : (
            <>
              <StatCardGrid>
                <StatCard title="Total Searches" value={String(analytics.total_searches)} icon={Search} />
                <StatCard title="Unique Terms" value={String(analytics.unique_terms)} icon={Hash} />
                <StatCard title="No-Result Rate" value={`${(analytics.no_result_rate * 100).toFixed(1)}%`} icon={AlertCircle} />
                <StatCard title="Avg Results" value={String(analytics.avg_results_count)} icon={BarChart3} />
                <StatCard title="Click-Through Rate" value={`${(analytics.click_through_rate * 100).toFixed(1)}%`} icon={MousePointerClick} />
              </StatCardGrid>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Searches */}
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Top Searches</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader><TableRow><TableHead>Term</TableHead><TableHead className="text-right">Count</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {analytics.top_searches.map((s, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{s.term}</TableCell>
                            <TableCell className="text-right">{s.count}</TableCell>
                          </TableRow>
                        ))}
                        {analytics.top_searches.length === 0 && (
                          <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">No data</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* No-Result Searches */}
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertCircle className="h-4 w-4" /> No-Result Searches</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader><TableRow><TableHead>Term</TableHead><TableHead className="text-right">Count</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {analytics.no_result_searches.map((s, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium text-destructive">{s.term}</TableCell>
                            <TableCell className="text-right">{s.count}</TableCell>
                          </TableRow>
                        ))}
                        {analytics.no_result_searches.length === 0 && (
                          <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">No no-result searches</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Searches */}
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" /> Recent Search Activity</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-96 overflow-y-auto">
                    {analytics.recent_searches.map((s: any) => (
                      <div key={s.id} className="flex items-center gap-3 px-4 py-2 border-b last:border-0">
                        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{s.search_term}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.results_count} results · {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {s.clicked_result && <Badge variant="default" className="shrink-0">Clicked</Badge>}
                        {!s.has_results && <Badge variant="destructive" className="shrink-0">No results</Badge>}
                      </div>
                    ))}
                    {analytics.recent_searches.length === 0 && (
                      <p className="text-center text-muted-foreground py-6">No recent searches</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Suggestions Tab */}
        <TabsContent value="suggestions" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Manage search suggestions shown in autocomplete</p>
            <Button onClick={() => openSuggestionDialog()} size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add Suggestion</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Term</TableHead><TableHead>Type</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-center">Featured</TableHead>
                      <TableHead className="text-center">Trending</TableHead>
                      <TableHead className="text-center">Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allSuggestions.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.term}</TableCell>
                        <TableCell><Badge variant="outline">{s.entity_type}</Badge></TableCell>
                        <TableCell className="text-right">{s.search_count}</TableCell>
                        <TableCell className="text-center">
                          <Switch checked={s.is_featured} onCheckedChange={v => { updateSuggestion(s.id, { is_featured: v }); fetchAllSuggestions(); }} />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch checked={s.is_trending} onCheckedChange={v => { updateSuggestion(s.id, { is_trending: v }); fetchAllSuggestions(); }} />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch checked={s.is_active} onCheckedChange={v => { updateSuggestion(s.id, { is_active: v }); fetchAllSuggestions(); }} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openSuggestionDialog(s)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ type: 'suggestion', id: s.id, name: s.term })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {allSuggestions.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No suggestions configured</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Discovery Tab */}
        <TabsContent value="discovery" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Configure discovery sections shown on the Discovery page</p>
            <Button onClick={() => openSectionDialog()} size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add Section</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead><TableHead>Type</TableHead>
                      <TableHead>Subtitle</TableHead>
                      <TableHead className="text-center">Active</TableHead>
                      <TableHead className="text-center">Order</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allDiscoverySections.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.title}</TableCell>
                        <TableCell><Badge variant="outline">{s.section_type}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{s.subtitle || '—'}</TableCell>
                        <TableCell className="text-center">
                          <Switch checked={s.is_active} onCheckedChange={v => { updateDiscoverySection(s.id, { is_active: v }); fetchAllDiscoverySections(); }} />
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleReorder(s, 'up')}><ArrowUp className="h-3 w-3" /></Button>
                            <span className="text-sm">{s.sort_order}</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleReorder(s, 'down')}><ArrowDown className="h-3 w-3" /></Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openSectionDialog(s)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ type: 'section', id: s.id, name: s.title })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {allDiscoverySections.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No discovery sections configured</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Suggestion Dialog */}
      <Dialog open={showSuggestionDialog} onOpenChange={setShowSuggestionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingSuggestion ? 'Edit Suggestion' : 'Add Suggestion'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Term *</Label><Input value={suggestionForm.term} onChange={e => setSuggestionForm({ ...suggestionForm, term: e.target.value })} /></div>
            <div>
              <Label>Entity Type</Label>
              <Select value={suggestionForm.entity_type} onValueChange={v => setSuggestionForm({ ...suggestionForm, entity_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="listing">Listing</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="brand">Brand</SelectItem>
                  <SelectItem value="model">Model</SelectItem>
                  <SelectItem value="seller">Seller</SelectItem>
                  <SelectItem value="store">Store</SelectItem>
                  <SelectItem value="tag">Tag</SelectItem>
                  <SelectItem value="location">Location</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2"><Switch checked={suggestionForm.is_featured} onCheckedChange={v => setSuggestionForm({ ...suggestionForm, is_featured: v })} /><Label>Featured</Label></div>
              <div className="flex items-center gap-2"><Switch checked={suggestionForm.is_trending} onCheckedChange={v => setSuggestionForm({ ...suggestionForm, is_trending: v })} /><Label>Trending</Label></div>
              <div className="flex items-center gap-2"><Switch checked={suggestionForm.is_active} onCheckedChange={v => setSuggestionForm({ ...suggestionForm, is_active: v })} /><Label>Active</Label></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuggestionDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveSuggestion}>{editingSuggestion ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Section Dialog */}
      <Dialog open={showSectionDialog} onOpenChange={setShowSectionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingSection ? 'Edit Section' : 'Add Discovery Section'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Title *</Label><Input value={sectionForm.title} onChange={e => setSectionForm({ ...sectionForm, title: e.target.value })} /></div>
            <div>
              <Label>Section Type</Label>
              <Select value={sectionForm.section_type} onValueChange={v => setSectionForm({ ...sectionForm, section_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="trending">Trending</SelectItem>
                  <SelectItem value="new_arrivals">New Arrivals</SelectItem>
                  <SelectItem value="most_viewed">Most Viewed</SelectItem>
                  <SelectItem value="most_favorited">Most Favorited</SelectItem>
                  <SelectItem value="flash_deals">Flash Deals</SelectItem>
                  <SelectItem value="discounted">Discounted</SelectItem>
                  <SelectItem value="recently_updated">Recently Updated</SelectItem>
                  <SelectItem value="staff_picks">Staff Picks</SelectItem>
                  <SelectItem value="editors_picks">Editor's Picks</SelectItem>
                  <SelectItem value="featured_brands">Featured Brands</SelectItem>
                  <SelectItem value="recommended_stores">Recommended Stores</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Subtitle</Label><Input value={sectionForm.subtitle} onChange={e => setSectionForm({ ...sectionForm, subtitle: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Icon</Label><Input value={sectionForm.icon} onChange={e => setSectionForm({ ...sectionForm, icon: e.target.value })} placeholder="star" /></div>
              <div><Label>Sort Order</Label><Input type="number" value={sectionForm.sort_order} onChange={e => setSectionForm({ ...sectionForm, sort_order: parseInt(e.target.value) || 0 })} /></div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={sectionForm.is_active} onCheckedChange={v => setSectionForm({ ...sectionForm, is_active: v })} /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSectionDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveSection}>{editingSection ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
