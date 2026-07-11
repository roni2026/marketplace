import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  getListingDrafts,
  createListingDraft as createDraftFn,
  updateListingDraft as updateDraftFn,
  deleteListingDraft as deleteDraftFn,
  publishListingDraft as publishDraftFn,
  scheduleListingDraft as scheduleDraftFn,
  getListingSchedules,
  cancelListingSchedule as cancelScheduleFn,
  getVacationMode,
  setVacationMode as setVacationFn,
  toggleVacationMode as toggleVacationFn,
  getPayoutMethods,
  addPayoutMethod as addPayoutFn,
  deletePayoutMethod as deletePayoutFn,
  setDefaultPayoutMethod as setDefaultPayoutFn,
  getTransactions,
  getTransactionSummary,
  getPayouts,
  requestPayout as requestPayoutFn,
  getShippingPreferences,
  updateShippingPreferences as updateShippingFn,
  getProductTemplates,
  createProductTemplate as createTemplateFn,
  deleteProductTemplate as deleteTemplateFn,
  getBulkJobs,
  getListingPerformanceInsights,
} from '@/lib/sellerMembership';
import type {
  ListingDraft,
  ListingDraftInsert,
  ListingDraftUpdate,
  ListingSchedule,
  SellerVacationMode,
  PayoutMethod,
  PayoutMethodInsert,
  Transaction,
  Payout,
  ProductTemplate,
  ProductTemplateInsert,
  BulkJob,
  ListingPerformanceInsight,
  SellerShippingPreferences,
  SellerShippingPreferencesUpdate,
} from '@/integrations/supabase/types_v3_shops';

