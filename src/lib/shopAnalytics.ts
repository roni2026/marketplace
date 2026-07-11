/**
 * Shop analytics, business reports, and dashboard data functions for Phase 3.
 */

import { supabase } from '@/integrations/supabase/client';
import type { ShopReportPeriod } from '@/integrations/supabase/types_v3_shops';

// -------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------

export interface ShopAnalyticsSummary {
  views: number;
  unique_visitors: number;
  inquiries: number;
  orders: number;
  conversions: number;
  revenue: number;
  profit: number;
  new_followers: number;
}

export interface ShopAnalyticsTrendPoint {
  date: string;
  views: number;
  inquiries: number;
  orders: number;
  revenue: number;
}

export interface BestSellingProduct {
  ad_id: string;
  title: string;
  price: number;
  total_sold: number;
  revenue: number;
  views: number;
}

export interface LowStockAlert {
  ad_id: string;
  title: string;
  variant_name: string | null;
  stock: number;
  sku: string | null;
}

export interface CustomerAnalytics {
  total_customers: number;
  repeat_customers: number;
  avg_order_value: number;
  top_customers: {
    buyer_id: string;
    full_name: string | null;
    avatar_url: string | null;
    total_orders: number;
    total_spent: number;
  }[];
}

export interface InventorySummary {
  total_products: number;
  in_stock: number;
  low_stock: number;
  out_of_stock: number;
  total_inventory_value: number;
}

export interface BusinessOverview {
  total_revenue: number;
  total_profit: number;
  total_orders: number;
  avg_order_value: number;
  conversion_rate: number;
  total_products: number;
  total_followers: number;
  avg_rating: number;
}

export interface FinancialReport {
  period: string;
  revenue: number;
  costs: number;
  fees: number;
  net_profit: number;
  breakdown: { category: string; revenue: number; orders: number }[];
}

export interface TaxReport {
  period: string;
  total_sales: number;
  taxable_amount: number;
  tax_rate: number;
  tax_collected: number;
  net_amount: number;
}

export interface BusinessReport {
  period: string;
  revenue: number;
  profit: number;
  orders: number;
  revenue_growth: number;
  profit_growth: number;
  order_growth: number;
  top_products: BestSellingProduct[];
  summary: BusinessOverview;
}

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

function getPeriodDays(period: '7d' | '30d' | '90d'): number {
  switch (period) {
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
  }
}

function getReportDateRange(period: ShopReportPeriod): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  let start: Date;

  switch (period) {
    case 'daily':
      start = now;
      break;
    case 'weekly':
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      break;
    case 'monthly':
      start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      break;
    case 'quarterly':
      start = new Date(now);
      start.setMonth(start.getMonth() - 3);
      break;
    case 'yearly':
      start = new Date(now);
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      start = new Date(now);
      start.setDate(start.getDate() - 30);
  }

  return { start: start.toISOString().split('T')[0], end };
}

function getPreviousPeriodRange(period: ShopReportPeriod): { start: string; end: string } {
  const now = new Date();
  let prevEnd: Date = new Date(now);
  let prevStart: Date = new Date(now);

  switch (period) {
    case 'daily':
      prevEnd.setDate(prevEnd.getDate() - 1);
      prevStart.setDate(prevStart.getDate() - 1);
      break;
    case 'weekly':
      prevEnd.setDate(prevEnd.getDate() - 7);
      prevStart.setDate(prevStart.getDate() - 14);
      break;
    case 'monthly':
      prevEnd.setMonth(prevEnd.getMonth() - 1);
      prevStart.setMonth(prevStart.getMonth() - 2);
      break;
    case 'quarterly':
      prevEnd.setMonth(prevEnd.getMonth() - 3);
      prevStart.setMonth(prevStart.getMonth() - 6);
      break;
    case 'yearly':
      prevEnd.setFullYear(prevEnd.getFullYear() - 1);
      prevStart.setFullYear(prevStart.getFullYear() - 2);
      break;
    default:
      prevEnd.setDate(prevEnd.getDate() - 30);
      prevStart.setDate(prevStart.getDate() - 60);
  }

  return {
    start: prevStart.toISOString().split('T')[0],
    end: prevEnd.toISOString().split('T')[0],
  };
}

function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// -------------------------------------------------------------------------
// Analytics Functions
// -------------------------------------------------------------------------

