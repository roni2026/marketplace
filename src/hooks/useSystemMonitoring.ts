import { useState, useCallback, useEffect } from 'react';
import {
  getErrorLogs,
  getSystemHealth,
  getEmailQueue,
  getFailedJobs,
  retryFailedJob,
  getPerformanceMetrics,
  getUptime,
  getServerHealth,
  getDatabaseHealth,
  getCacheStatus,
  getStorageMonitoring,
} from '@/lib/systemMonitoring';

export function useSystemMonitoring() {
  const [errorLogs, setErrorLogs] = useState<unknown[]>([]);
  const [systemHealth, setSystemHealth] = useState<unknown[]>([]);
  const [emailQueue, setEmailQueue] = useState<unknown[]>([]);
  const [failedJobs, setFailedJobs] = useState<unknown[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<unknown>(null);
  const [uptime, setUptime] = useState<unknown>(null);
  const [serverHealth, setServerHealth] = useState<unknown>(null);
  const [databaseHealth, setDatabaseHealth] = useState<unknown>(null);
  const [cacheStatus, setCacheStatus] = useState<unknown>(null);
  const [storageMonitoring, setStorageMonitoring] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchErrorLogs = useCallback(async (filters?: { level?: string; limit?: number }) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getErrorLogs(filters);
      setErrorLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch error logs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSystemHealth = useCallback(async () => {
    setError(null);
    try {
      const data = await getSystemHealth();
      setSystemHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch system health');
    }
  }, []);

  const fetchEmailQueue = useCallback(async () => {
    setError(null);
    try {
      const data = await getEmailQueue();
      setEmailQueue(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch email queue');
    }
  }, []);

  const fetchFailedJobs = useCallback(async () => {
    setError(null);
    try {
      const data = await getFailedJobs();
      setFailedJobs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch failed jobs');
    }
  }, []);

  const handleRetryFailedJob = useCallback(
    async (jobId: string) => {
      setError(null);
      try {
        await retryFailedJob(jobId);
        await fetchFailedJobs();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to retry job');
      }
    },
    [fetchFailedJobs]
  );

  const fetchPerformanceMetrics = useCallback(async () => {
    setError(null);
    try {
      const data = await getPerformanceMetrics();
      setPerformanceMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch performance metrics');
    }
  }, []);

  const fetchUptime = useCallback(async () => {
    setError(null);
    try {
      const data = await getUptime();
      setUptime(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch uptime');
    }
  }, []);

  const fetchServerHealth = useCallback(async () => {
    setError(null);
    try {
      const data = await getServerHealth();
      setServerHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch server health');
    }
  }, []);

  const fetchDatabaseHealth = useCallback(async () => {
    setError(null);
    try {
      const data = await getDatabaseHealth();
      setDatabaseHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch database health');
    }
  }, []);

  const fetchCacheStatus = useCallback(async () => {
    setError(null);
    try {
      const data = await getCacheStatus();
      setCacheStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cache status');
    }
  }, []);

  const fetchStorageMonitoring = useCallback(async () => {
    setError(null);
    try {
      const data = await getStorageMonitoring();
      setStorageMonitoring(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch storage monitoring');
    }
  }, []);

  useEffect(() => {
    fetchErrorLogs();
    fetchSystemHealth();
    fetchEmailQueue();
    fetchFailedJobs();
    fetchPerformanceMetrics();
    fetchUptime();
    fetchServerHealth();
    fetchDatabaseHealth();
    fetchCacheStatus();
    fetchStorageMonitoring();
  }, [
    fetchErrorLogs,
    fetchSystemHealth,
    fetchEmailQueue,
    fetchFailedJobs,
    fetchPerformanceMetrics,
    fetchUptime,
    fetchServerHealth,
    fetchDatabaseHealth,
    fetchCacheStatus,
    fetchStorageMonitoring,
  ]);

  return {
    errorLogs,
    systemHealth,
    emailQueue,
    failedJobs,
    performanceMetrics,
    uptime,
    serverHealth,
    databaseHealth,
    cacheStatus,
    storageMonitoring,
    isLoading,
    error,
    fetchErrorLogs,
    fetchSystemHealth,
    fetchEmailQueue,
    fetchFailedJobs,
    retryFailedJob: handleRetryFailedJob,
    fetchPerformanceMetrics,
    fetchUptime,
    fetchServerHealth,
    fetchDatabaseHealth,
    fetchCacheStatus,
    fetchStorageMonitoring,
  };
}
