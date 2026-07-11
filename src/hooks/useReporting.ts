import { useState, useCallback, useEffect } from 'react';
import {
  createCustomReport,
  getCustomReports,
  generateReport,
  scheduleReport,
  getScheduledReports,
  getFunnelAnalysis,
  getCohortAnalysis,
  getRetentionAnalysis,
  getChurnMetrics,
  getLifetimeValue,
} from '@/lib/reporting';

export function useReporting() {
  const [customReports, setCustomReports] = useState<unknown[]>([]);
  const [scheduledReports, setScheduledReports] = useState<unknown[]>([]);
  const [funnelData, setFunnelData] = useState<unknown[]>([]);
  const [cohortData, setCohortData] = useState<unknown>(null);
  const [retentionData, setRetentionData] = useState<unknown>(null);
  const [churnData, setChurnData] = useState<unknown>(null);
  const [ltvData, setLtvData] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCustomReports();
      setCustomReports(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch custom reports');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCreateCustomReport = useCallback(
    async (name: string, config: Record<string, unknown>) => {
      setError(null);
      try {
        await createCustomReport(name, config);
        await fetchCustomReports();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create report');
      }
    },
    [fetchCustomReports]
  );

  const handleGenerateReport = useCallback(async (reportId: string) => {
    setError(null);
    try {
      return await generateReport(reportId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
      return null;
    }
  }, []);

  const fetchScheduledReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getScheduledReports();
      setScheduledReports(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch scheduled reports');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleScheduleReport = useCallback(
    async (name: string, config: Record<string, unknown>, frequency: string, recipients: string[]) => {
      setError(null);
      try {
        await scheduleReport(name, config, frequency, recipients);
        await fetchScheduledReports();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to schedule report');
      }
    },
    [fetchScheduledReports]
  );

  const fetchFunnelAnalysis = useCallback(async (steps: string[]) => {
    setError(null);
    try {
      const data = await getFunnelAnalysis(steps);
      setFunnelData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch funnel analysis');
    }
  }, []);

  const fetchCohortAnalysis = useCallback(async (cohortType: string, period: string) => {
    setError(null);
    try {
      const data = await getCohortAnalysis(cohortType, period);
      setCohortData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cohort analysis');
    }
  }, []);

  const fetchRetentionAnalysis = useCallback(async (period: string) => {
    setError(null);
    try {
      const data = await getRetentionAnalysis(period);
      setRetentionData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch retention analysis');
    }
  }, []);

  const fetchChurnMetrics = useCallback(async (period: string) => {
    setError(null);
    try {
      const data = await getChurnMetrics(period);
      setChurnData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch churn metrics');
    }
  }, []);

  const fetchLTV = useCallback(async () => {
    setError(null);
    try {
      const data = await getLifetimeValue();
      setLtvData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch LTV');
    }
  }, []);

  useEffect(() => {
    fetchCustomReports();
    fetchScheduledReports();
  }, [fetchCustomReports, fetchScheduledReports]);

  return {
    customReports,
    scheduledReports,
    funnelData,
    cohortData,
    retentionData,
    churnData,
    ltvData,
    isLoading,
    error,
    fetchCustomReports,
    createCustomReport: handleCreateCustomReport,
    generateReport: handleGenerateReport,
    fetchScheduledReports,
    scheduleReport: handleScheduleReport,
    fetchFunnelAnalysis,
    fetchCohortAnalysis,
    fetchRetentionAnalysis,
    fetchChurnMetrics,
    fetchLTV,
  };
}
