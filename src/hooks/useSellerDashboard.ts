import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  getSellerAnalytics as getSellerAnalyticsFn,
  getListingPerformance as getListingPerformanceFn,
  getViewTrends as getViewTrendsFn,
  getResponseMetrics as getResponseMetricsFn,
  getRevenueCharts as getRevenueChartsFn,
  getFollowers as getFollowersFn,
  getRepeatBuyers as getRepeatBuyersFn,
  getConversionRate as getConversionRateFn,
  SellerAnalyticsData,
  ListingPerformance,
  ViewTrendPoint,
  ResponseMetrics,
  RevenueChartPoint,
  FollowerInfo,
  RepeatBuyer,
} from '@/lib/sellerDashboard';

export function useSellerDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<SellerAnalyticsData | null>(null);
  const [listingPerformance, setListingPerformance] = useState<ListingPerformance[]>([]);
  const [viewTrends, setViewTrends] = useState<ViewTrendPoint[]>([]);
  const [responseMetrics, setResponseMetrics] = useState<ResponseMetrics | null>(null);
  const [revenueCharts, setRevenueCharts] = useState<RevenueChartPoint[]>([]);
  const [followers, setFollowers] = useState<FollowerInfo[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [repeatBuyers, setRepeatBuyers] = useState<RepeatBuyer[]>([]);
  const [conversionRate, setConversionRate] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (dateRange: { start: string; end: string }) => {
    if (!user) return;
    const { data, error } = await getSellerAnalyticsFn(user.id, dateRange);
    if (error) {
      setError(error.message);
    } else if (data) {
      setAnalytics(data);
    }
  }, [user]);

  const fetchListingPerformance = useCallback(async () => {
    if (!user) return;
    const { data, error } = await getListingPerformanceFn(user.id);
    if (error) {
      setError(error.message);
    } else if (data) {
      setListingPerformance(data);
    }
  }, [user]);

  const fetchViewTrends = useCallback(async (period: '7d' | '30d' | '90d') => {
    if (!user) return;
    const { data, error } = await getViewTrendsFn(user.id, period);
    if (error) {
      setError(error.message);
    } else if (data) {
      setViewTrends(data);
    }
  }, [user]);

  const fetchResponseMetrics = useCallback(async () => {
    if (!user) return;
    const data = await getResponseMetricsFn(user.id);
    setResponseMetrics(data);
  }, [user]);

  const fetchRevenueCharts = useCallback(async (period: '7d' | '30d' | '90d') => {
    if (!user) return;
    const data = await getRevenueChartsFn(user.id, period);
    setRevenueCharts(data);
  }, [user]);

  const fetchFollowers = useCallback(async () => {
    if (!user) return;
    const { followers, count } = await getFollowersFn(user.id);
    setFollowers(followers);
    setFollowerCount(count);
  }, [user]);

  const fetchRepeatBuyers = useCallback(async () => {
    if (!user) return;
    const { repeatBuyers } = await getRepeatBuyersFn(user.id);
    setRepeatBuyers(repeatBuyers);
  }, [user]);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await Promise.all([
      fetchAnalytics({ start: thirtyDaysAgo.toISOString().split('T')[0], end: now.toISOString().split('T')[0] }),
      fetchListingPerformance(),
      fetchViewTrends('30d'),
      fetchResponseMetrics(),
      fetchRevenueCharts('30d'),
      fetchFollowers(),
      fetchRepeatBuyers(),
    ]);

    const rate = await getConversionRateFn(user.id);
    setConversionRate(rate);

    setIsLoading(false);
  }, [user, fetchAnalytics, fetchListingPerformance, fetchViewTrends, fetchResponseMetrics, fetchRevenueCharts, fetchFollowers, fetchRepeatBuyers]);

  useEffect(() => {
    if (user) {
      fetchAll();
    }
  }, [user, fetchAll]);

  return {
    analytics,
    listingPerformance,
    viewTrends,
    responseMetrics,
    revenueCharts,
    followers,
    followerCount,
    repeatBuyers,
    conversionRate,
    isLoading,
    error,
    fetchAnalytics,
    fetchListingPerformance,
    fetchViewTrends,
    fetchResponseMetrics,
    fetchRevenueCharts,
    fetchFollowers,
    refetch: fetchAll,
  };
}
