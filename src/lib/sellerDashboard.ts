import { supabase } from '@/integrations/supabase/client';

export interface SellerAnalyticsData {
  views: number;
  inquiries: number;
  offers: number;
  conversions: number;
  revenue: number;
}

export interface ListingPerformance {
  ad_id: string;
  title: string;
  views: number;
  inquiries: number;
  offers: number;
  favorites: number;
  status: string;
  created_at: string;
}

export interface ViewTrendPoint {
  date: string;
  views: number;
}

export interface ResponseMetrics {
  responseRate: number;
  averageResponseTime: number;
  totalResponses: number;
}

export interface RevenueChartPoint {
  date: string;
  revenue: number;
}

export interface FollowerInfo {
  follower_id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface RepeatBuyer {
  buyer_id: string;
  full_name: string | null;
  avatar_url: string | null;
  purchaseCount: number;
  totalSpent: number;
}

export interface PromotionInfo {
  ad_id: string;
  title: string;
  type: string;
  start_date: string;
  end_date: string;
}

// --- Get Seller Analytics ---

export async function getSellerAnalytics(userId: string, dateRange: { start: string; end: string }) {
  const { data, error } = await supabase
    .from('seller_analytics')
    .select('*')
    .eq('user_id', userId)
    .gte('date', dateRange.start)
    .lte('date', dateRange.end)
    .order('date', { ascending: true });

  if (error) return { data: null, error };

  const aggregated: SellerAnalyticsData = (data || []).reduce(
    (acc, row) => ({
      views: acc.views + (row.views || 0),
      inquiries: acc.inquiries + (row.inquiries || 0),
      offers: acc.offers + (row.offers || 0),
      conversions: acc.conversions + (row.conversions || 0),
      revenue: acc.revenue + Number(row.revenue || 0),
    }),
    { views: 0, inquiries: 0, offers: 0, conversions: 0, revenue: 0 }
  );

  return { data: aggregated, error: null };
}

// --- Get Listing Performance ---

export async function getListingPerformance(userId: string) {
  const { data, error } = await supabase
    .from('ads')
    .select(`
      id,
      title,
      status,
      views_count,
      offers_count,
      favorites_count,
      created_at,
      ad_stats(views, messages, offers, favorites)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return { data: null, error };

  const performance: ListingPerformance[] = (data || []).map((ad: any) => ({
    ad_id: ad.id,
    title: ad.title,
    views: ad.views_count || 0,
    inquiries: ad.ad_stats?.[0]?.messages || 0,
    offers: ad.offers_count || 0,
    favorites: ad.favorites_count || 0,
    status: ad.status,
    created_at: ad.created_at,
  }));

  return { data: performance, error: null };
}

// --- Get View Trends ---

export async function getViewTrends(userId: string, period: '7d' | '30d' | '90d') {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('seller_analytics')
    .select('date, views')
    .eq('user_id', userId)
    .gte('date', startDateStr)
    .order('date', { ascending: true });

  if (error) return { data: null, error };

  const trends: ViewTrendPoint[] = (data || []).map((row: any) => ({
    date: row.date,
    views: row.views || 0,
  }));

  return { data: trends, error: null };
}

// --- Get Response Metrics ---

export async function getResponseMetrics(userId: string): Promise<ResponseMetrics> {
  const { data: messages } = await supabase
    .from('messages')
    .select('id, sender_id, receiver_id, created_at, is_read, read_at')
    .eq('receiver_id', userId)
    .order('created_at', { ascending: false })
    .limit(500);

  const allMessages = messages || [];
  const total = allMessages.length;
  const responded = allMessages.filter((m: any) => m.is_read).length;
  const responseRate = total > 0 ? (responded / total) * 100 : 0;

  let totalResponseTime = 0;
  let responseCount = 0;
  for (const msg of allMessages) {
    if (msg.is_read && msg.read_at) {
      const diff = new Date(msg.read_at).getTime() - new Date(msg.created_at).getTime();
      if (diff > 0) {
        totalResponseTime += diff;
        responseCount++;
      }
    }
  }
  const averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount / 3600000 : 0;

  return {
    responseRate: Math.round(responseRate * 100) / 100,
    averageResponseTime: Math.round(averageResponseTime * 100) / 100,
    totalResponses: responded,
  };
}

// --- Get Revenue Charts ---

export async function getRevenueCharts(userId: string, period: '7d' | '30d' | '90d'): Promise<RevenueChartPoint[]> {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('seller_analytics')
    .select('date, revenue')
    .eq('user_id', userId)
    .gte('date', startDateStr)
    .order('date', { ascending: true });

  if (error || !data) return [];

  return data.map((row: any) => ({
    date: row.date,
    revenue: Number(row.revenue || 0),
  }));
}

// --- Get Profile Visitors ---

export async function getProfileVisitors(userId: string) {
  const { data, error } = await supabase
    .from('seller_analytics')
    .select('date, views')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(30);

  if (error || !data) return { totalVisitors: 0, dailyVisitors: [] };

  const totalVisitors = data.reduce((sum: number, row: any) => sum + (row.views || 0), 0);
  const dailyVisitors = data.map((row: any) => ({ date: row.date, visitors: row.views || 0 }));

  return { totalVisitors, dailyVisitors };
}

// --- Get Followers ---

export async function getFollowers(userId: string) {
  const { data, error } = await supabase
    .from('seller_followers')
    .select(`
      follower_id,
      created_at,
      follower:profiles!seller_followers_follower_id_fkey(full_name, avatar_url)
    `)
    .eq('seller_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) return { followers: [] as FollowerInfo[], count: 0 };

  const followers: FollowerInfo[] = data.map((row: any) => ({
    follower_id: row.follower_id,
    full_name: row.follower?.full_name || null,
    avatar_url: row.follower?.avatar_url || null,
    created_at: row.created_at,
  }));

  return { followers, count: followers.length };
}

// --- Get Repeat Buyers ---

export async function getRepeatBuyers(userId: string) {
  const { data: ads } = await supabase
    .from('ads')
    .select('id')
    .eq('user_id', userId);

  if (!ads || ads.length === 0) return { repeatBuyers: [] as RepeatBuyer[] };

  const adIds = ads.map((a: any) => a.id);

  const { data: offers } = await supabase
    .from('offers')
    .select('buyer_id, ad_id, amount, status')
    .in('ad_id', adIds)
    .eq('status', 'accepted');

  if (!offers || offers.length === 0) return { repeatBuyers: [] as RepeatBuyer[] };

  const buyerMap = new Map<string, { count: number; total: number }>();
  for (const offer of offers) {
    const existing = buyerMap.get(offer.buyer_id);
    if (existing) {
      existing.count++;
      existing.total += Number(offer.amount || 0);
    } else {
      buyerMap.set(offer.buyer_id, { count: 1, total: Number(offer.amount || 0) });
    }
  }

  const repeatBuyerIds = [...buyerMap.entries()].filter(([_, info]) => info.count > 1).map(([id]) => id);

  if (repeatBuyerIds.length === 0) return { repeatBuyers: [] as RepeatBuyer[] };

  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, full_name, avatar_url')
    .in('user_id', repeatBuyerIds);

  const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

  const repeatBuyers: RepeatBuyer[] = repeatBuyerIds.map((id) => {
    const info = buyerMap.get(id)!;
    const profile = profileMap.get(id);
    return {
      buyer_id: id,
      full_name: profile?.full_name || null,
      avatar_url: profile?.avatar_url || null,
      purchaseCount: info.count,
      totalSpent: info.total,
    };
  }).sort((a, b) => b.purchaseCount - a.purchaseCount);

  return { repeatBuyers };
}

// --- Get Conversion Rate ---

export async function getConversionRate(userId: string): Promise<number> {
  const { data: ads } = await supabase
    .from('ads')
    .select('id, views_count')
    .eq('user_id', userId);

  if (!ads || ads.length === 0) return 0;

  const totalViews = ads.reduce((sum: number, ad: any) => sum + (ad.views_count || 0), 0);
  const adIds = ads.map((a: any) => a.id);

  const { data: offers } = await supabase
    .from('offers')
    .select('id')
    .in('ad_id', adIds)
    .eq('status', 'accepted');

  const totalConversions = (offers || []).length;

  if (totalViews === 0) return 0;
  return Math.round((totalConversions / totalViews) * 10000) / 100;
}

// --- Get Promotion Management ---

export async function getPromotionManagement(userId: string): Promise<PromotionInfo[]> {
  const { data, error } = await supabase
    .from('ads')
    .select('id, title, is_featured, is_premium, is_boosted, is_urgent, created_at, expires_at')
    .eq('user_id', userId)
    .or('is_featured.eq.true,is_premium.eq.true,is_boosted.eq.true,is_urgent.eq.true')
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((ad: any) => {
    const types: string[] = [];
    if (ad.is_featured) types.push('Featured');
    if (ad.is_premium) types.push('Premium');
    if (ad.is_boosted) types.push('Boosted');
    if (ad.is_urgent) types.push('Urgent');

    return {
      ad_id: ad.id,
      title: ad.title,
      type: types.join(', '),
      start_date: ad.created_at,
      end_date: ad.expires_at || ad.created_at,
    };
  });
}
