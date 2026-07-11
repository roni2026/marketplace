import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';
import { MapPin, Clock, Plus, Edit, Trash2, Eye, AlertCircle, RefreshCw, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { logAdAction } from '@/lib/audit';
import { useTranslation } from 'react-i18next';

interface Ad {
  id: string;
  title: string;
  slug: string;
  price: number | null;
  price_type: string;
  status: string;
  rejection_message: string | null;
  division: string;
  district: string;
  created_at: string;
  expires_at: string | null;
  views_count: number | null;
  ad_images: { image_url: string }[];
}

export default function MyAds() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchAds();
    }
  }, [user]);

  const fetchAds = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('ads')
      .select('*, ad_images(image_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    setAds((data as Ad[]) || []);
    setIsLoading(false);
  };

  const filterAdsByStatus = (status: string | null) => {
    let filtered = ads;
    if (status) {
      filtered = filtered.filter(ad => ad.status === status);
    }
    if (searchTerm) {
      filtered = filtered.filter(ad => 
        ad.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return filtered;
  };

  const handleDelete = async (adId: string) => {
    const { error } = await supabase.from('ads').delete().eq('id', adId);
    if (error) {
      toast.error(t('toast.adDeleteFailed'));
    } else {
      await logAdAction('delete', adId);
      toast.success(t('toast.adDeleted'));
      fetchAds();
    }
  };

  const handleRenew = async (adId: string) => {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from('ads')
      .update({ 
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', adId);
    
    if (error) {
      toast.error(t('toast.adRenewFailed'));
    } else {
      toast.success(t('toast.adRenewed'));
      fetchAds();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const { error } = await supabase.from('ads').delete().in('id', selectedIds);
    if (error) {
      toast.error(t('toast.adsDeleteFailed'));
    } else {
      toast.success(t('toast.adsDeleted', { count: selectedIds.length }));
      setSelectedIds([]);
      fetchAds();
    }
  };

  const handleBulkRenew = async () => {
    if (selectedIds.length === 0) return;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from('ads')
      .update({ expires_at: expiresAt, updated_at: new Date().toISOString() })
      .in('id', selectedIds);
    
    if (error) {
      toast.error(t('toast.adsRenewFailed'));
    } else {
      toast.success(t('toast.adsRenewed', { count: selectedIds.length }));
      setSelectedIds([]);
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

  const toggleSelectAll = (adsList: Ad[]) => {
    if (adsList.length > 0 && adsList.every(ad => selectedIds.includes(ad.id))) {
      setSelectedIds(prev => prev.filter(id => !adsList.some(ad => ad.id === id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...adsList.map(ad => ad.id)])]);
    }
  };

  const AdList = ({ status }: { status: string | null }) => {
    const filteredAds = filterAdsByStatus(status);

    if (filteredAds.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('myAds.noAds')}</p>
          <Link to="/post-ad">
            <Button className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              {t('myAds.postFirstAd')}
            </Button>
          </Link>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
            <span className="text-sm font-medium">{selectedIds.length} {t('myAds.selected')}</span>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleBulkRenew}>
              <RefreshCw className="h-4 w-4" />
              {t('myAds.renewSelected')}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-destructive">
                  <Trash2 className="h-4 w-4" />
                  {t('myAds.deleteSelected')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('myAds.deleteAdsConfirm', { count: selectedIds.length })}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('myAds.deleteAdsWarning')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('profile.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground">
                    {t('myAds.deleteAll')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
              {t('myAds.clear')}
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {filteredAds.map((ad) => {
            const imageUrl = ad.ad_images?.[0]?.image_url || '/placeholder.svg';
            const isExpired = ad.expires_at && new Date(ad.expires_at) < new Date();
            return (
              <Card key={ad.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Checkbox
                      checked={selectedIds.includes(ad.id)}
                      onCheckedChange={() => toggleSelect(ad.id)}
                      className="mt-1"
                    />
                    <Link to={`/ad/${ad.slug}-${ad.id}`} className="shrink-0">
                      <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted">
                        <img
                          src={imageUrl}
                          alt={ad.title}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
                        />
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link to={`/ad/${ad.slug}-${ad.id}`}>
                            <h3 className="font-semibold hover:text-primary transition-colors truncate">
                              {ad.title}
                            </h3>
                          </Link>
                          <p className="text-lg font-bold text-primary mt-1">
                            {formatPrice(ad.price, ad.price_type)}
                          </p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {ad.district}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(ad.created_at), { addSuffix: true })}
                            </span>
                            {(ad.views_count || 0) > 0 && (
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {ad.views_count} views
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge
                          className={
                            ad.status === 'approved' ? 'bg-green-600 hover:bg-green-600 text-white' :
                            ad.status === 'pending' ? 'bg-yellow-500 hover:bg-yellow-500 text-white' :
                            ad.status === 'rejected' ? 'bg-red-500 hover:bg-red-500 text-white' :
                            ad.status === 'sold' ? 'bg-blue-500 hover:bg-blue-500 text-white' :
                            ''
                          }
                        >
                          {ad.status}
                        </Badge>
                      </div>

                      {ad.status === 'rejected' && ad.rejection_message && (
                        <div className="mt-2 flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>{ad.rejection_message}</span>
                        </div>
                      )}

                      {isExpired && ad.status === 'approved' && (
                        <div className="mt-2 flex items-start gap-2 text-sm text-orange-600 bg-orange-500/10 p-2 rounded">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>This ad has expired. {t('myAds.adExpired')}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-3">
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => handleRenew(ad.id)}>
                          <RefreshCw className="h-3 w-3" />
                          {t('myAds.renew')}
                        </Button>
                        <Link to={`/post-ad?edit=${ad.id}`}>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Edit className="h-3 w-3" />
                            {t('myAds.edit')}
                          </Button>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2 text-destructive">
                              <Trash2 className="h-3 w-3" />
                              {t('myAds.deleteAd')}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('myAds.deleteAdConfirm')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('myAds.deleteAdWarning', { title: ad.title })}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('profile.cancel')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(ad.id)} className="bg-destructive text-destructive-foreground">
                                {t('myAds.deleteAd')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Skeleton className="h-12 w-48 mb-6" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </main>
        <MobileNav />
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pb-20 lg:pb-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">{t('myAds.myAds')}</h1>
          <Link to="/post-ad">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t('myAds.postAd')}
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="mb-4">
          <Input
            placeholder={t('myAds.searchAds')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">{t('myAds.all')} ({filterAdsByStatus(null).length})</TabsTrigger>
            <TabsTrigger value="pending">{t('myAds.pending')} ({filterAdsByStatus('pending').length})</TabsTrigger>
            <TabsTrigger value="approved">{t('myAds.approved')} ({filterAdsByStatus('approved').length})</TabsTrigger>
            <TabsTrigger value="rejected">{t('myAds.rejected')} ({filterAdsByStatus('rejected').length})</TabsTrigger>
            <TabsTrigger value="sold">{t('myAds.sold')} ({filterAdsByStatus('sold').length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-6">
            <AdList status={null} />
          </TabsContent>
          <TabsContent value="pending" className="mt-6">
            <AdList status="pending" />
          </TabsContent>
          <TabsContent value="approved" className="mt-6">
            <AdList status="approved" />
          </TabsContent>
          <TabsContent value="rejected" className="mt-6">
            <AdList status="rejected" />
          </TabsContent>
          <TabsContent value="sold" className="mt-6">
            <AdList status="sold" />
          </TabsContent>
        </Tabs>
      </main>
      <MobileNav />
      <Footer />
    </div>
  );
}
