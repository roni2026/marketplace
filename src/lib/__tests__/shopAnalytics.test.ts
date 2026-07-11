import { describe, it, expect, vi } from 'vitest';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => ({ data: null, error: null })),
          single: vi.fn(() => ({ data: null, error: null })),
          order: vi.fn(() => ({ data: [], error: null })),
          gte: vi.fn(() => ({ lte: vi.fn(() => ({ data: [], error: null })) })),
          lte: vi.fn(() => ({ data: [], error: null })),
          limit: vi.fn(() => ({ data: [], error: null })),
          in: vi.fn(() => ({ data: [], error: null })),
        })),
        gte: vi.fn(() => ({ lte: vi.fn(() => ({ data: [], error: null })) })),
        order: vi.fn(() => ({ data: [], error: null })),
        limit: vi.fn(() => ({ data: [], error: null })),
      })),
      rpc: vi.fn(() => ({ data: null, error: null })),
    })),
  },
}));

import {
  getShopAnalyticsSummary,
  getShopAnalyticsTrend,
  getShopRevenueChart,
  getShopTrafficChart,
  getShopConversionChart,
  getBestSellingProducts,
  getLowStockAlerts,
  getShopCustomerAnalytics,
  getShopInventorySummary,
  getShopBusinessOverview,
  getShopFinancialReport,
  getShopTaxReport,
  getShopBusinessReport,
} from '@/lib/shopAnalytics';

describe('Phase 3 — Shop Analytics', () => {
  describe('getShopAnalyticsSummary', () => {
    it('should return zero summary on error', async () => {
      const result = await getShopAnalyticsSummary('test-shop-id', {
        start: '2024-01-01',
        end: '2024-01-31',
      });
      expect(result.views).toBe(0);
      expect(result.revenue).toBe(0);
      expect(result.orders).toBe(0);
    });
  });

  describe('getShopAnalyticsTrend', () => {
    it('should return empty array on error', async () => {
      const result = await getShopAnalyticsTrend('test-shop-id', '7d');
      expect(result).toEqual([]);
    });
  });

  describe('getShopRevenueChart', () => {
    it('should return empty array on error', async () => {
      const result = await getShopRevenueChart('test-shop-id', '30d');
      expect(result).toEqual([]);
    });
  });

  describe('getShopTrafficChart', () => {
    it('should return empty array on error', async () => {
      const result = await getShopTrafficChart('test-shop-id', '30d');
      expect(result).toEqual([]);
    });
  });

  describe('getShopConversionChart', () => {
    it('should return empty array on error', async () => {
      const result = await getShopConversionChart('test-shop-id', '30d');
      expect(result).toEqual([]);
    });
  });

  describe('getBestSellingProducts', () => {
    it('should return empty array on error', async () => {
      const result = await getBestSellingProducts('test-shop-id');
      expect(result).toEqual([]);
    });
  });

  describe('getLowStockAlerts', () => {
    it('should return empty array on error', async () => {
      const result = await getLowStockAlerts('test-shop-id');
      expect(result).toEqual([]);
    });
  });

  describe('getShopCustomerAnalytics', () => {
    it('should return empty analytics on error', async () => {
      const result = await getShopCustomerAnalytics('test-shop-id');
      expect(result.total_customers).toBe(0);
      expect(result.repeat_customers).toBe(0);
      expect(result.avg_order_value).toBe(0);
      expect(result.top_customers).toEqual([]);
    });
  });

  describe('getShopInventorySummary', () => {
    it('should return empty summary on error', async () => {
      const result = await getShopInventorySummary('test-shop-id');
      expect(result.total_products).toBe(0);
      expect(result.in_stock).toBe(0);
    });
  });

  describe('getShopBusinessOverview', () => {
    it('should return empty overview on error', async () => {
      const result = await getShopBusinessOverview('test-shop-id');
      expect(result.total_revenue).toBe(0);
      expect(result.total_orders).toBe(0);
    });
  });

  describe('getShopFinancialReport', () => {
    it('should return empty report on error', async () => {
      const result = await getShopFinancialReport('test-shop-id', 'monthly');
      expect(result.revenue).toBe(0);
      expect(result.net_profit).toBe(0);
    });
  });

  describe('getShopTaxReport', () => {
    it('should return empty tax report on error', async () => {
      const result = await getShopTaxReport('test-shop-id', 'monthly');
      expect(result.total_sales).toBe(0);
      expect(result.tax_rate).toBe(15);
    });
  });

  describe('getShopBusinessReport', () => {
    it('should return empty business report on error', async () => {
      const result = await getShopBusinessReport('test-shop-id', 'monthly');
      expect(result.revenue).toBe(0);
      expect(result.summary.total_revenue).toBe(0);
    });
  });
});