export async function getShopAnalyticsSummary(
  shopId: string,
  dateRange: { start: string; end: string }
): Promise<ShopAnalyticsSummary> {
  try {
    const { data, error } = await supabase
      .from('shop_analytics')
      .select('*')
      .eq('shop_id', shopId)
      .gte('stat_date', dateRange.start)
      .lte('stat_date', dateRange.end);

    if (error) throw error;

    return (data || []).reduce(
      (acc, row) => ({
        views: acc.views + (row.views || 0),
        unique_visitors: acc.unique_visitors + (row.unique_visitors || 0),
        inquiries: acc.inquiries + (row.inquiries || 0),
        orders: acc.orders + (row.orders || 0),
        conversions: acc.conversions + (row.conversions || 0),
        revenue: acc.revenue + Number(row.revenue || 0),
        profit: acc.profit + Number(row.profit || 0),
        new_followers: acc.new_followers + (row.new_followers || 0),
      }),
      { views: 0, unique_visitors: 0, inquiries: 0, orders: 0, conversions: 0, revenue: 0, profit: 0, new_followers: 0 }
    );
  } catch (error) {
    console.error('getShopAnalyticsSummary error:', error);
    return { views: 0, unique_visitors: 0, inquiries: 0, orders: 0, conversions: 0, revenue: 0, profit: 0, new_followers: 0 };
  }
}

export async function getShopAnalyticsTrend(
  shopId: string,
  period: '7d' | '30d' | '90d'
): Promise<ShopAnalyticsTrendPoint[]> {
  try {
    const days = getPeriodDays(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('shop_analytics')
      .select('stat_date, views, inquiries, orders, revenue')
      .eq('shop_id', shopId)
      .gte('stat_date', startDate.toISOString().split('T')[0])
      .order('stat_date', { ascending: true });

    if (error) throw error;

    // Fill in missing dates
    const trendMap = new Map<string, ShopAnalyticsTrendPoint>();
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      trendMap.set(dateStr, { date: dateStr, views: 0, inquiries: 0, orders: 0, revenue: 0 });
    }

    for (const row of data || []) {
      const dateStr = row.stat_date;
      if (trendMap.has(dateStr)) {
        trendMap.set(dateStr, {
          date: dateStr,
          views: row.views || 0,
          inquiries: row.inquiries || 0,
          orders: row.orders || 0,
          revenue: Number(row.revenue || 0),
        });
      }
    }

    return Array.from(trendMap.values());
  } catch (error) {
    console.error('getShopAnalyticsTrend error:', error);
    return [];
  }
}

