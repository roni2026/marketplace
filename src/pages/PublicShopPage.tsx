import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import SEO from '@/components/SEO';
import { generateShopTitle, generateShopDescription } from '@/lib/seo/meta';
import { canonicalUrl, shopUrl } from '@/lib/seo/urls';
import { buildStore } from '@/lib/seo/structuredData';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  getShopBySlug,
  followShop,
  unfollowShop,
  isFollowingShop,
  getShopReviews,
  getShopCollections,
  getShopAnnouncements,
} from '@/lib/shop';
import { formatPrice } from '@/lib/constants';
import type {
  Shop,
  ShopReview,
  ShopCollection,
  ShopAnnouncement,
} from '@/integrations/supabase/types_v3_shops';
import {
  ShieldCheck, Star, MapPin, Mail, Phone, Clock, Users,
  Package, TrendingUp, Share2, Heart, Search, ChevronDown,
  Facebook, Instagram, Twitter, Youtube, Truck, RotateCcw,
  RefreshCw, Shield, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface ShopProduct {
  id: string;
  title: string;
  slug: string;
  price: number | null;
  price_type: string;
  condition: string;
  ad_images: { image_url: string }[];
}

export default function PublicShopPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [reviews, setReviews] = useState<ShopReview[]>([]);
  const [collections, setCollections] = useState<ShopCollection[]>([]);
  const [announcements, setAnnouncements] = useState<ShopAnnouncement[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [openPolicy, setOpenPolicy] = useState<string | null>(null);

  const fetchShopData = useCallback(async () => {
    if (!slug) return;
    setIsLoading(true);
    try {
      const shopData = await getShopBySlug(slug);
      if (!shopData) {
        setIsLoading(false);
        return;
      }
      setShop(shopData);

      const [revs, cols, anns] = await Promise.all([
        getShopReviews(shopData.id),
        getShopCollections(shopData.id),
        getShopAnnouncements(shopData.id),
      ]);
      setReviews(revs);
      setCollections(cols);
      setAnnouncements(anns);

      // Fetch products
      const { data: ads } = await supabase
        .from('ads')
        .select('id, title, slug, price, price_type, condition, ad_images(image_url)')
        .eq('user_id', shopData.owner_id)
        .in('status', ['approved', 'boosted', 'premium'])
        .order('created_at', { ascending: false });

      setProducts((ads as ShopProduct[]) || []);

      // Check if following
      if (user) {
        const following = await isFollowingShop(shopData.id, user.id);
        setIsFollowing(following);
      }
    } catch (err) {
      console.error('PublicShopPage fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [slug, user]);

  useEffect(() => {
    fetchShopData();
  }, [fetchShopData]);

  const handleFollow = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!shop) return;
    if (isFollowing) {
      const success = await unfollowShop(shop.id, user.id);
      if (success) {
        setIsFollowing(false);
        toast.success('Unfollowed shop');
      }
    } else {
      const success = await followShop(shop.id, user.id);
      if (success) {
        setIsFollowing(true);
        toast.success('Following shop');
      }
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: shop?.name,
        text: shop?.description || `Check out ${shop?.name}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Skeleton className="h-48 md:h-64 w-full" />
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-start gap-4 mb-6">
            <Skeleton className="h-20 w-20 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Shop Not Found</h1>
          <p className="text-muted-foreground mb-6">The shop you're looking for doesn't exist or has been removed.</p>
          <Link to="/">
            <Button>Browse Marketplace</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const socialLinks = shop.social_links || {};
  const socialIcons = [
    { key: 'facebook', icon: Facebook, url: socialLinks.facebook },
    { key: 'instagram', icon: Instagram, url: socialLinks.instagram },
    { key: 'twitter', icon: Twitter, url: socialLinks.twitter },
    { key: 'youtube', icon: Youtube, url: socialLinks.youtube },
  ].filter((s) => s.url);

  const policies = [
    { key: 'shipping', label: 'Shipping Policy', icon: Truck, content: shop.shipping_policy },
    { key: 'return', label: 'Return Policy', icon: RotateCcw, content: shop.return_policy },
    { key: 'refund', label: 'Refund Policy', icon: RefreshCw, content: shop.refund_policy },
    { key: 'warranty', label: 'Warranty Information', icon: Shield, content: shop.warranty_info },
  ].filter((p) => p.content);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={generateShopTitle({ name: shop?.name || 'Shop' })}
        description={generateShopDescription({ name: shop?.name || 'Shop', description: shop?.description })}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Shops', url: '/shops' },
          { name: shop?.name || 'Shop', url: `/shop/${slug}` },
        ]}
      />
      <Header />

      {/* Vacation Mode Banner */}
      {shop.is_vacation_mode && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-3 text-center">
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            <AlertCircle className="h-4 w-4 inline mr-1" />
            This shop is on vacation. {shop.vacation_message || 'Listings are temporarily hidden.'}
          </p>
        </div>
      )}

      {/* Banner */}
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-primary/20 via-primary/10 to-background">
        {shop.banner_url && (
          <img
            src={shop.banner_url}
            alt={`${shop.name} banner`}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      <main className="container mx-auto px-4 py-6 pb-20 md:pb-6">
        {/* Shop Header */}
        <div className="flex flex-col md:flex-row items-start gap-4 mb-6 -mt-12 md:-mt-16 relative z-10">
          {shop.logo_url ? (
            <img
              src={shop.logo_url}
              alt={shop.name}
              className="h-20 w-20 md:h-24 md:w-24 rounded-xl object-cover border-4 border-background shadow-lg"
            />
          ) : (
            <div className="h-20 w-20 md:h-24 md:w-24 rounded-xl bg-primary/10 border-4 border-background shadow-lg flex items-center justify-center">
              <Package className="h-8 w-8 text-primary" />
            </div>
          )}

          <div className="flex-1 pt-2 md:pt-12">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{shop.name}</h1>
              {shop.is_verified && (
                <Badge className="bg-blue-500 hover:bg-blue-500 gap-1">
                  <ShieldCheck className="h-3 w-3" /> Verified
                </Badge>
              )}
              {shop.is_featured && (
                <Badge className="bg-purple-500 hover:bg-purple-500">Featured</Badge>
              )}
            </div>
            {shop.description && (
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{shop.description}</p>
            )}

            {/* Shop Stats */}
            <div className="flex items-center gap-4 mt-3 text-sm">
              <span className="flex items-center gap-1">
                <Package className="h-4 w-4 text-muted-foreground" />
                {shop.total_products} Products
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                {shop.total_followers} Followers
              </span>
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500" />
                {shop.avg_rating} ({shop.total_reviews})
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                {shop.total_sales} Sales
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 md:pt-12">
            <Button
              variant={isFollowing ? 'default' : 'outline'}
              size="sm"
              onClick={handleFollow}
              className="gap-2"
            >
              <Heart className={`h-4 w-4 ${isFollowing ? 'fill-current' : ''}`} />
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
              <Share2 className="h-4 w-4" /> Share
            </Button>
          </div>
        </div>

        {/* Announcements */}
        {announcements.length > 0 && (
          <div className="mb-6 space-y-2">
            {announcements.slice(0, 3).map((ann) => (
              <div
                key={ann.id}
                className="bg-primary/5 border border-primary/10 rounded-lg px-4 py-3"
              >
                <p className="text-sm font-medium">{ann.title}</p>
                {ann.body && <p className="text-xs text-muted-foreground mt-1">{ann.body}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Contact & Location */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {(shop.contact_email || shop.contact_phone) && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-2">Contact</h3>
                {shop.contact_email && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                    <Mail className="h-3.5 w-3.5" /> {shop.contact_email}
                  </p>
                )}
                {shop.contact_phone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5" /> {shop.contact_phone}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
          {(shop.location_city || shop.location_division) && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-2">Location</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" />
                  {[shop.location_address, shop.location_city, shop.location_division].filter(Boolean).join(', ')}
                </p>
              </CardContent>
            </Card>
          )}
          {socialLinks && socialIcons.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-2">Social Media</h3>
                <div className="flex items-center gap-3">
                  {socialIcons.map(({ key, icon: Icon, url }) => (
                    <a
                      key={key}
                      href={url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Search within shop */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search in this shop..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Collections */}
        {collections.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Collections</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {collections.slice(0, 4).map((col) => (
                <Card key={col.id} className="overflow-hidden">
                  {col.cover_image_url ? (
                    <img src={col.cover_image_url} alt={col.name} className="h-24 w-full object-cover" />
                  ) : (
                    <div className="h-24 bg-gradient-to-br from-primary/10 to-primary/5" />
                  )}
                  <CardContent className="p-3">
                    <p className="text-sm font-medium truncate">{col.name}</p>
                    {col.description && (
                      <p className="text-xs text-muted-foreground truncate">{col.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Products */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Products ({filteredProducts.length})</h2>
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredProducts.map((product) => (
                <Link key={product.id} to={`/ad/${product.slug}`}>
                  <Card className="overflow-hidden hover:shadow-md transition-shadow">
                    <div className="aspect-square bg-muted">
                      {product.ad_images?.[0]?.image_url ? (
                        <img
                          src={product.ad_images[0].image_url}
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <p className="text-sm font-medium truncate">{product.title}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm font-bold text-primary">
                          {formatPrice(product.price, product.price_type)}
                        </span>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {product.condition}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No products match your search' : 'No products available yet'}
              </p>
            </div>
          )}
        </div>

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Customer Reviews ({reviews.length})</h2>
            <div className="space-y-3">
              {reviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i < review.rating
                                ? 'fill-yellow-500 text-yellow-500'
                                : 'text-muted-foreground'
                            }`}
                          />
                        ))}
                      </div>
                      {review.is_verified_purchase && (
                        <Badge variant="secondary" className="text-xs">Verified Purchase</Badge>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {review.title && <p className="text-sm font-medium mb-1">{review.title}</p>}
                    {review.body && <p className="text-sm text-muted-foreground">{review.body}</p>}
                    {review.seller_reply && (
                      <div className="mt-3 pl-4 border-l-2 border-primary/20">
                        <p className="text-xs font-medium text-primary mb-1">Shop Reply</p>
                        <p className="text-sm text-muted-foreground">{review.seller_reply}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Policies */}
        {policies.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Shop Policies</h2>
            <div className="space-y-2">
              {policies.map((policy) => (
                <Collapsible key={policy.key} open={openPolicy === policy.key} onOpenChange={(open) => setOpenPolicy(open ? policy.key : null)}>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardContent className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2">
                          <policy.icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{policy.label}</span>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openPolicy === policy.key ? 'rotate-180' : ''}`} />
                      </CardContent>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-4 px-4">
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{policy.content}</p>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          </div>
        )}
      </main>
      <MobileNav />
      <Footer />
    </div>
  );
}
