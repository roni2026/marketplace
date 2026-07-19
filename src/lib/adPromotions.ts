/**
 * Ad Promotion System — client library.
 *
 * Wraps the `promotion_types` catalog (admin-configurable) and the
 * `ad_promotions` activations, plus the SECURITY DEFINER RPCs
 * (`activate_ad_promotion`, `cancel_ad_promotion`, `get_active_ad_promotions`).
 */

import { supabase } from '@/integrations/supabase/client';

export type PromotionStatus = 'pending' | 'active' | 'expired' | 'cancelled';

export interface PromotionType {
  id: string;
  key: string;
  name: string;
  description: string | null;
  badge_label: string | null;
  badge_color: string;
  icon: string | null;
  placement: string;
  priority: number;
  default_duration_days: number;
  price: number;
  currency: string;
  benefits: string[];
  max_active_slots: number | null;
  is_slot_limited: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AdPromotion {
  id: string;
  ad_id: string;
  promotion_type_id: string | null;
  promotion_key: string;
  user_id: string | null;
  status: PromotionStatus;
  priority: number;
  placement: string | null;
  starts_at: string;
  ends_at: string | null;
  duration_days: number | null;
  price_paid: number;
  currency: string;
  auto_refresh: boolean;
  last_refreshed_at: string | null;
  created_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** Input for creating/updating a promotion type (admin). */
export interface PromotionTypeInput {
  key: string;
  name: string;
  description?: string | null;
  badge_label?: string | null;
  badge_color?: string;
  icon?: string | null;
  placement?: string;
  priority?: number;
  default_duration_days?: number;
  price?: number;
  currency?: string;
  benefits?: string[];
  max_active_slots?: number | null;
  is_slot_limited?: boolean;
  is_active?: boolean;
  sort_order?: number;
}

function normalizeType(row: Record<string, unknown>): PromotionType {
  const benefitsRaw = row.benefits;
  let benefits: string[] = [];
  if (Array.isArray(benefitsRaw)) benefits = benefitsRaw as string[];
  else if (typeof benefitsRaw === 'string') {
    try { benefits = JSON.parse(benefitsRaw); } catch { benefits = []; }
  }
  return { ...(row as unknown as PromotionType), benefits };
}

// -------------------------------------------------------------------------
// Catalog
// -------------------------------------------------------------------------

export async function listPromotionTypes(opts?: { activeOnly?: boolean }): Promise<PromotionType[]> {
  let q = supabase.from('promotion_types').select('*').order('sort_order', { ascending: true });
  if (opts?.activeOnly) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw error;
  return ((data as Record<string, unknown>[]) || []).map(normalizeType);
}

export async function upsertPromotionType(
  input: PromotionTypeInput & { id?: string },
): Promise<{ data: PromotionType | null; error: Error | null }> {
  try {
    const payload: Record<string, unknown> = { ...input };
    // Ensure benefits is stored as jsonb array
    if (input.benefits) payload.benefits = input.benefits;
    const { data, error } = input.id
      ? await supabase.from('promotion_types').update(payload).eq('id', input.id).select().single()
      : await supabase.from('promotion_types').insert(payload).select().single();
    if (error) throw error;
    return { data: normalizeType(data as Record<string, unknown>), error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export async function setPromotionTypeActive(id: string, isActive: boolean): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('promotion_types').update({ is_active: isActive }).eq('id', id);
  return { error: (error as Error) || null };
}

export async function deletePromotionType(id: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('promotion_types').delete().eq('id', id);
  return { error: (error as Error) || null };
}

// -------------------------------------------------------------------------
// Activations
// -------------------------------------------------------------------------

export async function getActivePromotions(adId: string): Promise<AdPromotion[]> {
  const { data, error } = await supabase.rpc('get_active_ad_promotions', { p_ad_id: adId } as never);
  if (error) throw error;
  return (data as unknown as AdPromotion[]) || [];
}

export interface PromotionBadgeInfo {
  promotion_key: string;
  badge_label: string | null;
  badge_color: string | null;
  priority: number;
}

/** Active promotions for an ad joined with their catalog badge styling. */
export async function getAdPromotionBadges(adId: string): Promise<PromotionBadgeInfo[]> {
  const { data, error } = await supabase
    .from('ad_promotions')
    .select('promotion_key, priority, status, ends_at, promotion_types(badge_label, badge_color)')
    .eq('ad_id', adId)
    .eq('status', 'active')
    .order('priority', { ascending: false });
  if (error) throw error;
  const now = Date.now();
  return ((data as Record<string, any>[]) || [])
    .filter((r) => !r.ends_at || new Date(r.ends_at).getTime() > now)
    .map((r) => ({
      promotion_key: r.promotion_key,
      badge_label: r.promotion_types?.badge_label ?? null,
      badge_color: r.promotion_types?.badge_color ?? null,
      priority: r.priority ?? 0,
    }));
}

export async function getAdPromotionHistory(adId: string): Promise<AdPromotion[]> {
  const { data, error } = await supabase
    .from('ad_promotions')
    .select('*')
    .eq('ad_id', adId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as AdPromotion[]) || [];
}

export async function activatePromotion(
  adId: string,
  promotionKey: string,
  opts?: { autoRefresh?: boolean; durationDays?: number | null },
): Promise<{ data: AdPromotion | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('activate_ad_promotion', {
    p_ad_id: adId,
    p_promotion_key: promotionKey,
    p_auto_refresh: opts?.autoRefresh ?? false,
    p_duration_days: opts?.durationDays ?? null,
  } as never);
  if (error) return { data: null, error: error as Error };
  return { data: (data as unknown as AdPromotion) ?? null, error: null };
}

export async function cancelPromotion(promotionId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.rpc('cancel_ad_promotion', { p_promotion_id: promotionId } as never);
  return { error: (error as Error) || null };
}

// -------------------------------------------------------------------------
// UI helpers
// -------------------------------------------------------------------------

/** Tailwind classes for a promotion badge, keyed by badge_color token. */
export function promotionBadgeClass(color: string): string {
  const map: Record<string, string> = {
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
    red: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400 border-red-200 dark:border-red-500/20',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400 border-violet-200 dark:border-violet-500/20',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    teal: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400 border-teal-200 dark:border-teal-500/20',
    sky: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400 border-sky-200 dark:border-sky-500/20',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/20',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border-rose-200 dark:border-rose-500/20',
    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20',
    cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/20',
    lime: 'bg-lime-100 text-lime-800 dark:bg-lime-500/15 dark:text-lime-400 border-lime-200 dark:border-lime-500/20',
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300 border-slate-200 dark:border-slate-500/20',
  };
  return map[color] || map.slate;
}

export function formatPromotionPrice(price: number, currency = 'BDT'): string {
  if (!price || price <= 0) return 'Free';
  const symbol = currency === 'BDT' ? '৳' : `${currency} `;
  return `${symbol}${new Intl.NumberFormat('en-BD').format(price)}`;
}

/** Distinct color tokens the admin UI can offer. */
export const PROMOTION_BADGE_COLORS = [
  'slate', 'amber', 'blue', 'red', 'violet', 'emerald',
  'teal', 'sky', 'yellow', 'rose', 'indigo', 'cyan', 'lime',
] as const;

/** Placement options the admin UI can offer. */
export const PROMOTION_PLACEMENTS = [
  'listing',
  'search_results',
  'category_page',
  'homepage',
  'homepage_banner',
  'location',
] as const;
