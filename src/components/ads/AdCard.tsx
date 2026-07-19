import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, MapPin, Clock, Star, Zap, Eye, TrendingUp, Layers, Tag } from 'lucide-react';
import { formatPrice } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useCompare } from '@/hooks/useCompare';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { toast } from 'sonner';

interface AdCardProps {
  ad: {
    id: string;
    title: string;
    slug: string;
    price: number | null;
    price_type: string;
    condition: string;
    division: string;
    district: string;
    is_featured: boolean;
    is_premium?: boolean | null;
    is_boosted?: boolean | null;
    is_urgent?: boolean | null;
    views_count?: number | null;
    favorites_count?: number | null;
    created_at: string;
    ad_images: { image_url: string }[];
    categories?: { name: string; slug: string } | null;
    brand?: string | null;
    original_price?: number | null;
    discount_percentage?: number | null;
  };
  isFavorite?: boolean;
  onFavoriteToggle?: () => void;
  showCompare?: boolean;
}

export function AdCard({ ad, isFavorite = false, onFavoriteToggle, showCompare = true }: AdCardProps) {
  const { user } = useAuth();
  const { compareIds, addToCompare, removeFromCompare } = useCompare();
  const [isFav, setIsFav] = useState(isFavorite);
  const [isLoading, setIsLoading] = useState(false);
  const [imgError, setImgError] = useState(false);

  const imageUrl = !imgError && ad.ad_images?.[0]?.image_url ? ad.ad_images[0].image_url : '/placeholder.svg';
  const isNew = Date.now() - new Date(ad.created_at).getTime() < 48 * 60 * 60 * 1000;
  const isComparing = compareIds.includes(ad.id);
  const hasDiscount = ad.discount_percentage && ad.discount_percentage > 0 && ad.original_price && ad.original_price > (ad.price || 0);

  const badgeCls = 'gap-1 px-1.5 py-0 text-[10px] font-semibold leading-4 shadow-sm';

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error('Please login to save favorites');
      return;
    }

    setIsLoading(true);
    try {
      if (isFav) {
        await supabase.from('favorites').delete().eq('ad_id', ad.id).eq('user_id', user.id);
        setIsFav(false);
        toast.success('Removed from favorites');
      } else {
        await supabase.from('favorites').insert({ ad_id: ad.id, user_id: user.id });
        setIsFav(true);
        toast.success('Added to favorites');
      }
      onFavoriteToggle?.();
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isComparing) {
      removeFromCompare(ad.id);
      toast.success('Removed from comparison');
    } else {
      if (compareIds.length >= 4) {
        toast.error('You can compare up to 4 items at a time');
        return;
      }
      addToCompare(ad as any);
      toast.success('Added to comparison');
    }
  };

  return (
    <Link to={`/ad/${ad.slug}-${ad.id}`} className="block h-full">
      <Card className="group h-full overflow-hidden border-border/80 hover:border-primary/40 hover:shadow-md">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <img
            src={imageUrl}
            alt={ad.title}
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
            {ad.is_premium && (
              <Badge className={`bg-purple-600 hover:bg-purple-600 text-white ${badgeCls}`}>
                <TrendingUp className="h-3 w-3" />
                Premium
              </Badge>
            )}
            {ad.is_boosted && (
              <Badge className={`bg-blue-600 hover:bg-blue-600 text-white ${badgeCls}`}>
                Boosted
              </Badge>
            )}
            {ad.is_featured && (
              <Badge className={`bg-primary ${badgeCls}`}>
                <Star className="h-3 w-3" />
                Featured
              </Badge>
            )}
            {ad.is_urgent && (
              <Badge className={`bg-red-600 hover:bg-red-600 text-white ${badgeCls}`}>
                <Zap className="h-3 w-3" />
                Urgent
              </Badge>
            )}
            {hasDiscount && (
              <Badge className={`bg-orange-600 hover:bg-orange-600 text-white ${badgeCls}`}>
                <Tag className="h-3 w-3" />
                {ad.discount_percentage}% OFF
              </Badge>
            )}
            {isNew && !ad.is_featured && !ad.is_premium && !ad.is_boosted && (
              <Badge className={`bg-emerald-600 hover:bg-emerald-600 text-white ${badgeCls}`}>New</Badge>
            )}
          </div>
          <Badge
            variant="secondary"
            className="absolute top-2 right-2 capitalize px-1.5 py-0 text-[10px] leading-4 shadow-sm backdrop-blur-sm"
          >
            {ad.condition}
          </Badge>
        </div>
        <CardContent className="p-3">
          <div className="space-y-1.5">
            <h3 className="font-medium text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors text-sm min-h-[2.5rem]">
              {ad.title}
            </h3>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <p className="text-[15px] sm:text-base font-bold text-foreground">
                {formatPrice(ad.price, ad.price_type)}
              </p>
              {hasDiscount && ad.original_price && (
                <p className="text-xs text-muted-foreground line-through">
                  ৳{new Intl.NumberFormat('en-BD').format(ad.original_price)}
                </p>
              )}
            </div>
            {ad.brand && (
              <p className="text-xs text-muted-foreground truncate">{ad.brand}</p>
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{ad.district}, {ad.division}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5 border-t border-border/60">
              <span className="flex items-center gap-1 pt-1.5">
                <Clock className="h-3 w-3" />
                <span>{formatDistanceToNow(new Date(ad.created_at), { addSuffix: true })}</span>
              </span>
              <div className="flex items-center gap-2 pt-1.5">
                {(ad.views_count || 0) > 0 && (
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {ad.views_count}
                  </span>
                )}
                {(ad.favorites_count || 0) > 0 && (
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    {ad.favorites_count}
                  </span>
                )}
              </div>
            </div>
            {/* Favorite & Compare buttons below the image */}
            <div className="flex items-center gap-1.5 pt-1">
              <Button
                variant="outline"
                size="sm"
                className={`flex-1 gap-1.5 h-7 text-xs ${isFav ? 'text-destructive border-destructive/30' : ''}`}
                onClick={handleFavorite}
                disabled={isLoading}
              >
                <Heart className={`h-3.5 w-3.5 ${isFav ? 'fill-current' : ''}`} />
                {isFav ? 'Saved' : 'Save'}
              </Button>
              {showCompare && (
                <Button
                  variant="outline"
                  size="sm"
                  className={`flex-1 gap-1.5 h-7 text-xs ${isComparing ? 'text-primary border-primary/30' : ''}`}
                  onClick={handleCompare}
                >
                  <Layers className="h-3.5 w-3.5" />
                  Compare
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
