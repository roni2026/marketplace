import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useCMS } from '@/hooks/useCMS';
import { toast } from 'sonner';
import { getTermsVersions, getPrivacyVersions, createTermsVersion, createPrivacyVersion } from '@/lib/cms';
import { generateSlug } from '@/lib/constants';
import {
  Image as ImageIcon,
  Layout,
  FileText,
  HelpCircle,
  Newspaper,
  FileCode,
  ScrollText,
  Plus,
  Edit,
  Trash2,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react';
import { format } from 'date-fns';
import type {
  Banner,
  FAQEntry,
  BlogPost,
  StaticPage,
  TermsVersion,
  PrivacyVersion,
} from '@/integrations/supabase/types_v2_cms';

export default function CMSPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const {
    banners,
    homepageSections,
    landingPages,
    faqEntries,
    blogPosts,
    staticPages,
    isLoading,
    addBanner,
    editBanner,
    removeBanner,
    editHomepageSection,
    addLandingPage,
    addFAQEntry,
    editFAQEntry,
    removeFAQEntry,
    addBlogPost,
    editBlogPost,
    removeBlogPost,
    addStaticPage,
    editStaticPage,
    removeStaticPage,
  } = useCMS();

  const [termsVersions, setTermsVersions] = useState<TermsVersion[]>([]);
  const [privacyVersions, setPrivacyVersions] = useState<PrivacyVersion[]>([]);

  // Dialog states
  const [showBannerDialog, setShowBannerDialog] = useState(false);
  const [showLandingDialog, setShowLandingDialog] = useState(false);
  const [showFAQDialog, setShowFAQDialog] = useState(false);
  const [showBlogDialog, setShowBlogDialog] = useState(false);
  const [showPageDialog, setShowPageDialog] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);

  // Form states
  const [bannerForm, setBannerForm] = useState({ title: '', image_url: '', link_url: '', position: 'top', start_date: '', end_date: '', is_active: true, sort_order: 0 });
  const [landingForm, setLandingForm] = useState({ slug: '', title: '', meta_title: '', meta_description: '', is_published: false });
  const [faqForm, setFaqForm] = useState({ question: '', answer: '', category: '', sort_order: 0, is_active: true });
  const [blogForm, setBlogForm] = useState({ title: '', slug: '', body: '', featured_image: '', status: 'draft' as 'draft' | 'published' | 'archived' });
  const [pageForm, setPageForm] = useState({ slug: '', title: '', is_published: false });
  const [termsForm, setTermsForm] = useState({ version: '', content: '', effective_date: '', is_active: false });
  const [privacyForm, setPrivacyForm] = useState({ version: '', content: '', effective_date: '', is_active: false });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (isAdmin === false) {
      navigate('/');
      return;
    }
  }, [user, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      getTermsVersions().then(setTermsVersions);
      getPrivacyVersions().then(setPrivacyVersions);
    }
  }, [isAdmin]);

  // Banner handlers
  const handleBannerSave = async () => {
    if (!bannerForm.title) {
      toast.error('Title is required');
      return;
    }
    const data = {
      title: bannerForm.title,
      image_url: bannerForm.image_url || null,
      link_url: bannerForm.link_url || null,
      position: bannerForm.position,
      start_date: bannerForm.start_date || null,
      end_date: bannerForm.end_date || null,
      is_active: bannerForm.is_active,
      sort_order: bannerForm.sort_order,
    };
    if (editingItem) {
      await editBanner(editingItem, data);
      toast.success('Banner updated');
    } else {
      await addBanner(data);
      toast.success('Banner created');
    }
    setShowBannerDialog(false);
    setEditingItem(null);
    setBannerForm({ title: '', image_url: '', link_url: '', position: 'top', start_date: '', end_date: '', is_active: true, sort_order: 0 });
  };

  // Landing page handlers
  const handleLandingSave = async () => {
    if (!landingForm.title || !landingForm.slug) {
      toast.error('Title and slug are required');
      return;
    }
    await addLandingPage({
      slug: landingForm.slug,
      title: landingForm.title,
      meta_title: landingForm.meta_title || null,
      meta_description: landingForm.meta_description || null,
      is_published: landingForm.is_published,
    });
    toast.success('Landing page created');
    setShowLandingDialog(false);
    setLandingForm({ slug: '', title: '', meta_title: '', meta_description: '', is_published: false });
  };

  // FAQ handlers
  const handleFAQSave = async () => {
    if (!faqForm.question || !faqForm.answer) {
      toast.error('Question and answer are required');
      return;
    }
    const data = {
      question: faqForm.question,
      answer: faqForm.answer,
      category: faqForm.category || null,
      sort_order: faqForm.sort_order,
      is_active: faqForm.is_active,
    };
    if (editingItem) {
      await editFAQEntry(editingItem, data);
      toast.success('FAQ entry updated');
    } else {
      await addFAQEntry(data);
      toast.success('FAQ entry created');
    }
    setShowFAQDialog(false);
    setEditingItem(null);
    setFaqForm({ question: '', answer: '', category: '', sort_order: 0, is_active: true });
  };

  // Blog handlers
  const handleBlogSave = async () => {
    if (!blogForm.title || !blogForm.slug) {
      toast.error('Title and slug are required');
      return;
    }
    const data = {
      title: blogForm.title,
      slug: blogForm.slug,
      body: blogForm.body || null,
      featured_image: blogForm.featured_image || null,
      status: blogForm.status,
      published_at: blogForm.status === 'published' ? new Date().toISOString() : null,
    };
    if (editingItem) {
      await editBlogPost(editingItem, data);
      toast.success('Blog post updated');
    } else {
      await addBlogPost(data);
      toast.success('Blog post created');
    }
    setShowBlogDialog(false);
    setEditingItem(null);
    setBlogForm({ title: '', slug: '', body: '', featured_image: '', status: 'draft' });
  };

  // Static page handlers
  const handlePageSave = async () => {
    if (!pageForm.title || !pageForm.slug) {
      toast.error('Title and slug are required');
      return;
    }
    const data = {
      slug: pageForm.slug,
      title: pageForm.title,
      is_published: pageForm.is_published,
    };
    if (editingItem) {
      await editStaticPage(editingItem, data);
      toast.success('Static page updated');
    } else {
      await addStaticPage(data);
      toast.success('Static page created');
    }
    setShowPageDialog(false);
    setEditingItem(null);
    setPageForm({ slug: '', title: '', is_published: false });
  };

  // Terms handlers
  const handleTermsSave = async () => {
    if (!termsForm.version || !termsForm.content || !termsForm.effective_date) {
      toast.error('All fields are required');
      return;
    }
    await createTermsVersion({
      version: termsForm.version,
      content: termsForm.content,
      effective_date: termsForm.effective_date,
      is_active: termsForm.is_active,
    });
    toast.success('Terms version created');
    setShowTermsDialog(false);
    setTermsForm({ version: '', content: '', effective_date: '', is_active: false });
    getTermsVersions().then(setTermsVersions);
  };

  // Privacy handlers
  const handlePrivacySave = async () => {
    if (!privacyForm.version || !privacyForm.content || !privacyForm.effective_date) {
      toast.error('All fields are required');
      return;
    }
    await createPrivacyVersion({
      version: privacyForm.version,
      content: privacyForm.content,
      effective_date: privacyForm.effective_date,
      is_active: privacyForm.is_active,
    });
    toast.success('Privacy version created');
    setShowPrivacyDialog(false);
    setPrivacyForm({ version: '', content: '', effective_date: '', is_active: false });
    getPrivacyVersions().then(setPrivacyVersions);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layout className="h-6 w-6" />
            Content Management
          </h1>
        </div>

        <Tabs defaultValue="banners">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="banners" className="gap-1">
              <ImageIcon className="h-4 w-4" /> Banners
            </TabsTrigger>
            <TabsTrigger value="homepage" className="gap-1">
              <Layout className="h-4 w-4" /> Homepage
            </TabsTrigger>
            <TabsTrigger value="landing" className="gap-1">
              <FileText className="h-4 w-4" /> Landing Pages
            </TabsTrigger>
            <TabsTrigger value="faq" className="gap-1">
              <HelpCircle className="h-4 w-4" /> FAQ
            </TabsTrigger>
            <TabsTrigger value="blog" className="gap-1">
              <Newspaper className="h-4 w-4" /> Blog
            </TabsTrigger>
            <TabsTrigger value="pages" className="gap-1">
              <FileCode className="h-4 w-4" /> Pages
            </TabsTrigger>
            <TabsTrigger value="legal" className="gap-1">
              <ScrollText className="h-4 w-4" /> Legal
            </TabsTrigger>
          </TabsList>

          {/* Banners Tab */}
          <TabsContent value="banners" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setEditingItem(null); setBannerForm({ title: '', image_url: '', link_url: '', position: 'top', start_date: '', end_date: '', is_active: true, sort_order: 0 }); setShowBannerDialog(true); }} className="gap-2">
                <Plus className="h-4 w-4" /> Add Banner
              </Button>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Sort</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {banners.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No banners yet</TableCell>
                    </TableRow>
                  ) : (
                    banners.map((banner) => (
                      <TableRow key={banner.id}>
                        <TableCell className="font-medium">{banner.title}</TableCell>
                        <TableCell><Badge variant="secondary">{banner.position}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={banner.is_active ? 'default' : 'outline'}>
                            {banner.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>{banner.sort_order}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => {
                            setEditingItem(banner.id);
                            setBannerForm({
                              title: banner.title,
                              image_url: banner.image_url || '',
                              link_url: banner.link_url || '',
                              position: banner.position,
                              start_date: banner.start_date ? format(new Date(banner.start_date), "yyyy-MM-dd'T'HH:mm") : '',
                              end_date: banner.end_date ? format(new Date(banner.end_date), "yyyy-MM-dd'T'HH:mm") : '',
                              is_active: banner.is_active,
                              sort_order: banner.sort_order,
                            });
                            setShowBannerDialog(true);
                          }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={async () => {
                            await removeBanner(banner.id);
                            toast.success('Banner deleted');
                          }}>
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

          {/* Homepage Sections Tab */}
          <TabsContent value="homepage" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Homepage Sections</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {homepageSections.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No homepage sections configured</p>
                ) : (
                  homepageSections.map((section) => (
                    <div key={section.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-1">
                        <p className="font-medium">{section.title}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{section.component_type}</Badge>
                          <Badge variant={section.is_active ? 'default' : 'outline'}>
                            {section.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <span className="text-sm text-muted-foreground">Order: {section.sort_order}</span>
                        </div>
                      </div>
                      <Switch
                        checked={section.is_active}
                        onCheckedChange={(checked) => {
                          editHomepageSection(section.id, { is_active: checked });
                        }}
                      />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Landing Pages Tab */}
          <TabsContent value="landing" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setLandingForm({ slug: '', title: '', meta_title: '', meta_description: '', is_published: false }); setShowLandingDialog(true); }} className="gap-2">
                <Plus className="h-4 w-4" /> Add Landing Page
              </Button>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {landingPages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No landing pages yet</TableCell>
                    </TableRow>
                  ) : (
                    landingPages.map((page) => (
                      <TableRow key={page.id}>
                        <TableCell className="font-medium">{page.title}</TableCell>
                        <TableCell className="text-muted-foreground">/{page.slug}</TableCell>
                        <TableCell>
                          <Badge variant={page.is_published ? 'default' : 'outline'}>
                            {page.is_published ? 'Published' : 'Draft'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{format(new Date(page.created_at), 'MMM d, yyyy')}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* FAQ Tab */}
          <TabsContent value="faq" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setEditingItem(null); setFaqForm({ question: '', answer: '', category: '', sort_order: 0, is_active: true }); setShowFAQDialog(true); }} className="gap-2">
                <Plus className="h-4 w-4" /> Add FAQ
              </Button>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faqEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No FAQ entries yet</TableCell>
                    </TableRow>
                  ) : (
                    faqEntries.map((faq) => (
                      <TableRow key={faq.id}>
                        <TableCell className="font-medium max-w-md truncate">{faq.question}</TableCell>
                        <TableCell>{faq.category || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={faq.is_active ? 'default' : 'outline'}>
                            {faq.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => {
                            setEditingItem(faq.id);
                            setFaqForm({
                              question: faq.question,
                              answer: faq.answer,
                              category: faq.category || '',
                              sort_order: faq.sort_order,
                              is_active: faq.is_active,
                            });
                            setShowFAQDialog(true);
                          }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={async () => {
                            await removeFAQEntry(faq.id);
                            toast.success('FAQ entry deleted');
                          }}>
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

          {/* Blog Tab */}
          <TabsContent value="blog" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setEditingItem(null); setBlogForm({ title: '', slug: '', body: '', featured_image: '', status: 'draft' }); setShowBlogDialog(true); }} className="gap-2">
                <Plus className="h-4 w-4" /> Add Blog Post
              </Button>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blogPosts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No blog posts yet</TableCell>
                    </TableRow>
                  ) : (
                    blogPosts.map((post) => (
                      <TableRow key={post.id}>
                        <TableCell className="font-medium max-w-xs truncate">{post.title}</TableCell>
                        <TableCell className="text-muted-foreground">{post.profiles?.full_name || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={post.status === 'published' ? 'default' : post.status === 'archived' ? 'outline' : 'secondary'}>
                            {post.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {post.published_at ? format(new Date(post.published_at), 'MMM d, yyyy') : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => {
                            setEditingItem(post.id);
                            setBlogForm({
                              title: post.title,
                              slug: post.slug,
                              body: post.body || '',
                              featured_image: post.featured_image || '',
                              status: post.status,
                            });
                            setShowBlogDialog(true);
                          }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={async () => {
                            await removeBlogPost(post.id);
                            toast.success('Blog post deleted');
                          }}>
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

          {/* Static Pages Tab */}
          <TabsContent value="pages" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setEditingItem(null); setPageForm({ slug: '', title: '', is_published: false }); setShowPageDialog(true); }} className="gap-2">
                <Plus className="h-4 w-4" /> Add Page
              </Button>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staticPages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No static pages yet</TableCell>
                    </TableRow>
                  ) : (
                    staticPages.map((page) => (
                      <TableRow key={page.id}>
                        <TableCell className="font-medium">{page.title}</TableCell>
                        <TableCell className="text-muted-foreground">/{page.slug}</TableCell>
                        <TableCell>
                          <Badge variant={page.is_published ? 'default' : 'outline'}>
                            {page.is_published ? 'Published' : 'Draft'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => {
                            setEditingItem(page.id);
                            setPageForm({
                              slug: page.slug,
                              title: page.title,
                              is_published: page.is_published,
                            });
                            setShowPageDialog(true);
                          }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={async () => {
                            await removeStaticPage(page.id);
                            toast.success('Page deleted');
                          }}>
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

          {/* Legal Tab */}
          <TabsContent value="legal" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Terms of Service</CardTitle>
                  <Button size="sm" onClick={() => { setTermsForm({ version: '', content: '', effective_date: '', is_active: false }); setShowTermsDialog(true); }} className="gap-1">
                    <Plus className="h-4 w-4" /> New Version
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {termsVersions.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No terms versions yet</p>
                  ) : (
                    termsVersions.map((v) => (
                      <div key={v.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="font-medium">v{v.version}</p>
                          <p className="text-sm text-muted-foreground">Effective: {format(new Date(v.effective_date), 'MMM d, yyyy')}</p>
                        </div>
                        <Badge variant={v.is_active ? 'default' : 'outline'}>
                          {v.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Privacy Policy</CardTitle>
                  <Button size="sm" onClick={() => { setPrivacyForm({ version: '', content: '', effective_date: '', is_active: false }); setShowPrivacyDialog(true); }} className="gap-1">
                    <Plus className="h-4 w-4" /> New Version
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {privacyVersions.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No privacy versions yet</p>
                  ) : (
                    privacyVersions.map((v) => (
                      <div key={v.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="font-medium">v{v.version}</p>
                          <p className="text-sm text-muted-foreground">Effective: {format(new Date(v.effective_date), 'MMM d, yyyy')}</p>
                        </div>
                        <Badge variant={v.is_active ? 'default' : 'outline'}>
                          {v.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Banner Dialog */}
        <Dialog open={showBannerDialog} onOpenChange={setShowBannerDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Banner' : 'Add Banner'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="banner-title">Title</Label>
                <Input id="banner-title" value={bannerForm.title} onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="banner-image">Image URL</Label>
                <Input id="banner-image" value={bannerForm.image_url} onChange={(e) => setBannerForm({ ...bannerForm, image_url: e.target.value })} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="banner-link">Link URL</Label>
                <Input id="banner-link" value={bannerForm.link_url} onChange={(e) => setBannerForm({ ...bannerForm, link_url: e.target.value })} placeholder="https://..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Position</Label>
                  <Select value={bannerForm.position} onValueChange={(v) => setBannerForm({ ...bannerForm, position: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top">Top</SelectItem>
                      <SelectItem value="sidebar">Sidebar</SelectItem>
                      <SelectItem value="footer">Footer</SelectItem>
                      <SelectItem value="inline">Inline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="banner-sort">Sort Order</Label>
                  <Input id="banner-sort" type="number" value={bannerForm.sort_order} onChange={(e) => setBannerForm({ ...bannerForm, sort_order: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={bannerForm.is_active} onCheckedChange={(v) => setBannerForm({ ...bannerForm, is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBannerDialog(false)}>Cancel</Button>
              <Button onClick={handleBannerSave}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Landing Page Dialog */}
        <Dialog open={showLandingDialog} onOpenChange={setShowLandingDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Landing Page</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="landing-title">Title</Label>
                <Input id="landing-title" value={landingForm.title} onChange={(e) => setLandingForm({ ...landingForm, title: e.target.value, slug: generateSlug(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="landing-slug">Slug</Label>
                <Input id="landing-slug" value={landingForm.slug} onChange={(e) => setLandingForm({ ...landingForm, slug: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="landing-meta-title">Meta Title</Label>
                <Input id="landing-meta-title" value={landingForm.meta_title} onChange={(e) => setLandingForm({ ...landingForm, meta_title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="landing-meta-desc">Meta Description</Label>
                <Textarea id="landing-meta-desc" value={landingForm.meta_description} onChange={(e) => setLandingForm({ ...landingForm, meta_description: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={landingForm.is_published} onCheckedChange={(v) => setLandingForm({ ...landingForm, is_published: v })} />
                <Label>Published</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLandingDialog(false)}>Cancel</Button>
              <Button onClick={handleLandingSave}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* FAQ Dialog */}
        <Dialog open={showFAQDialog} onOpenChange={setShowFAQDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit FAQ Entry' : 'Add FAQ Entry'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="faq-question">Question</Label>
                <Input id="faq-question" value={faqForm.question} onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="faq-answer">Answer</Label>
                <Textarea id="faq-answer" rows={4} value={faqForm.answer} onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="faq-category">Category</Label>
                  <Input id="faq-category" value={faqForm.category} onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="faq-sort">Sort Order</Label>
                  <Input id="faq-sort" type="number" value={faqForm.sort_order} onChange={(e) => setFaqForm({ ...faqForm, sort_order: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={faqForm.is_active} onCheckedChange={(v) => setFaqForm({ ...faqForm, is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowFAQDialog(false)}>Cancel</Button>
              <Button onClick={handleFAQSave}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Blog Dialog */}
        <Dialog open={showBlogDialog} onOpenChange={setShowBlogDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Blog Post' : 'Add Blog Post'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="blog-title">Title</Label>
                <Input id="blog-title" value={blogForm.title} onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value, slug: generateSlug(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="blog-slug">Slug</Label>
                <Input id="blog-slug" value={blogForm.slug} onChange={(e) => setBlogForm({ ...blogForm, slug: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="blog-image">Featured Image URL</Label>
                <Input id="blog-image" value={blogForm.featured_image} onChange={(e) => setBlogForm({ ...blogForm, featured_image: e.target.value })} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="blog-body">Body</Label>
                <Textarea id="blog-body" rows={8} value={blogForm.body} onChange={(e) => setBlogForm({ ...blogForm, body: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={blogForm.status} onValueChange={(v) => setBlogForm({ ...blogForm, status: v as 'draft' | 'published' | 'archived' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBlogDialog(false)}>Cancel</Button>
              <Button onClick={handleBlogSave}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Static Page Dialog */}
        <Dialog open={showPageDialog} onOpenChange={setShowPageDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Static Page' : 'Add Static Page'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="page-title">Title</Label>
                <Input id="page-title" value={pageForm.title} onChange={(e) => setPageForm({ ...pageForm, title: e.target.value, slug: generateSlug(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="page-slug">Slug</Label>
                <Input id="page-slug" value={pageForm.slug} onChange={(e) => setPageForm({ ...pageForm, slug: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={pageForm.is_published} onCheckedChange={(v) => setPageForm({ ...pageForm, is_published: v })} />
                <Label>Published</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPageDialog(false)}>Cancel</Button>
              <Button onClick={handlePageSave}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Terms Dialog */}
        <Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>New Terms of Service Version</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="terms-version">Version</Label>
                  <Input id="terms-version" value={termsForm.version} onChange={(e) => setTermsForm({ ...termsForm, version: e.target.value })} placeholder="1.0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="terms-date">Effective Date</Label>
                  <Input id="terms-date" type="date" value={termsForm.effective_date} onChange={(e) => setTermsForm({ ...termsForm, effective_date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="terms-content">Content</Label>
                <Textarea id="terms-content" rows={10} value={termsForm.content} onChange={(e) => setTermsForm({ ...termsForm, content: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={termsForm.is_active} onCheckedChange={(v) => setTermsForm({ ...termsForm, is_active: v })} />
                <Label>Set as active version</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTermsDialog(false)}>Cancel</Button>
              <Button onClick={handleTermsSave}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Privacy Dialog */}
        <Dialog open={showPrivacyDialog} onOpenChange={setShowPrivacyDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>New Privacy Policy Version</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="privacy-version">Version</Label>
                  <Input id="privacy-version" value={privacyForm.version} onChange={(e) => setPrivacyForm({ ...privacyForm, version: e.target.value })} placeholder="1.0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="privacy-date">Effective Date</Label>
                  <Input id="privacy-date" type="date" value={privacyForm.effective_date} onChange={(e) => setPrivacyForm({ ...privacyForm, effective_date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="privacy-content">Content</Label>
                <Textarea id="privacy-content" rows={10} value={privacyForm.content} onChange={(e) => setPrivacyForm({ ...privacyForm, content: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={privacyForm.is_active} onCheckedChange={(v) => setPrivacyForm({ ...privacyForm, is_active: v })} />
                <Label>Set as active version</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPrivacyDialog(false)}>Cancel</Button>
              <Button onClick={handlePrivacySave}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