export function useSellerFeatures() {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState<ListingDraft[]>([]);
  const [schedules, setSchedules] = useState<ListingSchedule[]>([]);
  const [vacationMode, setVacationModeState] = useState<SellerVacationMode | null>(null);
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionSummary, setTransactionSummary] = useState({
    totalSales: 0, totalFees: 0, totalPayouts: 0, netRevenue: 0,
  });
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [shippingPrefs, setShippingPrefs] = useState<SellerShippingPreferences | null>(null);
  const [productTemplates, setProductTemplates] = useState<ProductTemplate[]>([]);
  const [bulkJobs, setBulkJobs] = useState<BulkJob[]>([]);
  const [performanceInsights, setPerformanceInsights] = useState<ListingPerformanceInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [
        draftsData,
        schedulesData,
        vacationData,
        payoutMethodsData,
        transactionsData,
        summary,
        payoutsData,
        shippingData,
        templatesData,
        jobsData,
        insightsData,
      ] = await Promise.all([
        getListingDrafts(user.id),
        getListingSchedules(user.id),
        getVacationMode(user.id),
        getPayoutMethods(user.id),
        getTransactions(user.id, { limit: 50 }),
        getTransactionSummary(user.id),
        getPayouts(user.id),
        getShippingPreferences(user.id),
        getProductTemplates(user.id),
        getBulkJobs(user.id),
        getListingPerformanceInsights(user.id),
      ]);

      setDrafts(draftsData);
      setSchedules(schedulesData);
      setVacationModeState(vacationData);
      setPayoutMethods(payoutMethodsData);
      setTransactions(transactionsData);
      setTransactionSummary(summary);
      setPayouts(payoutsData);
      setShippingPrefs(shippingData);
      setProductTemplates(templatesData);
      setBulkJobs(jobsData);
      setPerformanceInsights(insightsData);
    } catch (err) {
      console.error('useSellerFeatures fetchAll error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const createDraft = useCallback(
    async (data: ListingDraftInsert): Promise<ListingDraft | null> => {
      if (!user) return null;
      const result = await createDraftFn(user.id, data);
      if (result) setDrafts((prev) => [result, ...prev]);
      return result;
    },
    [user]
  );

  const updateDraft = useCallback(
    async (draftId: string, updates: ListingDraftUpdate): Promise<ListingDraft | null> => {
      const result = await updateDraftFn(draftId, updates);
      if (result) setDrafts((prev) => prev.map((d) => (d.id === draftId ? result : d)));
      return result;
    },
    []
  );

  const deleteDraft = useCallback(async (draftId: string): Promise<boolean> => {
    const success = await deleteDraftFn(draftId);
    if (success) setDrafts((prev) => prev.filter((d) => d.id !== draftId));
    return success;
  }, []);

  const publishDraft = useCallback(async (draftId: string): Promise<ListingDraft | null> => {
    const result = await publishDraftFn(draftId);
    if (result) setDrafts((prev) => prev.map((d) => (d.id === draftId ? result : d)));
    return result;
  }, []);

  const scheduleDraft = useCallback(async (draftId: string, scheduledAt: string): Promise<ListingDraft | null> => {
    const result = await scheduleDraftFn(draftId, scheduledAt);
    if (result) setDrafts((prev) => prev.map((d) => (d.id === draftId ? result : d)));
    return result;
  }, []);

  const cancelSchedule = useCallback(async (scheduleId: string): Promise<boolean> => {
    const success = await cancelScheduleFn(scheduleId);
    if (success) setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
    return success;
  }, []);

  const setVacationMode = useCallback(
    async (isActive: boolean, message?: string, endsAt?: string): Promise<SellerVacationMode | null> => {
      if (!user) return null;
      const result = await setVacationFn(user.id, isActive, message, endsAt);
      if (result) setVacationModeState(result);
      return result;
    },
    [user]
  );

  const toggleVacation = useCallback(async (): Promise<SellerVacationMode | null> => {
    if (!user) return null;
    const result = await toggleVacationFn(user.id);
    if (result) setVacationModeState(result);
    return result;
  }, [user]);

  const addPayoutMethod = useCallback(
    async (data: PayoutMethodInsert): Promise<PayoutMethod | null> => {
      if (!user) return null;
      const result = await addPayoutFn(user.id, data);
      if (result) {
        setPayoutMethods((prev) => [result, ...prev]);
        await fetchAll(); // Refresh to update defaults
      }
      return result;
    },
    [user, fetchAll]
  );

  const deletePayoutMethod = useCallback(async (methodId: string): Promise<boolean> => {
    const success = await deletePayoutFn(methodId);
    if (success) setPayoutMethods((prev) => prev.filter((m) => m.id !== methodId));
    return success;
  }, []);

  const setDefaultPayout = useCallback(
    async (methodId: string): Promise<boolean> => {
      if (!user) return false;
      const success = await setDefaultPayoutFn(user.id, methodId);
      if (success) {
        setPayoutMethods((prev) =>
          prev.map((m) => ({ ...m, is_default: m.id === methodId }))
        );
      }
      return success;
    },
    [user]
  );

  const requestPayout = useCallback(
    async (amount: number, methodId: string): Promise<Payout | null> => {
      if (!user) return null;
      const result = await requestPayoutFn(user.id, amount, methodId);
      if (result) setPayouts((prev) => [result, ...prev]);
      return result;
    },
    [user]
  );

  const updateShippingPrefs = useCallback(
    async (updates: SellerShippingPreferencesUpdate): Promise<SellerShippingPreferences | null> => {
      if (!user) return null;
      const result = await updateShippingFn(user.id, updates);
      if (result) setShippingPrefs(result);
      return result;
    },
    [user]
  );

  const createTemplate = useCallback(
    async (data: ProductTemplateInsert): Promise<ProductTemplate | null> => {
      if (!user) return null;
      const result = await createTemplateFn(user.id, data);
      if (result) setProductTemplates((prev) => [result, ...prev]);
      return result;
    },
    [user]
  );

  const deleteTemplate = useCallback(async (templateId: string): Promise<boolean> => {
    const success = await deleteTemplateFn(templateId);
    if (success) setProductTemplates((prev) => prev.filter((t) => t.id !== templateId));
    return success;
  }, []);

  useEffect(() => {
    if (user) {
      fetchAll();
    } else {
      setIsLoading(false);
    }
  }, [user, fetchAll]);

  return {
    drafts,
    schedules,
    vacationMode,
    payoutMethods,
    transactions,
    transactionSummary,
    payouts,
    shippingPrefs,
    productTemplates,
    bulkJobs,
    performanceInsights,
    isLoading,
    fetchAll,
    createDraft,
    updateDraft,
    deleteDraft,
    publishDraft,
    scheduleDraft,
    cancelSchedule,
    setVacationMode,
    toggleVacation,
    addPayoutMethod,
    deletePayoutMethod,
    setDefaultPayout,
    requestPayout,
    updateShippingPrefs,
    createTemplate,
    deleteTemplate,
  };
}
