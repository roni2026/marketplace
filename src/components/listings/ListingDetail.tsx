/**
 * ListingDetail — Phase 4 comprehensive listing detail display component.
 * Shows all extended listing information: product attributes, condition details,
 * pricing, shipping, warranty, product identifiers, and seller store integration.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice } from '@/lib/constants';
import { useListingManagement } from '@/hooks/useListingManagement';
import { format } from 'date-fns';
import {
  MapPin, Star, BadgeCheck, Store, Calendar, Package, Users, Truck, Shield,
  Tag, Barcode, QrCode, Hash, FileText, Percent, Clock, Wrench, AlertCircle,
  CheckCircle2, Info,
} from 'lucide-react';
import type { SellerStoreInfo } from '@/integrations/supabase/types_v4_listings';

interface ListingDetailProps {
  ad: {
    id: string;
    title: string;
    price: number | null;
    original_price: number | null;
    discount_amount: number | null;
    discount_percentage: number | null;
    price_type: string;
    is_negotiable: boolean | null;
    min_offer: number | null;
    currency: string | null;
    condition: string;
    listing_type: string | null;
    brand: string | null;
    model: string | null;
    tags: string[] | null;
    sku: string | null;
    barcode: string | null;
    serial_number: string | null;
    mpn: string | null;
    product_attributes: Record<string, unknown> | null;
    condition_details: Record<string, unknown> | null;
    shipping_methods: string[] | null;
    shipping_fee_type: string | null;
    shipping_fee: number | null;
    free_shipping: boolean | null;
    estimated_delivery_days: number | null;
    handling_time_days: number | null;
    delivery_locations: string[] | null;
    warranty_type: string | null;
    warranty_duration_months: number | null;
    warranty_coverage: string | null;
    warranty_terms: string | null;
    user_id: string;
    created_at: string;
  };
}

const SHIPPING_LABELS: Record<string, string> = {
  local_pickup: 'Local Pickup', nationwide: 'Nationwide Shipping', international: 'International Shipping',
};

const WARRANTY_LABELS: Record<string, string> = {
  none: 'No Warranty', manufacturer: 'Manufacturer Warranty', seller: 'Seller Warranty',
};

function formatKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function renderStars(rating: number): React.ReactNode {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < full ? 'fill-yellow-400 text-yellow-400' : i === full && half ? 'fill-yellow-400/50 text-yellow-400' : 'text-muted-foreground/30'}`}
        />
      ))}
      <span className="ml-1 text-sm font-medium">{rating.toFixed(1)}</span>
    </div>
  );
}

export function ListingDetail({ ad }: ListingDetailProps) {
  const { fetchSellerStoreInfo } = useListingManagement();
  const [sellerInfo, setSellerInfo] = useState<SellerStoreInfo | null>(null);
  const [sellerLoading, setSellerLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setSellerLoading(true);
    fetchSellerStoreInfo(ad.user_id).then(data => {
      if (mounted) { setSellerInfo(data); setSellerLoading(false); }
    });
    return () => { mounted = false; };
  }, [ad.user_id, fetchSellerStoreInfo]);

  const hasAttributes = ad.product_attributes && Object.keys(ad.product_attributes).length > 0;
  const conditionDetails = ad.condition_details || {};
  const hasConditionDetails = Object.values(conditionDetails).some(v => v && String(v).trim());
  const hasShipping = (ad.shipping_methods && ad.shipping_methods.length > 0) || ad.shipping_fee_type || ad.free_shipping;
  const hasWarranty = ad.warranty_type && ad.warranty_type !== 'none';
  const hasIdentifiers = ad.brand || ad.model || ad.sku || ad.barcode || ad.serial_number || ad.mpn || (ad.tags && ad.tags.length > 0);
  const hasDiscount = ad.discount_amount && ad.discount_amount > 0 && ad.original_price && ad.original_price > 0;

  return (
    <div className="space-y-4">
      {/* Pricing Section */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Percent className="h-4 w-4" /> Pricing</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-2xl font-bold">{formatPrice(ad.price, ad.price_type)}</span>
            {hasDiscount && (
              <>
                <span className="text-lg text-muted-foreground line-through">{formatPrice(ad.original_price, 'fixed')}</span>
                <Badge variant="destructive" className="gap-1">
                  <Percent className="h-3 w-3" /> {ad.discount_percentage}% OFF
                </Badge>
              </>
            )}
          </div>
          {ad.is_negotiable && <Badge variant="secondary" className="gap-1"><Tag className="h-3 w-3" /> Negotiable</Badge>}
          {ad.min_offer != null && ad.min_offer > 0 && (
            <p className="text-sm text-muted-foreground">Minimum offer: {formatPrice(ad.min_offer, 'fixed')}</p>
          )}
          {ad.currency && ad.currency !== 'BDT' && <p className="text-xs text-muted-foreground">Currency: {ad.currency}</p>}
        </CardContent>
      </Card>

      {/* Product Attributes */}
      {hasAttributes && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Info className="h-4 w-4" /> Product Attributes</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(ad.product_attributes!).map(([key, value]) => (
                value != null && String(value).trim() !== '' && (
                  <div key={key} className="flex flex-col">
                    <span className="text-xs text-muted-foreground">{formatKey(key)}</span>
                    <span className="text-sm font-medium">{String(value)}</span>
                  </div>
                )
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Condition Details */}
      {hasConditionDetails && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Condition Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {conditionDetails.cosmetic_condition && <div><span className="text-xs text-muted-foreground">Cosmetic Condition</span><p className="text-sm">{String(conditionDetails.cosmetic_condition)}</p></div>}
            {conditionDetails.functional_condition && <div><span className="text-xs text-muted-foreground">Functional Condition</span><p className="text-sm">{String(conditionDetails.functional_condition)}</p></div>}
            {conditionDetails.missing_accessories && <div><span className="text-xs text-muted-foreground">Missing Accessories</span><p className="text-sm">{String(conditionDetails.missing_accessories)}</p></div>}
            {conditionDetails.repairs && <div><span className="text-xs text-muted-foreground">Repairs</span><p className="text-sm">{String(conditionDetails.repairs)}</p></div>}
            {conditionDetails.defects && <div><span className="text-xs text-muted-foreground">Defects</span><p className="text-sm">{String(conditionDetails.defects)}</p></div>}
            {conditionDetails.scratches && <div><span className="text-xs text-muted-foreground">Scratches</span><p className="text-sm">{String(conditionDetails.scratches)}</p></div>}
            {conditionDetails.additional_notes && <div><span className="text-xs text-muted-foreground">Additional Notes</span><p className="text-sm">{String(conditionDetails.additional_notes)}</p></div>}
          </CardContent>
        </Card>
      )}

      {/* Shipping & Delivery */}
      {hasShipping && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4" /> Shipping & Delivery</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {ad.shipping_methods && ad.shipping_methods.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {ad.shipping_methods.map(m => <Badge key={m} variant="outline">{SHIPPING_LABELS[m] || m}</Badge>)}
              </div>
            )}
            {ad.free_shipping ? (
              <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Free Shipping</Badge>
            ) : ad.shipping_fee != null && ad.shipping_fee > 0 ? (
              <p className="text-sm">Shipping fee: {formatPrice(ad.shipping_fee, 'fixed')}</p>
            ) : null}
            {ad.estimated_delivery_days != null && <p className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Estimated delivery: {ad.estimated_delivery_days} days</p>}
            {ad.handling_time_days != null && <p className="text-sm text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3" /> Handling time: {ad.handling_time_days} days</p>}
            {ad.delivery_locations && ad.delivery_locations.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground">Delivery locations:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {ad.delivery_locations.map(loc => <Badge key={loc} variant="secondary" className="text-xs">{loc}</Badge>)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Warranty */}
      {hasWarranty && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" /> Warranty</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Badge variant="default">{WARRANTY_LABELS[ad.warranty_type!] || ad.warranty_type}</Badge>
            {ad.warranty_duration_months != null && <p className="text-sm">Duration: {ad.warranty_duration_months} months</p>}
            {ad.warranty_coverage && <div><span className="text-xs text-muted-foreground">Coverage</span><p className="text-sm">{ad.warranty_coverage}</p></div>}
            {ad.warranty_terms && <div><span className="text-xs text-muted-foreground">Terms & Conditions</span><p className="text-sm whitespace-pre-wrap">{ad.warranty_terms}</p></div>}
          </CardContent>
        </Card>
      )}

      {/* Product Identifiers */}
      {hasIdentifiers && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Tag className="h-4 w-4" /> Product Information</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {ad.listing_type && <Badge variant="outline" className="capitalize">{ad.listing_type.replace(/-/g, ' ')}</Badge>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ad.brand && <div className="flex items-center gap-2"><Tag className="h-4 w-4 text-muted-foreground" /><div><span className="text-xs text-muted-foreground block">Brand</span><span className="text-sm font-medium">{ad.brand}</span></div></div>}
              {ad.model && <div className="flex items-center gap-2"><Tag className="h-4 w-4 text-muted-foreground" /><div><span className="text-xs text-muted-foreground block">Model</span><span className="text-sm font-medium">{ad.model}</span></div></div>}
              {ad.sku && <div className="flex items-center gap-2"><Hash className="h-4 w-4 text-muted-foreground" /><div><span className="text-xs text-muted-foreground block">SKU</span><span className="text-sm font-medium">{ad.sku}</span></div></div>}
              {ad.barcode && <div className="flex items-center gap-2"><Barcode className="h-4 w-4 text-muted-foreground" /><div><span className="text-xs text-muted-foreground block">Barcode</span><span className="text-sm font-medium">{ad.barcode}</span></div></div>}
              {ad.serial_number && <div className="flex items-center gap-2"><QrCode className="h-4 w-4 text-muted-foreground" /><div><span className="text-xs text-muted-foreground block">Serial Number</span><span className="text-sm font-medium">{ad.serial_number}</span></div></div>}
              {ad.mpn && <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /><div><span className="text-xs text-muted-foreground block">MPN</span><span className="text-sm font-medium">{ad.mpn}</span></div></div>}
            </div>
            {ad.tags && ad.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {ad.tags.map(tag => <Badge key={tag} variant="secondary" className="text-xs">#{tag}</Badge>)}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Seller Store Integration */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Store className="h-4 w-4" /> Seller Information</CardTitle></CardHeader>
        <CardContent>
          {sellerLoading ? (
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2 flex-1"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-24" /></div>
            </div>
          ) : sellerInfo ? (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-full bg-muted overflow-hidden shrink-0">
                  {sellerInfo.seller_avatar ? (
                    <img src={sellerInfo.seller_avatar} alt={sellerInfo.seller_name || 'Seller'} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
                      {(sellerInfo.seller_name || 'S')[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to={`/user/${ad.user_id}`} className="font-medium hover:underline">{sellerInfo.seller_name || 'Anonymous Seller'}</Link>
                    {sellerInfo.seller_verified && <BadgeCheck className="h-4 w-4 text-blue-500" />}
                  </div>
                  {sellerInfo.seller_rating > 0 && renderStars(sellerInfo.seller_rating)}
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                    {sellerInfo.seller_location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {sellerInfo.seller_location}</span>}
                    {sellerInfo.seller_join_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Joined {format(new Date(sellerInfo.seller_join_date), 'MMM yyyy')}</span>}
                    <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {sellerInfo.active_listings_count} listings</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {sellerInfo.followers_count} followers</span>
                  </div>
                </div>
              </div>

              {sellerInfo.store_name && sellerInfo.store_slug && (
                <>
                  <Separator />
                  <Link to={`/shop/${sellerInfo.store_slug}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
                    <div className="h-10 w-10 rounded-lg bg-muted overflow-hidden shrink-0">
                      {sellerInfo.store_logo ? (
                        <img src={sellerInfo.store_logo} alt={sellerInfo.store_name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center"><Store className="h-5 w-5 text-muted-foreground" /></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{sellerInfo.store_name}</p>
                      <p className="text-xs text-muted-foreground">Visit storefront →</p>
                    </div>
                    {sellerInfo.verification_badge && <BadgeCheck className="h-5 w-5 text-blue-500" />}
                  </Link>
                </>
              )}

              {sellerInfo.store_policies && (
                <>
                  <Separator />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {sellerInfo.store_policies.shipping_policy && <div><span className="text-muted-foreground block mb-0.5">Shipping Policy</span><p className="text-sm">{sellerInfo.store_policies.shipping_policy}</p></div>}
                    {sellerInfo.store_policies.return_policy && <div><span className="text-muted-foreground block mb-0.5">Return Policy</span><p className="text-sm">{sellerInfo.store_policies.return_policy}</p></div>}
                    {sellerInfo.store_policies.refund_policy && <div><span className="text-muted-foreground block mb-0.5">Refund Policy</span><p className="text-sm">{sellerInfo.store_policies.refund_policy}</p></div>}
                    {sellerInfo.store_policies.warranty_info && <div><span className="text-muted-foreground block mb-0.5">Warranty Info</span><p className="text-sm">{sellerInfo.store_policies.warranty_info}</p></div>}
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Seller information unavailable</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
