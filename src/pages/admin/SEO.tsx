import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { toast } from 'sonner';
import {
  getSEOSettings,
  getAllSEOSettings,
  updateSEOSettings,
  generateSitemap,
  generateRobotsTxt,
  getRedirects,
  createRedirect,
  deleteRedirect,
  generateCanonicalUrl,
  generateOpenGraph,
  generateTwitterCards,
  generateStructuredData,
  generateFriendlyUrl,
  getSitemapEntries,
} from '@/lib/seo';
import type { SEOSettings, Redirect, SitemapEntry } from '@/integrations/supabase/types_v2_cms';
import { Search, Globe, Link2, FileCode, Tag, Trash2, Plus, Copy, Download } from 'lucide-react';
import { format } from 'date-fns';

export default function SEOPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [seoSettings, setSeoSettings] = useState<SEOSettings[]>([]);
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [sitemapEntries, setSitemapEntries] = useState<SitemapEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sitemapXml, setSitemapXml] = useState('');
  const [robotsContent, setRobotsContent] = useState('');

  // Dialog states
  const [showSeoDialog, setShowSeoDialog] = useState(false);
  const [showRedirectDialog, setShowRedirectDialog] = useState(false);
  const [editingUrl, setEditingUrl] = useState<string | null>(null);

  // Form states
  const [seoForm, setSeoForm] = useState({
    page_url: '',
    meta_title: '',
    meta_description: '',
    og_title: '',
    og_description: '',
    og_image: '',
    twitter_card: 'summary_large_image',
    canonical_url: '',
    structured_data: '',
  });
  const [redirectForm, setRedirectForm] = useState({ from_url: '', to_url: '', status_code: 301 });

  // Preview states
  const [ogPreview, setOgPreview] = useState<string[]>([]);
  const [twitterPreview, setTwitterPreview] = useState<string[]>([]);
  const [structuredDataPreview, setStructuredDataPreview] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (isAdmin === false) { /* stay on page — AdminRoute already gates access */ return; }
  }, [user, isAdmin, navigate]);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    const [settings, redirs, entries] = await Promise.all([
      getAllSEOSettings(),
      getRedirects(),
      getSitemapEntries(),
    ]);
    setSeoSettings(settings);
    setRedirects(redirs);
    setSitemapEntries(entries);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchAll();
      generateSitemap().then(setSitemapXml);
      generateRobotsTxt().then(setRobotsContent);
    }
  }, [isAdmin, fetchAll]);

  // SEO handlers
  const handleSeoSave = async () => {
    if (!seoForm.page_url) {
      toast.error('Page URL is required');
      return;
    }
    const structuredData = seoForm.structured_data
      ? (() => { try { return JSON.parse(seoForm.structured_data); } catch { return {}; } })()
      : {};

    await updateSEOSettings(seoForm.page_url, {
      meta_title: seoForm.meta_title || null,
      meta_description: seoForm.meta_description || null,
      og_title: seoForm.og_title || null,
      og_description: seoForm.og_description || null,
      og_image: seoForm.og_image || null,
      twitter_card: seoForm.twitter_card,
      canonical_url: seoForm.canonical_url || null,
      structured_data: structuredData,
    });
    toast.success('SEO settings saved');
    setShowSeoDialog(false);
    setEditingUrl(null);
    fetchAll();
  };

  const handleEditSeo = (settings: SEOSettings) => {
    setEditingUrl(settings.page_url);
    setSeoForm({
      page_url: settings.page_url,
      meta_title: settings.meta_title || '',
      meta_description: settings.meta_description || '',
      og_title: settings.og_title || '',
      og_description: settings.og_description || '',
      og_image: settings.og_image || '',
      twitter_card: settings.twitter_card || 'summary_large_image',
      canonical_url: settings.canonical_url || '',
      structured_data: settings.structured_data ? JSON.stringify(settings.structured_data, null, 2) : '',
    });
    setShowSeoDialog(true);
  };

  // Redirect handlers
  const handleRedirectSave = async () => {
    if (!redirectForm.from_url || !redirectForm.to_url) {
      toast.error('From URL and To URL are required');
      return;
    }
    await createRedirect(redirectForm.from_url, redirectForm.to_url, redirectForm.status_code);
    toast.success('Redirect created');
    setShowRedirectDialog(false);
    setRedirectForm({ from_url: '', to_url: '', status_code: 301 });
    fetchAll();
  };

  const handleDeleteRedirect = async (id: string) => {
    await deleteRedirect(id);
    toast.success('Redirect deleted');
    fetchAll();
  };

  // Preview generators
  const generatePreviews = () => {
    if (seoForm.og_title || seoForm.og_description) {
      setOgPreview(generateOpenGraph({
        title: seoForm.og_title || seoForm.meta_title || '',
        description: seoForm.og_description || seoForm.meta_description || '',
        image: seoForm.og_image || undefined,
        url: seoForm.canonical_url || undefined,
      }));
    }
    if (seoForm.og_title || seoForm.meta_title) {
      setTwitterPreview(generateTwitterCards({
        title: seoForm.og_title || seoForm.meta_title || '',
        description: seoForm.og_description || seoForm.meta_description || '',
        image: seoForm.og_image || undefined,
        card: seoForm.twitter_card,
      }));
    }
    setStructuredDataPreview(generateStructuredData('WebPage', {
      name: seoForm.meta_title || '',
      description: seoForm.meta_description || '',
      url: seoForm.canonical_url || '',
    }));
  };

  const handleCopySitemap = () => {
    navigator.clipboard.writeText(sitemapXml);
    toast.success('Sitemap XML copied to clipboard');
  };

  const handleCopyRobots = () => {
    navigator.clipboard.writeText(robotsContent);
    toast.success('robots.txt copied to clipboard');
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Search className="h-6 w-6" />
          SEO Management
        </h1>

        <Tabs defaultValue="meta">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="meta" className="gap-1">
              <Tag className="h-4 w-4" /> Meta Tags
            </TabsTrigger>
            <TabsTrigger value="redirects" className="gap-1">
              <Link2 className="h-4 w-4" /> Redirects
            </TabsTrigger>
            <TabsTrigger value="sitemap" className="gap-1">
              <Globe className="h-4 w-4" /> Sitemap
            </TabsTrigger>
            <TabsTrigger value="robots" className="gap-1">
              <FileCode className="h-4 w-4" /> robots.txt
            </TabsTrigger>
            <TabsTrigger value="og" className="gap-1">
              <FileCode className="h-4 w-4" /> Open Graph
            </TabsTrigger>
          </TabsList>

          {/* Meta Tags Tab */}
          <TabsContent value="meta" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => {
                setEditingUrl(null);
                setSeoForm({ page_url: '', meta_title: '', meta_description: '', og_title: '', og_description: '', og_image: '', twitter_card: 'summary_large_image', canonical_url: '', structured_data: '' });
                setShowSeoDialog(true);
              }} className="gap-2">
                <Plus className="h-4 w-4" /> Add Page SEO
              </Button>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page URL</TableHead>
                    <TableHead>Meta Title</TableHead>
                    <TableHead>Canonical</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {seoSettings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No SEO settings configured</TableCell>
                    </TableRow>
                  ) : (
                    seoSettings.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.page_url}</TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">{s.meta_title || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{s.canonical_url || '—'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEditSeo(s)}>
                            <Tag className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Redirects Tab */}
          <TabsContent value="redirects" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setRedirectForm({ from_url: '', to_url: '', status_code: 301 }); setShowRedirectDialog(true); }} className="gap-2">
                <Plus className="h-4 w-4" /> Add Redirect
              </Button>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From URL</TableHead>
                    <TableHead>To URL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {redirects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No redirects configured</TableCell>
                    </TableRow>
                  ) : (
                    redirects.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.from_url}</TableCell>
                        <TableCell className="text-muted-foreground">{r.to_url}</TableCell>
                        <TableCell><Badge variant="secondary">{r.status_code}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{format(new Date(r.created_at), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteRedirect(r.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Sitemap Tab */}
          <TabsContent value="sitemap" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Sitemap XML</CardTitle>
                <Button size="sm" variant="outline" onClick={handleCopySitemap} className="gap-1">
                  <Copy className="h-4 w-4" /> Copy
                </Button>
              </CardHeader>
              <CardContent>
                <Textarea readOnly rows={12} value={sitemapXml} className="font-mono text-xs" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Sitemap Entries ({sitemapEntries.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>URL</TableHead>
                        <TableHead>Last Modified</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Priority</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sitemapEntries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-4">No sitemap entries</TableCell>
                        </TableRow>
                      ) : (
                        sitemapEntries.slice(0, 20).map((e) => (
                          <TableRow key={e.id}>
                            <TableCell className="font-medium max-w-xs truncate">{e.url}</TableCell>
                            <TableCell className="text-muted-foreground">{format(new Date(e.last_modified), 'MMM d, yyyy')}</TableCell>
                            <TableCell><Badge variant="secondary">{e.change_frequency}</Badge></TableCell>
                            <TableCell>{e.priority}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* robots.txt Tab */}
          <TabsContent value="robots" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>robots.txt</CardTitle>
                <Button size="sm" variant="outline" onClick={handleCopyRobots} className="gap-1">
                  <Copy className="h-4 w-4" /> Copy
                </Button>
              </CardHeader>
              <CardContent>
                <Textarea
                  rows={10}
                  value={robotsContent}
                  onChange={(e) => setRobotsContent(e.target.value)}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Open Graph Tab */}
          <TabsContent value="og" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Open Graph & Twitter Card Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Open Graph Tags</Label>
                  <Textarea readOnly rows={6} value={ogPreview.join('\n')} className="font-mono text-xs" placeholder="Fill in SEO settings to generate OG tags" />
                </div>
                <div className="space-y-2">
                  <Label>Twitter Card Tags</Label>
                  <Textarea readOnly rows={6} value={twitterPreview.join('\n')} className="font-mono text-xs" placeholder="Fill in SEO settings to generate Twitter card tags" />
                </div>
                <div className="space-y-2">
                  <Label>Structured Data (Schema.org)</Label>
                  <Textarea readOnly rows={8} value={structuredDataPreview} className="font-mono text-xs" placeholder="Fill in SEO settings to generate structured data" />
                </div>
                <Button onClick={generatePreviews} variant="outline" className="gap-2">
                  <FileCode className="h-4 w-4" /> Generate Previews from Current Form
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* SEO Dialog */}
        <Dialog open={showSeoDialog} onOpenChange={setShowSeoDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingUrl ? 'Edit SEO Settings' : 'Add SEO Settings'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seo-url">Page URL</Label>
                <Input id="seo-url" value={seoForm.page_url} onChange={(e) => setSeoForm({ ...seoForm, page_url: e.target.value })} placeholder="/category/electronics" disabled={!!editingUrl} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="seo-meta-title">Meta Title</Label>
                  <Input id="seo-meta-title" value={seoForm.meta_title} onChange={(e) => setSeoForm({ ...seoForm, meta_title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seo-canonical">Canonical URL</Label>
                  <Input id="seo-canonical" value={seoForm.canonical_url} onChange={(e) => setSeoForm({ ...seoForm, canonical_url: e.target.value })} placeholder="https://..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="seo-meta-desc">Meta Description</Label>
                <Textarea id="seo-meta-desc" rows={2} value={seoForm.meta_description} onChange={(e) => setSeoForm({ ...seoForm, meta_description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="seo-og-title">OG Title</Label>
                  <Input id="seo-og-title" value={seoForm.og_title} onChange={(e) => setSeoForm({ ...seoForm, og_title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seo-og-desc">OG Description</Label>
                  <Input id="seo-og-desc" value={seoForm.og_description} onChange={(e) => setSeoForm({ ...seoForm, og_description: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="seo-og-image">OG Image URL</Label>
                  <Input id="seo-og-image" value={seoForm.og_image} onChange={(e) => setSeoForm({ ...seoForm, og_image: e.target.value })} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label>Twitter Card Type</Label>
                  <Select value={seoForm.twitter_card} onValueChange={(v) => setSeoForm({ ...seoForm, twitter_card: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="summary">summary</SelectItem>
                      <SelectItem value="summary_large_image">summary_large_image</SelectItem>
                      <SelectItem value="app">app</SelectItem>
                      <SelectItem value="player">player</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="seo-structured">Structured Data (JSON)</Label>
                <Textarea id="seo-structured" rows={5} value={seoForm.structured_data} onChange={(e) => setSeoForm({ ...seoForm, structured_data: e.target.value })} placeholder='{"@type":"WebPage",...}' className="font-mono text-xs" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSeoDialog(false)}>Cancel</Button>
              <Button onClick={handleSeoSave}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Redirect Dialog */}
        <Dialog open={showRedirectDialog} onOpenChange={setShowRedirectDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Redirect</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="redirect-from">From URL</Label>
                <Input id="redirect-from" value={redirectForm.from_url} onChange={(e) => setRedirectForm({ ...redirectForm, from_url: e.target.value })} placeholder="/old-page" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="redirect-to">To URL</Label>
                <Input id="redirect-to" value={redirectForm.to_url} onChange={(e) => setRedirectForm({ ...redirectForm, to_url: e.target.value })} placeholder="/new-page" />
              </div>
              <div className="space-y-2">
                <Label>Status Code</Label>
                <Select value={String(redirectForm.status_code)} onValueChange={(v) => setRedirectForm({ ...redirectForm, status_code: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="301">301 (Permanent)</SelectItem>
                    <SelectItem value="302">302 (Temporary)</SelectItem>
                    <SelectItem value="307">307 (Temporary, preserve method)</SelectItem>
                    <SelectItem value="308">308 (Permanent, preserve method)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRedirectDialog(false)}>Cancel</Button>
              <Button onClick={handleRedirectSave}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
