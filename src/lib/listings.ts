/**
 * Advanced listing utilities: templates, variants, price history,
 * price drop alerts, ad status management, duplicate detection,
 * and condition grading.
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  ListingTemplate,
  ListingTemplateInsert,
  ListingVariant,
  ListingVariantInsert,
  ListingVariantUpdate,
  PriceHistory,
  PriceDropAlert,
  PriceDropAlertInsert,
  ConditionGrade,
} from '@/integrations/supabase/types_v2_listings';

// -------------------------------------------------------------------------
// Listing Templates
// -------------------------------------------------------------------------

export async function createListingTemplate(
  userId: string,
  template: Omit<ListingTemplateInsert, 'user_id'>
): Promise<ListingTemplate | null> {
  const { data, error } = await supabase
    .from('listing_templates')
    .insert({ ...template, user_id: userId })
    .select()
    .single();

  if (error) {
    toast.error('Failed to create template');
    console.error('createListingTemplate error:', error);
    return null;
  }
  toast.success('Template created');
  return data as ListingTemplate;
}

export async function getListingTemplates(userId: string): Promise<ListingTemplate[]> {
  const { data, error } = await supabase
    .from('listing_templates')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getListingTemplates error:', error);
    return [];
  }
  return (data as ListingTemplate[]) || [];
}

export async function deleteListingTemplate(templateId: string): Promise<boolean> {
  const { error } = await supabase
    .from('listing_templates')
    .delete()
    .eq('id', templateId);

  if (error) {
    toast.error('Failed to delete template');
    console.error('deleteListingTemplate error:', error);
    return false;
  }
  toast.success('Template deleted');
  return true;
}

export async function applyTemplate(
  templateId: string
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from('listing_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) {
    toast.error('Failed to apply template');
    console.error('applyTemplate error:', error);
    return null;
  }

  const template = data as ListingTemplate;
  return {
    category_id: template.category_id,
    ...template.default_fields,
  };
}

// -------------------------------------------------------------------------
// Listing Variants
// -------------------------------------------------------------------------

export async function addVariant(
  adId: string,
  variant: Omit<ListingVariantInsert, 'ad_id'>
): Promise<ListingVariant | null> {
  const { data, error } = await supabase
    .from('listing_variants')
    .insert({ ...variant, ad_id: adId })
    .select()
    .single();

  if (error) {
    toast.error('Failed to add variant');
    console.error('addVariant error:', error);
    return null;
  }
  toast.success('Variant added');
  return data as ListingVariant;
}

export async function updateVariant(
  variantId: string,
  updates: ListingVariantUpdate
): Promise<ListingVariant | null> {
  const { data, error } = await supabase
    .from('listing_variants')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', variantId)
    .select()
    .single();

  if (error) {
    toast.error('Failed to update variant');
    console.error('updateVariant error:', error);
    return null;
  }
  toast.success('Variant updated');
  return data as ListingVariant;
}

export async function removeVariant(variantId: string): Promise<boolean> {
  const { error } = await supabase
    .from('listing_variants')
    .delete()
    .eq('id', variantId);

  if (error) {
    toast.error('Failed to remove variant');
    console.error('removeVariant error:', error);
    return false;
  }
  toast.success('Variant removed');
  return true;
}

export async function getVariants(adId: string): Promise<ListingVariant[]> {
  const { data, error } = await supabase
    .from('listing_variants')
    .select('*')
    .eq('ad_id', adId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('getVariants error:', error);
    return [];
  }
  return (data as ListingVariant[]) || [];
}

// -------------------------------------------------------------------------
// Price History & Alerts
// -------------------------------------------------------------------------

export async function recordPriceChange(
  adId: string,
  oldPrice: number | null,
  newPrice: number | null
): Promise<PriceHistory | null> {
  const { data, error } = await supabase
    .from('price_history')
    .insert({ ad_id: adId, old_price: oldPrice, new_price: newPrice })
    .select()
    .single();

  if (error) {
    console.error('recordPriceChange error:', error);
    return null;
  }
  return data as PriceHistory;
}

export async function getPriceHistory(adId: string): Promise<PriceHistory[]> {
  const { data, error } = await supabase
    .from('price_history')
    .select('*')
    .eq('ad_id', adId)
    .order('changed_at', { ascending: false });

  if (error) {
    console.error('getPriceHistory error:', error);
    return [];
  }
  return (data as PriceHistory[]) || [];
}

export async function createPriceDropAlert(
  userId: string,
  adId: string,
  targetPrice: number
): Promise<PriceDropAlert | null> {
  const payload: PriceDropAlertInsert = {
    user_id: userId,
    ad_id: adId,
    target_price: targetPrice,
  };
  const { data, error } = await supabase
    .from('price_drop_alerts')
    .insert(payload)
    .select()
    .single();

  if (error) {
    toast.error('Failed to create price alert');
    console.error('createPriceDropAlert error:', error);
    return null;
  }
  toast.success('Price drop alert created');
  return data as PriceDropAlert;
}

export async function checkPriceDrops(): Promise<number> {
  // Fetch all un-notified alerts
  const { data: alerts, error } = await supabase
    .from('price_drop_alerts')
    .select('*, ads(id, price, title)')
    .eq('notified', false);

  if (error) {
    console.error('checkPriceDrops error:', error);
    return 0;
  }

  let notifiedCount = 0;
  for (const alert of alerts || []) {
    const ad = alert.ads as { id: string; price: number | null; title: string } | null;
    if (ad && ad.price !== null && ad.price <= alert.target_price) {
      // Send notification
      await supabase
        .from('notifications')
        .insert({
          user_id: alert.user_id,
          type: 'system',
          title: 'Price Drop Alert',
          message: `"${ad.title}" has dropped to ৳${ad.price} (your target: ৳${alert.target_price})`,
          data: { ad_id: ad.id, alert_id: alert.id },
        })
        .catch(() => {});

      // Mark as notified
      await supabase
        .from('price_drop_alerts')
        .update({ notified: true })
        .eq('id', alert.id)
        .catch(() => {});

      notifiedCount++;
    }
  }
  return notifiedCount;
}

// -------------------------------------------------------------------------
// Ad Status Management
// -------------------------------------------------------------------------

export async function updateAdStatus(
  adId: string,
  status: 'sold' | 'reserved' | 'archived' | 'approved' | 'pending' | 'draft'
): Promise<boolean> {
  const { error } = await supabase
    .from('ads')
    .update({ status })
    .eq('id', adId);

  if (error) {
    toast.error('Failed to update ad status');
    console.error('updateAdStatus error:', error);
    return false;
  }
  toast.success(`Ad marked as ${status}`);
  return true;
}

export async function autoArchiveExpiredAds(): Promise<number> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('ads')
    .update({ status: 'expired' })
    .lt('expires_at', now)
    .in('status', ['approved', 'boosted', 'premium'])
    .select('id');

  if (error) {
    console.error('autoArchiveExpiredAds error:', error);
    return 0;
  }
  return data?.length || 0;
}

// -------------------------------------------------------------------------
// Duplicate Listing Detection
// -------------------------------------------------------------------------

export async function detectDuplicateListing(adId: string): Promise<{
  isDuplicate: boolean;
  duplicates: { id: string; title: string; similarity: number }[];
}> {
  // Fetch the target ad
  const { data: ad, error: adError } = await supabase
    .from('ads')
    .select('id, user_id, title, description')
    .eq('id', adId)
    .single();

  if (adError || !ad) {
    return { isDuplicate: false, duplicates: [] };
  }

  // Fetch other ads by the same user
  const { data: userAds, error: listError } = await supabase
    .from('ads')
    .select('id, title, description')
    .eq('user_id', ad.user_id)
    .neq('id', adId)
    .neq('status', 'sold')
    .neq('status', 'archived');

  if (listError || !userAds) {
    return { isDuplicate: false, duplicates: [] };
  }

  const targetWords = new Set(tokenize(ad.title + ' ' + (ad.description || '')));
  const duplicates: { id: string; title: string; similarity: number }[] = [];

  for (const other of userAds) {
    const otherWords = new Set(tokenize(other.title + ' ' + (other.description || '')));
    const similarity = jaccardSimilarity(targetWords, otherWords);
    if (similarity >= 0.7) {
      duplicates.push({
        id: other.id,
        title: other.title,
        similarity: Math.round(similarity * 100) / 100,
      });
    }
  }

  return {
    isDuplicate: duplicates.length > 0,
    duplicates: duplicates.sort((a, b) => b.similarity - a.similarity),
  };
}

// -------------------------------------------------------------------------
// Condition Grading
// -------------------------------------------------------------------------

export function gradeCondition(condition: string): {
  grade: ConditionGrade;
  label: string;
  description: string;
  score: number;
} {
  const lower = condition.toLowerCase();
  const grades: Record<ConditionGrade, { label: string; description: string; score: number }> = {
    new: { label: 'New', description: 'Brand new, never used, original packaging', score: 100 },
    like_new: { label: 'Like New', description: 'Excellent condition, barely used', score: 85 },
    good: { label: 'Good', description: 'Good condition with minor signs of use', score: 70 },
    fair: { label: 'Fair', description: 'Fair condition, visible wear but functional', score: 50 },
    poor: { label: 'Poor', description: 'Poor condition, significant wear', score: 25 },
  };

  if (lower === 'new' || lower === 'brand new' || lower === 'mint') {
    return { grade: 'new', ...grades.new };
  }
  if (lower === 'like new' || lower === 'excellent' || lower === 'used') {
    return { grade: 'like_new', ...grades.like_new };
  }
  if (lower === 'good' || lower === 'fairly used') {
    return { grade: 'good', ...grades.good };
  }
  if (lower === 'fair' || lower === 'acceptable') {
    return { grade: 'fair', ...grades.fair };
  }
  if (lower === 'poor' || lower === 'bad' || lower === 'damaged') {
    return { grade: 'poor', ...grades.poor };
  }

  // Default to 'good' for unknown conditions
  return { grade: 'good', ...grades.good };
}

// -------------------------------------------------------------------------
// Helper functions
// -------------------------------------------------------------------------

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}