export async function getShopRevenueChart(
  shopId: string,
  period: '7d' | '30d' | '90d'
): Promise<{ date: string; revenue: number; profit: number }[]> {
  try {
    const days = getPeriodDays(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('shop_analytics')
      .select('stat_date, revenue, profit')
      .eq('shop_id', shopId)
      .gte('stat_date', startDate.toISOString().split('T')[0])
      .order('stat_date', { ascending: true });

    if (error) throw error;

    const chartMap = new Map<string, { date: string; revenue: number; profit: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      chartMap.set(dateStr, { date: dateStr, revenue: 0, profit: 0 });
    }

    for (const row of data || []) {
      const dateStr = row.stat_date;
      if (chartMap.has(dateStr)) {
        chartMap.set(dateStr, {
          date: dateStr,
          revenue: Number(row.revenue || 0),
          profit: Number(row.profit || 0),
        });
      }
    }

    return Array.from(chartMap.values());
  } catch (error) {
    console.error('getShopRevenueChart error:', error);
    return [];
  }
}

export async function getShopTrafficChart(
  shopId: string,
  period: '7d' | '30d' | '90d'
): Promise<{ date: string; views: number; unique_visitors: number }[]> {
  try {
    const days = getPeriodDays(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('shop_analytics')
      .select('stat_date, views, unique_visitors')
      .eq('shop_id', shopId)
      .gte('stat_date', startDate.toISOString().split('T')[0])
      .order('stat_date', { ascending: true });

    if (error) throw error;

    const chartMap = new Map<string, { date: string; views: number; unique_visitors: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      chartMap.set(dateStr, { date: dateStr, views: 0, unique_visitors: 0 });
    }

    for (const row of data || []) {
      const dateStr = row.stat_date;
      if (chartMap.has(dateStr)) {
        chartMap.set(dateStr, {
          date: dateStr,
          views: row.views || 0,
          unique_visitors: row.unique_visitors || 0,
        });
      }
    }

    return Array.from(chartMap.values());
  } catch (error) {
    console.error('getShopTrafficChart error:', error);
    return [];
  }
}

export async function getShopConversionChart(
  shopId: string,
  period: '7d' | '30d' | '90d'
): Promise<{ date: string; conversions: number; conversion_rate: number }[]> {
  try {
    const days = getPeriodDays(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('shop_analytics')
      .select('stat_date, conversions, views')
      .eq('shop_id', shopId)
      .gte('stat_date', startDate.toISOString().split('T')[0])
      .order('stat_date', { ascending: true });

    if (error) throw error;

    const chartMap = new Map<string, { date: string; conversions: number; conversion_rate: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      chartMap.set(dateStr, { date: dateStr, conversions: 0, conversion_rate: 0 });
    }

    for (const row of data || []) {
      const dateStr = row.stat_date;
      if (chartMap.has(dateStr)) {
        const conversions = row.conversions || 0;
        const views = row.views || 0;
        chartMap.set(dateStr, {
          date: dateStr,
          conversions,
          conversion_rate: views > 0 ? Math.round((conversions / views) * 10000) / 100 : 0,
        });
      }
    }

    return Array.from(chartMap.values());
  } catch (error) {
    console.error('getShopConversionChart error:', error);
    return [];
  }
}

export async function getBestSellingProducts(shopId: string, limit = 10): Promise<BestSellingProduct[]> {
  try {
    // Get shop owner
    const { data: shop } = await supabase
      .from('shops')
      .select('owner_id')
      .eq('id', shopId)
      .single();

    if (!shop) return [];

    // Get ads by owner, sorted by views/sales
    const { data, error } = await supabase
      .from('ads')
      .select('id, title, price, views_count, status')
      .eq('user_id', shop.owner_id)
      .in('status', ['approved', 'boosted', 'premium', 'sold'])
      .order('views_count', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((ad) => ({
      ad_id: ad.id,
      title: ad.title,
      price: Number(ad.price || 0),
      total_sold: ad.status === 'sold' ? 1 : 0,
      revenue: Number(ad.price || 0),
      views: ad.views_count || 0,
    }));
  } catch (error) {
    console.error('getBestSellingProducts error:', error);
    return [];
  }
}

export async function getLowStockAlerts(shopId: string): Promise<LowStockAlert[]> {
  try {
    const { data: shop } = await supabase
      .from('shops')
      .select('owner_id')
      .eq('id', shopId)
      .single();

    if (!shop) return [];

    const { data: ads } = await supabase
      .from('ads')
      .select('id, title')
      .eq('user_id', shop.owner_id)
      .in('status', ['approved', 'boosted', 'premium']);

    if (!ads || ads.length === 0) return [];

    const adIds = ads.map((a) => a.id);

    const { data: variants, error } = await supabase
      .from('listing_variants')
      .select('id, ad_id, name, sku, stock')
      .in('ad_id', adIds)
      .lte('stock', 5);

    if (error) throw error;

    const adMap = new Map(ads.map((a) => [a.id, a.title]));

    return (variants || []).map((v) => ({
      ad_id: v.ad_id,
      title: adMap.get(v.ad_id) || 'Unknown',
      variant_name: v.name,
      stock: v.stock || 0,
      sku: v.sku,
    }));
  } catch (error) {
    console.error('getLowStockAlerts error:', error);
    return [];
  }
}

export async function getShopCustomerAnalytics(shopId: string): Promise<CustomerAnalytics> {
  try {
    const { data: orders, error } = await supabase
      .from('shop_orders')
      .select('buyer_id, total_amount')
      .eq('shop_id', shopId)
      .neq('status', 'cancelled');

    if (error) throw error;

    const orders_ = orders || [];
    const customerMap = new Map<string, { total_orders: number; total_spent: number }>();

    for (const order of orders_) {
      const existing = customerMap.get(order.buyer_id) || { total_orders: 0, total_spent: 0 };
      existing.total_orders += 1;
      existing.total_spent += Number(order.total_amount || 0);
      customerMap.set(order.buyer_id, existing);
    }

    const customers = Array.from(customerMap.entries());
    const repeatCustomers = customers.filter(([, v]) => v.total_orders > 1);
    const totalRevenue = customers.reduce((sum, [, v]) => sum + v.total_spent, 0);

    // Get top customers with profile info
    const topCustomerIds = customers
      .sort((a, b) => b[1].total_spent - a[1].total_spent)
      .slice(0, 10)
      .map(([id]) => id);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url')
      .in('user_id', topCustomerIds);

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

    const top_customers = topCustomerIds.map((id) => ({
      buyer_id: id,
      full_name: profileMap.get(id)?.full_name || null,
      avatar_url: profileMap.get(id)?.avatar_url || null,
      total_orders: customerMap.get(id)?.total_orders || 0,
      total_spent: customerMap.get(id)?.total_spent || 0,
    }));

    return {
      total_customers: customers.length,
      repeat_customers: repeatCustomers.length,
      avg_order_value: orders_.length > 0 ? Math.round(totalRevenue / orders_.length) : 0,
      top_customers,
    };
  } catch (error) {
    console.error('getShopCustomerAnalytics error:', error);
    return { total_customers: 0, repeat_customers: 0, avg_order_value: 0, top_customers: [] };
  }
}

export async function getShopInventorySummary(shopId: string): Promise<InventorySummary> {
  try {
    const { data: shop } = await supabase
      .from('shops')
      .select('owner_id')
      .eq('id', shopId)
      .single();

    if (!shop) return { total_products: 0, in_stock: 0, low_stock: 0, out_of_stock: 0, total_inventory_value: 0 };

    const { data: ads, error } = await supabase
      .from('ads')
      .select('id, price')
      .eq('user_id', shop.owner_id)
      .in('status', ['approved', 'boosted', 'premium']);

    if (error) throw error;

    const ads_ = ads || [];
    const adIds = ads_.map((a) => a.id);

    // Check variants for stock info
    const { data: variants } = await supabase
      .from('listing_variants')
      .select('ad_id, stock, price')
      .in('ad_id', adIds);

    const variantMap = new Map<string, { totalStock: number; variants: { stock: number; price: number }[] }>();
    for (const v of variants || []) {
      const existing = variantMap.get(v.ad_id) || { totalStock: 0, variants: [] };
      existing.totalStock += v.stock || 0;
      existing.variants.push({ stock: v.stock || 0, price: Number(v.price || 0) });
      variantMap.set(v.ad_id, existing);
    }

    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;
    let totalValue = 0;

    for (const ad of ads_) {
      const variantInfo = variantMap.get(ad.id);
      if (variantInfo) {
        if (variantInfo.totalStock > 5) inStock++;
        else if (variantInfo.totalStock > 0) lowStock++;
        else outOfStock++;
        totalValue += variantInfo.variants.reduce((sum, v) => sum + v.stock * v.price, 0);
      } else {
        // No variants — assume in stock
        inStock++;
        totalValue += Number(ad.price || 0);
      }
    }

    return {
      total_products: ads_.length,
      in_stock: inStock,
      low_stock: lowStock,
      out_of_stock: outOfStock,
      total_inventory_value: totalValue,
    };
  } catch (error) {
    console.error('getShopInventorySummary error:', error);
    return { total_products: 0, in_stock: 0, low_stock: 0, out_of_stock: 0, total_inventory_value: 0 };
  }
}

export async function getShopBusinessOverview(shopId: string): Promise<BusinessOverview> {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [analyticsResult, shopResult, ordersResult] = await Promise.all([
      getShopAnalyticsSummary(shopId, {
        start: thirtyDaysAgo.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0],
      }),
      supabase.from('shops').select('total_products, total_followers, avg_rating').eq('id', shopId).single(),
      supabase
        .from('shop_orders')
        .select('total_amount')
        .eq('shop_id', shopId)
        .neq('status', 'cancelled'),
    ]);

    const orders = ordersResult.data || [];
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    return {
      total_revenue: analyticsResult.revenue,
      total_profit: analyticsResult.profit,
      total_orders: orders.length,
      avg_order_value: orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0,
      conversion_rate: analyticsResult.views > 0 ? Math.round((analyticsResult.conversions / analyticsResult.views) * 10000) / 100 : 0,
      total_products: shopResult.data?.total_products || 0,
      total_followers: shopResult.data?.total_followers || 0,
      avg_rating: shopResult.data?.avg_rating || 0,
    };
  } catch (error) {
    console.error('getShopBusinessOverview error:', error);
    return {
      total_revenue: 0, total_profit: 0, total_orders: 0, avg_order_value: 0,
      conversion_rate: 0, total_products: 0, total_followers: 0, avg_rating: 0,
    };
  }
}

export async function getShopFinancialReport(shopId: string, period: ShopReportPeriod): Promise<FinancialReport> {
  try {
    const dateRange = getReportDateRange(period);

    const { data, error } = await supabase
      .from('shop_analytics')
      .select('*')
      .eq('shop_id', shopId)
      .gte('stat_date', dateRange.start)
      .lte('stat_date', dateRange.end);

    if (error) throw error;

    const rows = data || [];
    const revenue = rows.reduce((sum, r) => sum + Number(r.revenue || 0), 0);
    const profit = rows.reduce((sum, r) => sum + Number(r.profit || 0), 0);
    const orders = rows.reduce((sum, r) => sum + (r.orders || 0), 0);

    // Get transactions for fees
    const { data: transactions } = await supabase
      .from('transactions')
      .select('fee, transaction_type')
      .eq('shop_id', shopId)
      .eq('transaction_type', 'fee')
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end + 'T23:59:59');

    const fees = (transactions || []).reduce((sum, t) => sum + Number(t.fee || 0), 0);
    const costs = revenue - profit;

    // Category breakdown
    const { data: shop } = await supabase.from('shops').select('owner_id').eq('id', shopId).single();
    let breakdown: { category: string; revenue: number; orders: number }[] = [];

    if (shop) {
      const { data: ads } = await supabase
        .from('ads')
        .select('id, title, price, category_id, categories(name)')
        .eq('user_id', shop.owner_id)
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end + 'T23:59:59');

      const categoryMap = new Map<string, { revenue: number; orders: number }>();
      for (const ad of ads || []) {
        const catName = (ad.categories as any)?.name || 'Uncategorized';
        const existing = categoryMap.get(catName) || { revenue: 0, orders: 0 };
        existing.revenue += Number(ad.price || 0);
        existing.orders += 1;
        categoryMap.set(catName, existing);
      }
      breakdown = Array.from(categoryMap.entries()).map(([category, v]) => ({ category, ...v }));
    }

    return {
      period,
      revenue,
      costs,
      fees,
      net_profit: profit - fees,
      breakdown,
    };
  } catch (error) {
    console.error('getShopFinancialReport error:', error);
    return { period, revenue: 0, costs: 0, fees: 0, net_profit: 0, breakdown: [] };
  }
}

