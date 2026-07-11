/**
 * Seller membership, listing drafts, scheduling, vacation mode,
 * payout methods, transactions, shipping preferences, product templates,
 * bulk jobs, and performance insights for Phase 3.
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logAudit } from '@/lib/audit';
import type {
  ListingDraft,
  ListingDraftInsert,
  ListingDraftUpdate,
  ListingSchedule,
  ListingScheduleInsert,
  SellerVacationMode,
  SellerVacationModeUpdate,
  PayoutMethod,
  PayoutMethodInsert,
  Transaction,
  TransactionType,
  TransactionStatus,
  Payout,
  ProductTemplate,
  ProductTemplateInsert,
  BulkJob,
  BulkJobType,
  SellerShippingPreferences,
  SellerShippingPreferencesUpdate,
  ListingPerformanceInsight,
  ShopOrder,
} from '@/integrations/supabase/types_v3_shops';

// -------------------------------------------------------------------------
// Listing Drafts
// -------------------------------------------------------------------------

export async function createListingDraft(userId: string, data: ListingDraftInsert): Promise<ListingDraft | null> {
  try {
    const { data: draft, error } = await supabase
      .from('listing_drafts')
      .insert({ ...data, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    toast.success('Draft saved');
    return draft as ListingDraft;
  } catch (error) {
    console.error('createListingDraft error:', error);
    toast.error('Failed to save draft');
    return null;
  }
}

export async function getListingDrafts(userId: string): Promise<ListingDraft[]> {
  try {
    const { data, error } = await supabase
      .from('listing_drafts')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data as ListingDraft[]) || [];
  } catch (error) {
    console.error('getListingDrafts error:', error);
    return [];
  }
}

export async function getListingDraft(draftId: string): Promise<ListingDraft | null> {
  try {
    const { data, error } = await supabase
      .from('listing_drafts')
      .select('*')
      .eq('id', draftId)
      .maybeSingle();
    if (error) throw error;
    return data as ListingDraft | null;
  } catch (error) {
    console.error('getListingDraft error:', error);
    return null;
  }
}

export async function updateListingDraft(draftId: string, updates: ListingDraftUpdate): Promise<ListingDraft | null> {
  try {
    const { data, error } = await supabase
      .from('listing_drafts')
      .update(updates)
      .eq('id', draftId)
      .select()
      .single();
    if (error) throw error;
    return data as ListingDraft;
  } catch (error) {
    console.error('updateListingDraft error:', error);
    return null;
  }
}

export async function deleteListingDraft(draftId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('listing_drafts')
      .delete()
      .eq('id', draftId);
    if (error) throw error;
    toast.success('Draft deleted');
    return true;
  } catch (error) {
    console.error('deleteListingDraft error:', error);
    toast.error('Failed to delete draft');
    return false;
  }
}

export async function publishListingDraft(draftId: string): Promise<ListingDraft | null> {
  try {
    const { data, error } = await supabase
      .from('listing_drafts')
      .update({ status: 'published' })
      .eq('id', draftId)
      .select()
      .single();
    if (error) throw error;
    toast.success('Draft published');
    return data as ListingDraft;
  } catch (error) {
    console.error('publishListingDraft error:', error);
    toast.error('Failed to publish draft');
    return null;
  }
}

export async function scheduleListingDraft(draftId: string, scheduledAt: string): Promise<ListingDraft | null> {
  try {
    const { data, error } = await supabase
      .from('listing_drafts')
      .update({ status: 'scheduled', scheduled_at: scheduledAt })
      .eq('id', draftId)
      .select()
      .single();
    if (error) throw error;
    toast.success('Draft scheduled');
    return data as ListingDraft;
  } catch (error) {
    console.error('scheduleListingDraft error:', error);
    toast.error('Failed to schedule draft');
    return null;
  }
}

// -------------------------------------------------------------------------
// Listing Schedules
// -------------------------------------------------------------------------

export async function createListingSchedule(adId: string, userId: string, scheduledAt: string): Promise<ListingSchedule | null> {
  try {
    const { data, error } = await supabase
      .from('listing_schedules')
      .insert({ ad_id: adId, user_id: userId, scheduled_at: scheduledAt })
      .select()
      .single();
    if (error) throw error;
    toast.success('Listing scheduled');
    return data as ListingSchedule;
  } catch (error) {
    console.error('createListingSchedule error:', error);
    toast.error('Failed to schedule listing');
    return null;
  }
}

export async function getListingSchedules(userId: string): Promise<ListingSchedule[]> {
  try {
    const { data, error } = await supabase
      .from('listing_schedules')
      .select('*')
      .eq('user_id', userId)
      .order('scheduled_at', { ascending: true });
    if (error) throw error;
    return (data as ListingSchedule[]) || [];
  } catch (error) {
    console.error('getListingSchedules error:', error);
    return [];
  }
}

export async function cancelListingSchedule(scheduleId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('listing_schedules')
      .delete()
      .eq('id', scheduleId);
    if (error) throw error;
    toast.success('Schedule cancelled');
    return true;
  } catch (error) {
    console.error('cancelListingSchedule error:', error);
    toast.error('Failed to cancel schedule');
    return false;
  }
}

export async function markSchedulePublished(scheduleId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('listing_schedules')
      .update({ is_published: true, published_at: new Date().toISOString() })
      .eq('id', scheduleId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('markSchedulePublished error:', error);
    return false;
  }
}

// -------------------------------------------------------------------------
// Vacation Mode (for individual sellers)
// -------------------------------------------------------------------------

export async function getVacationMode(userId: string): Promise<SellerVacationMode | null> {
  try {
    const { data, error } = await supabase
      .from('seller_vacation_modes')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data as SellerVacationMode | null;
  } catch (error) {
    console.error('getVacationMode error:', error);
    return null;
  }
}

export async function setVacationMode(
  userId: string,
  isActive: boolean,
  message?: string,
  endsAt?: string
): Promise<SellerVacationMode | null> {
  try {
    const updates: SellerVacationModeUpdate = {
      is_active: isActive,
      message: message || null,
      starts_at: isActive ? new Date().toISOString() : null,
      ends_at: endsAt || null,
    };

    // Try update first
    const { data: updated, error: updateError } = await supabase
      .from('seller_vacation_modes')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (updated) return updated as SellerVacationMode;

    // If no row to update, insert
    if (updateError && updateError.code === 'PGRST116') {
      const { data: inserted, error: insertError } = await supabase
        .from('seller_vacation_modes')
        .insert({ user_id: userId, ...updates })
        .select()
        .single();

      if (insertError) throw insertError;
      toast.success(isActive ? 'Vacation mode enabled' : 'Vacation mode disabled');
      return inserted as SellerVacationMode;
    }

    if (updateError) throw updateError;
    toast.success(isActive ? 'Vacation mode enabled' : 'Vacation mode disabled');
    return updated as SellerVacationMode;
  } catch (error) {
    console.error('setVacationMode error:', error);
    toast.error('Failed to set vacation mode');
    return null;
  }
}

export async function toggleVacationMode(userId: string): Promise<SellerVacationMode | null> {
  try {
    const current = await getVacationMode(userId);
    const newActive = current ? !current.is_active : true;
    return setVacationMode(userId, newActive, current?.message || undefined);
  } catch (error) {
    console.error('toggleVacationMode error:', error);
    return null;
  }
}

// -------------------------------------------------------------------------
// Payout Methods
// -------------------------------------------------------------------------

export async function getPayoutMethods(userId: string): Promise<PayoutMethod[]> {
  try {
    const { data, error } = await supabase
      .from('payout_methods')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as PayoutMethod[]) || [];
  } catch (error) {
    console.error('getPayoutMethods error:', error);
    return [];
  }
}

export async function addPayoutMethod(userId: string, data: PayoutMethodInsert): Promise<PayoutMethod | null> {
  try {
    if (data.is_default) {
      // Unset other defaults
      await supabase
        .from('payout_methods')
        .update({ is_default: false })
        .eq('user_id', userId);
    }

    const { data: method, error } = await supabase
      .from('payout_methods')
      .insert({ ...data, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    toast.success('Payout method added');
    return method as PayoutMethod;
  } catch (error) {
    console.error('addPayoutMethod error:', error);
    toast.error('Failed to add payout method');
    return null;
  }
}

export async function updatePayoutMethod(methodId: string, updates: Partial<PayoutMethod>): Promise<PayoutMethod | null> {
  try {
    const { data, error } = await supabase
      .from('payout_methods')
      .update(updates)
      .eq('id', methodId)
      .select()
      .single();
    if (error) throw error;
    toast.success('Payout method updated');
    return data as PayoutMethod;
  } catch (error) {
    console.error('updatePayoutMethod error:', error);
    toast.error('Failed to update payout method');
    return null;
  }
}

export async function deletePayoutMethod(methodId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('payout_methods')
      .delete()
      .eq('id', methodId);
    if (error) throw error;
    toast.success('Payout method removed');
    return true;
  } catch (error) {
    console.error('deletePayoutMethod error:', error);
    toast.error('Failed to remove payout method');
    return false;
  }
}

export async function setDefaultPayoutMethod(userId: string, methodId: string): Promise<boolean> {
  try {
    await supabase
      .from('payout_methods')
      .update({ is_default: false })
      .eq('user_id', userId);

    const { error } = await supabase
      .from('payout_methods')
      .update({ is_default: true })
      .eq('id', methodId)
      .eq('user_id', userId);

    if (error) throw error;
    toast.success('Default payout method updated');
    return true;
  } catch (error) {
    console.error('setDefaultPayoutMethod error:', error);
    toast.error('Failed to set default payout method');
    return false;
  }
}

// -------------------------------------------------------------------------
// Transactions
// -------------------------------------------------------------------------

export async function getTransactions(
  userId: string,
  filters?: { type?: TransactionType; status?: TransactionStatus; limit?: number }
): Promise<Transaction[]> {
  try {
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (filters?.type) query = query.eq('transaction_type', filters.type);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.limit) query = query.limit(filters.limit);

    const { data, error } = await query;
    if (error) throw error;
    return (data as Transaction[]) || [];
  } catch (error) {
    console.error('getTransactions error:', error);
    return [];
  }
}

export async function getTransactionSummary(
  userId: string
): Promise<{ totalSales: number; totalFees: number; totalPayouts: number; netRevenue: number }> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('transaction_type, status, amount, fee, net_amount')
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (error) throw error;

    const summary = { totalSales: 0, totalFees: 0, totalPayouts: 0, netRevenue: 0 };
    for (const tx of data || []) {
      if (tx.transaction_type === 'sale') {
        summary.totalSales += Number(tx.amount || 0);
        summary.totalFees += Number(tx.fee || 0);
        summary.netRevenue += Number(tx.net_amount || 0);
      } else if (tx.transaction_type === 'payout') {
        summary.totalPayouts += Number(tx.amount || 0);
      }
    }
    return summary;
  } catch (error) {
    console.error('getTransactionSummary error:', error);
    return { totalSales: 0, totalFees: 0, totalPayouts: 0, netRevenue: 0 };
  }
}

// -------------------------------------------------------------------------
// Payouts
// -------------------------------------------------------------------------

export async function getPayouts(userId: string): Promise<Payout[]> {
  try {
    const { data, error } = await supabase
      .from('payouts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as Payout[]) || [];
  } catch (error) {
    console.error('getPayouts error:', error);
    return [];
  }
}

export async function requestPayout(
  userId: string,
  amount: number,
  payoutMethodId: string
): Promise<Payout | null> {
  try {
    if (amount <= 0) {
      toast.error('Payout amount must be greater than 0');
      return null;
    }

    // Verify payout method belongs to user
    const { data: method } = await supabase
      .from('payout_methods')
      .select('id')
      .eq('id', payoutMethodId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!method) {
      toast.error('Invalid payout method');
      return null;
    }

    const { data: payout, error } = await supabase
      .from('payouts')
      .insert({
        user_id: userId,
        payout_method_id: payoutMethodId,
        amount,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    toast.success('Payout requested');
    return payout as Payout;
  } catch (error) {
    console.error('requestPayout error:', error);
    toast.error('Failed to request payout');
    return null;
  }
}

// -------------------------------------------------------------------------
// Shipping Preferences
// -------------------------------------------------------------------------

export async function getShippingPreferences(userId: string): Promise<SellerShippingPreferences | null> {
  try {
    const { data, error } = await supabase
      .from('seller_shipping_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data as SellerShippingPreferences | null;
  } catch (error) {
    console.error('getShippingPreferences error:', error);
    return null;
  }
}

export async function updateShippingPreferences(
  userId: string,
  updates: SellerShippingPreferencesUpdate
): Promise<SellerShippingPreferences | null> {
  try {
    // Try update first
    const { data: updated, error: updateError } = await supabase
      .from('seller_shipping_preferences')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (updated) {
      toast.success('Shipping preferences updated');
      return updated as SellerShippingPreferences;
    }

    // If no row exists, insert with defaults
    if (updateError && updateError.code === 'PGRST116') {
      const { data: inserted, error: insertError } = await supabase
        .from('seller_shipping_preferences')
        .insert({ user_id: userId, ...updates })
        .select()
        .single();

      if (insertError) throw insertError;
      toast.success('Shipping preferences saved');
      return inserted as SellerShippingPreferences;
    }

    if (updateError) throw updateError;
    return updated as SellerShippingPreferences;
  } catch (error) {
    console.error('updateShippingPreferences error:', error);
    toast.error('Failed to update shipping preferences');
    return null;
  }
}

// -------------------------------------------------------------------------
// Product Templates
// -------------------------------------------------------------------------

export async function getProductTemplates(userId: string): Promise<ProductTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('product_templates')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data as ProductTemplate[]) || [];
  } catch (error) {
    console.error('getProductTemplates error:', error);
    return [];
  }
}

export async function createProductTemplate(userId: string, data: ProductTemplateInsert): Promise<ProductTemplate | null> {
  try {
    const { data: template, error } = await supabase
      .from('product_templates')
      .insert({ ...data, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    toast.success('Template created');
    return template as ProductTemplate;
  } catch (error) {
    console.error('createProductTemplate error:', error);
    toast.error('Failed to create template');
    return null;
  }
}

export async function updateProductTemplate(templateId: string, updates: Partial<ProductTemplate>): Promise<ProductTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('product_templates')
      .update(updates)
      .eq('id', templateId)
      .select()
      .single();
    if (error) throw error;
    toast.success('Template updated');
    return data as ProductTemplate;
  } catch (error) {
    console.error('updateProductTemplate error:', error);
    toast.error('Failed to update template');
    return null;
  }
}

export async function deleteProductTemplate(templateId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('product_templates')
      .delete()
      .eq('id', templateId);
    if (error) throw error;
    toast.success('Template deleted');
    return true;
  } catch (error) {
    console.error('deleteProductTemplate error:', error);
    toast.error('Failed to delete template');
    return false;
  }
}

// -------------------------------------------------------------------------
// Bulk Jobs
// -------------------------------------------------------------------------

export async function createBulkJob(userId: string, jobType: BulkJobType, fileUrl: string, shopId?: string): Promise<BulkJob | null> {
  try {
    const { data: job, error } = await supabase
      .from('bulk_jobs')
      .insert({
        user_id: userId,
        shop_id: shopId || null,
        job_type: jobType,
        file_url: fileUrl,
        status: 'queued',
      })
      .select()
      .single();
    if (error) throw error;
    toast.success(`${jobType === 'import' ? 'Import' : 'Export'} job created`);
    return job as BulkJob;
  } catch (error) {
    console.error('createBulkJob error:', error);
    toast.error('Failed to create bulk job');
    return null;
  }
}

export async function getBulkJobs(userId: string): Promise<BulkJob[]> {
  try {
    const { data, error } = await supabase
      .from('bulk_jobs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as BulkJob[]) || [];
  } catch (error) {
    console.error('getBulkJobs error:', error);
    return [];
  }
}

export async function getBulkJob(jobId: string): Promise<BulkJob | null> {
  try {
    const { data, error } = await supabase
      .from('bulk_jobs')
      .select('*')
      .eq('id', jobId)
      .maybeSingle();
    if (error) throw error;
    return data as BulkJob | null;
  } catch (error) {
    console.error('getBulkJob error:', error);
    return null;
  }
}

// -------------------------------------------------------------------------
// Listing Performance Insights
// -------------------------------------------------------------------------

export async function getListingPerformanceInsights(userId: string, adId?: string): Promise<ListingPerformanceInsight[]> {
  try {
    let query = supabase
      .from('listing_performance_insights')
      .select('*')
      .eq('user_id', userId)
      .order('stat_date', { ascending: false });

    if (adId) query = query.eq('ad_id', adId);

    const { data, error } = await query;
    if (error) throw error;
    return (data as ListingPerformanceInsight[]) || [];
  } catch (error) {
    console.error('getListingPerformanceInsights error:', error);
    return [];
  }
}

// -------------------------------------------------------------------------
// Shop Orders
// -------------------------------------------------------------------------

export async function getShopOrders(shopId: string, filters?: { status?: string; limit?: number }): Promise<ShopOrder[]> {
  try {
    let query = supabase
      .from('shop_orders')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.limit) query = query.limit(filters.limit);

    const { data, error } = await query;
    if (error) throw error;
    return (data as ShopOrder[]) || [];
  } catch (error) {
    console.error('getShopOrders error:', error);
    return [];
  }
}

export async function updateShopOrderStatus(orderId: string, status: string): Promise<ShopOrder | null> {
  try {
    const { data, error } = await supabase
      .from('shop_orders')
      .update({ status })
      .eq('id', orderId)
      .select()
      .single();
    if (error) throw error;
    toast.success('Order status updated');
    return data as ShopOrder;
  } catch (error) {
    console.error('updateShopOrderStatus error:', error);
    toast.error('Failed to update order status');
    return null;
  }
}
