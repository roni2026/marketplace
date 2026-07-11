import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type {
  WorkflowRule,
  WorkflowRuleInsert,
  WorkflowLog,
  CronJob,
  CronJobInsert,
} from '@/integrations/supabase/types_v2_cms';
import {
  getWorkflowRules,
  createWorkflowRule,
  toggleWorkflowRule,
  deleteWorkflowRule,
  getWorkflowLogs,
  getCronJobs,
  createCronJob,
  toggleCronJob,
  deleteCronJob,
} from '@/lib/workflow';

export function useWorkflow() {
  const { user } = useAuth();
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [logs, setLogs] = useState<WorkflowLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    const data = await getWorkflowRules();
    setRules(data);
  }, []);

  const createRule = useCallback(
    async (name: string, trigger: string, condition: Record<string, unknown>, action: string) => {
      const rule = await createWorkflowRule(name, trigger, condition, action);
      if (rule) {
        setRules((prev) => [rule, ...prev]);
      }
      return rule;
    },
    []
  );

  const toggleRule = useCallback(async (ruleId: string, isActive: boolean) => {
    await toggleWorkflowRule(ruleId, isActive);
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, is_active: isActive } : r))
    );
  }, []);

  const removeRule = useCallback(async (ruleId: string) => {
    await deleteWorkflowRule(ruleId);
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
  }, []);

  const fetchCronJobs = useCallback(async () => {
    const data = await getCronJobs();
    setCronJobs(data);
  }, []);

  const addCronJob = useCallback(async (name: string, schedule: string, command: string) => {
    const job = await createCronJob(name, schedule, command);
    if (job) {
      setCronJobs((prev) => [job, ...prev]);
    }
    return job;
  }, []);

  const toggleCronJobState = useCallback(async (jobId: string, isActive: boolean) => {
    await toggleCronJob(jobId, isActive);
    setCronJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, is_active: isActive } : j))
    );
  }, []);

  const removeCronJob = useCallback(async (jobId: string) => {
    await deleteCronJob(jobId);
    setCronJobs((prev) => prev.filter((j) => j.id !== jobId));
  }, []);

  const fetchWorkflowLogs = useCallback(async (limit = 50) => {
    const data = await getWorkflowLogs(limit);
    setLogs(data);
  }, []);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    Promise.all([fetchRules(), fetchCronJobs(), fetchWorkflowLogs()])
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [user, fetchRules, fetchCronJobs, fetchWorkflowLogs]);

  return {
    rules,
    cronJobs,
    logs,
    isLoading,
    error,
    fetchRules,
    createRule,
    toggleRule,
    removeRule,
    fetchCronJobs,
    addCronJob,
    toggleCronJobState,
    removeCronJob,
    fetchWorkflowLogs,
    refetch: () => {
      fetchRules();
      fetchCronJobs();
      fetchWorkflowLogs();
    },
  };
}