export async function getShopTaxReport(shopId: string, period: ShopReportPeriod): Promise<TaxReport> {
  try {
    const dateRange = getReportDateRange(period);
    const summary = await getShopAnalyticsSummary(shopId, dateRange);

    const totalSales = summary.revenue;
    const taxRate = 0.15; // 15% VAT
    const taxableAmount = totalSales;
    const taxCollected = Math.round(taxableAmount * taxRate * 100) / 100;
    const netAmount = totalSales - taxCollected;

    return {
      period,
      total_sales: totalSales,
      taxable_amount: taxableAmount,
      tax_rate: taxRate * 100,
      tax_collected: taxCollected,
      net_amount: netAmount,
    };
  } catch (error) {
    console.error('getShopTaxReport error:', error);
    return { period, total_sales: 0, taxable_amount: 0, tax_rate: 15, tax_collected: 0, net_amount: 0 };
  }
}

export async function getShopBusinessReport(shopId: string, period: ShopReportPeriod): Promise<BusinessReport> {
  try {
    const currentDateRange = getReportDateRange(period);
    const previousDateRange = getPreviousPeriodRange(period);

    const [currentSummary, previousSummary, overview, topProducts] = await Promise.all([
      getShopAnalyticsSummary(shopId, currentDateRange),
      getShopAnalyticsSummary(shopId, previousDateRange),
      getShopBusinessOverview(shopId),
      getBestSellingProducts(shopId, 5),
    ]);

    // Get order counts
    const { count: currentOrders } = await supabase
      .from('shop_orders')
      .select('*', { count: 'exact', head: true })
      .eq('shop_id', shopId)
      .gte('created_at', currentDateRange.start)
      .lte('created_at', currentDateRange.end + 'T23:59:59')
      .neq('status', 'cancelled');

    const { count: previousOrders } = await supabase
      .from('shop_orders')
      .select('*', { count: 'exact', head: true })
      .eq('shop_id', shopId)
      .gte('created_at', previousDateRange.start)
      .lte('created_at', previousDateRange.end + 'T23:59:59')
      .neq('status', 'cancelled');

    return {
      period,
      revenue: currentSummary.revenue,
      profit: currentSummary.profit,
      orders: currentOrders || 0,
      revenue_growth: calculateGrowth(currentSummary.revenue, previousSummary.revenue),
      profit_growth: calculateGrowth(currentSummary.profit, previousSummary.profit),
      order_growth: calculateGrowth(currentOrders || 0, previousOrders || 0),
      top_products: topProducts,
      summary: overview,
    };
  } catch (error) {
    console.error('getShopBusinessReport error:', error);
    return {
      period,
      revenue: 0, profit: 0, orders: 0,
      revenue_growth: 0, profit_growth: 0, order_growth: 0,
      top_products: [],
      summary: {
        total_revenue: 0, total_profit: 0, total_orders: 0, avg_order_value: 0,
        conversion_rate: 0, total_products: 0, total_followers: 0, avg_rating: 0,
      },
    };
  }
}
