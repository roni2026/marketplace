/**
 * Universal Admin Ad Search — client library.
 *
 * Talks to the server-side `search_ads_admin` RPC (indexed, paginated,
 * SECURITY DEFINER + admin gated) and the audited `admin_moderate_ad` RPC.
 * All heavy lifting (filtering, sorting, pagination, type detection) happens
 * in Postgres so the client stays fast even with millions of listings.
 */

import { supabase } from '@/integrations/supabase/client';
import { logAudit } from '@/lib/audit';

export type SearchType = 'auto' | 'ad_id' | 'slug' | 'phone' | 'email' | 'title';

export type SortOption =
  | 'newest'
  | 'oldest'
  | 'price_high'
  | 'price_low'
  | 'updated'
  | 'relevance';

export interface AdSearchFilters {
  status?: string[];
  categoryId?: string | null;
  subcategoryId?: string | null;
  division?: string | null;
  district?: string | null;
  shopId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  sort?: SortOption;
}

export interface AdSearchParams extends AdSearchFilters {
  query: string;
  type?: SearchType;
  page?: number; // 1-based
  pageSize?: number;
}

export interface AdSearchRow {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  price: number | null;
  price_type: string;
  status: string;
  division: string | null;
  district: string | null;
  area: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  category_name: string | null;
  subcategory_name: string | null;
  seller_name: string | null;
  seller_email: string | null;
  seller_phone: string | null;
  seller_secondary_phone: string | null;
  contact_phone: string | null;
  secondary_phone: string | null;
  is_featured: boolean;
  is_premium: boolean;
  is_boosted: boolean;
  thumbnail: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdSearchResult {
  total: number;
  type: SearchType;
  rows: AdSearchRow[];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Auto-detect what the operator typed. Mirrors the detection logic in
 * search_ads_admin() so the UI can show a hint before the request returns.
 */
export function detectSearchType(raw: string): Exclude<SearchType, 'auto'> {
  const q = (raw || '').trim();
  if (!q) return 'title';

  if (EMAIL_RE.test(q)) return 'email';

  const digits = q.replace(/\D/g, '');
  if (!/[A-Za-z]/.test(q) && digits.length >= 6 && digits.length <= 15) return 'phone';

  if (UUID_RE.test(q)) return 'ad_id';

  // slug: multiple hyphen-separated alphanumeric tokens, no spaces
  if (/^[a-z0-9]+(-[a-z0-9]+)+$/i.test(q)) return 'slug';

  // ad id / reference: single token, no spaces, contains a digit
  if (!/\s/.test(q) && /[0-9]/.test(q)) return 'ad_id';

  return 'title';
}

export const SEARCH_TYPE_LABEL: Record<Exclude<SearchType, 'auto'>, string> = {
  ad_id: 'Ad ID',
  slug: 'Listing Slug',
  phone: 'Seller Phone',
  email: 'Seller Email',
  title: 'Title',
};

/** Run the universal search. */
export async function searchAds(params: AdSearchParams): Promise<AdSearchResult> {
  const pageSize = params.pageSize ?? 50;
  const page = Math.max(params.page ?? 1, 1);
  const offset = (page - 1) * pageSize;

  const { data, error } = await supabase.rpc('search_ads_admin', {
    p_query: params.query ?? '',
    p_type: params.type ?? 'auto',
    p_status: params.status && params.status.length ? params.status : null,
    p_category_id: params.categoryId ?? null,
    p_subcategory_id: params.subcategoryId ?? null,
    p_division: params.division ?? null,
    p_district: params.district ?? null,
    p_shop_id: params.shopId ?? null,
    p_date_from: params.dateFrom ?? null,
    p_date_to: params.dateTo ?? null,
    p_price_min: params.priceMin ?? null,
    p_price_max: params.priceMax ?? null,
    p_sort: params.sort ?? 'newest',
    p_limit: pageSize,
    p_offset: offset,
  } as never);

  if (error) throw error;

  const result = (data as unknown as AdSearchResult) || { total: 0, type: 'title', rows: [] };

  // Fire-and-forget audit log of the search (acting staff + query recorded server-side by trigger too)
  if ((params.query ?? '').trim()) {
    void logAudit({
      action: 'export',
      resourceType: 'ad_search',
      details: {
        query: params.query,
        detected_type: result.type,
        result_count: result.total,
      },
    });
  }

  return result;
}

export interface AdModerationAction {
  id: string;
  listing_id: string;
  moderator_id: string | null;
  moderator_name: string | null;
  moderator_role: string | null;
  action_type: string;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  reason: string | null;
  notes: string | null;
  version_number: number;
  created_at: string;
}

export interface AdDetails extends AdSearchRow {
  description: string | null;
  condition: string;
  rejection_message: string | null;
  images: { image_url: string; sort_order: number }[];
  history: AdModerationAction[];
}

/** Load the full detail bundle for the drawer. */
export async function getAdDetails(adId: string): Promise<AdDetails | null> {
  const [{ data: ad, error }, imagesRes, historyRes] = await Promise.all([
    supabase
      .from('ads')
      .select(
        `id, user_id, title, slug, description, price, price_type, condition, status,
         division, district, area, category_id, subcategory_id, contact_phone, secondary_phone,
         is_featured, is_premium, is_boosted, rejection_message, created_at, updated_at,
         categories:category_id ( name ),
         subcategories:subcategory_id ( name ),
         profiles:user_id ( full_name, email, phone_number, secondary_phone )`,
      )
      .eq('id', adId)
      .maybeSingle(),
    supabase.from('ad_images').select('image_url, sort_order').eq('ad_id', adId).order('sort_order'),
    supabase
      .from('moderation_actions')
      .select('*')
      .eq('listing_id', adId)
      .order('created_at', { ascending: false }),
  ]);

  if (error || !ad) return null;

  const a = ad as Record<string, any>;
  const seller = a.profiles || {};
  const category = a.categories || {};
  const subcategory = a.subcategories || {};

  return {
    id: a.id,
    user_id: a.user_id,
    title: a.title,
    slug: a.slug,
    description: a.description ?? null,
    condition: a.condition,
    price: a.price,
    price_type: a.price_type,
    status: a.status,
    division: a.division ?? null,
    district: a.district ?? null,
    area: a.area ?? null,
    category_id: a.category_id ?? null,
    subcategory_id: a.subcategory_id ?? null,
    category_name: category.name ?? null,
    subcategory_name: subcategory.name ?? null,
    seller_name: seller.full_name ?? null,
    seller_email: seller.email ?? null,
    seller_phone: seller.phone_number ?? null,
    seller_secondary_phone: seller.secondary_phone ?? null,
    contact_phone: a.contact_phone ?? null,
    secondary_phone: a.secondary_phone ?? null,
    is_featured: !!a.is_featured,
    is_premium: !!a.is_premium,
    is_boosted: !!a.is_boosted,
    rejection_message: a.rejection_message ?? null,
    thumbnail: (imagesRes.data?.[0] as any)?.image_url ?? null,
    created_at: a.created_at,
    updated_at: a.updated_at,
    images: (imagesRes.data as any[]) || [],
    history: (historyRes.data as AdModerationAction[]) || [],
  };
}

export type ModerateAction = 'approve' | 'reject' | 'delete' | 'restore' | 'boost' | 'unboost';

/** Backend-enforced + audited moderation. Permission is checked in Postgres. */
export async function moderateAd(
  adId: string,
  action: ModerateAction,
  reason?: string,
  note?: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('admin_moderate_ad', {
    p_ad_id: adId,
    p_action: action,
    p_reason: reason ?? null,
    p_note: note ?? null,
  } as never);

  if (error) return { ok: false, error: error.message };
  return { ok: !!(data as any)?.ok };
}

// -------------------------------------------------------------------------
// Filter option loaders
// -------------------------------------------------------------------------

export const AD_STATUS_OPTIONS = [
  'pending',
  'approved',
  'rejected',
  'sold',
  'expired',
  'draft',
  'boosted',
  'premium',
  'paused',
  'hidden',
  'archived',
] as const;

export async function loadCategories(): Promise<{ id: string; name: string }[]> {
  const { data } = await supabase.from('categories').select('id, name').order('name');
  return (data as any[]) || [];
}

export async function loadSubcategories(categoryId: string): Promise<{ id: string; name: string }[]> {
  const { data } = await supabase
    .from('subcategories')
    .select('id, name')
    .eq('category_id', categoryId)
    .order('name');
  return (data as any[]) || [];
}

export async function loadShops(): Promise<{ id: string; name: string }[]> {
  const { data } = await supabase.from('shops').select('id, name').order('name').limit(500);
  return (data as any[]) || [];
}

/** Status → badge colour classes (colored badges per spec). */
export function statusBadgeClass(status: string): string {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400 border-green-200 dark:border-green-500/20';
    case 'boosted':
      return 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400 border-violet-200 dark:border-violet-500/20';
    case 'premium':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-amber-200 dark:border-amber-500/20';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/20';
    case 'rejected':
      return 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400 border-red-200 dark:border-red-500/20';
    case 'expired':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400 border-orange-200 dark:border-orange-500/20';
    case 'sold':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 border-blue-200 dark:border-blue-500/20';
    case 'hidden':
    case 'archived':
    case 'paused':
      return 'bg-gray-200 text-gray-700 dark:bg-gray-500/15 dark:text-gray-300 border-gray-300 dark:border-gray-500/20';
    case 'draft':
    default:
      return 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300 border-slate-200 dark:border-slate-500/20';
  }
}
