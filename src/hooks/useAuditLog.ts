import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  profiles?: { full_name: string | null } | null;
}

interface AuditLogFilters {
  action?: string;
  resource_type?: string;
  user_id?: string;
  startDate?: string;
  endDate?: string;
}

export function useAuditLog(filters?: AuditLogFilters) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const perPage = 20;

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);

    let query = supabase
      .from('audit_logs')
      .select('*, profiles!audit_logs_user_id_fkey(full_name)', { count: 'exact' });

    if (filters?.action) {
      query = query.eq('action', filters.action);
    }
    if (filters?.resource_type) {
      query = query.eq('resource_type', filters.resource_type);
    }
    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    query = query
      .order('created_at', { ascending: false })
      .range((page - 1) * perPage, page * perPage - 1);

    const { data, count } = await query;
    setLogs((data as AuditLog[]) || []);
    setTotalCount(count || 0);
    setIsLoading(false);
  }, [filters?.action, filters?.resource_type, filters?.user_id, filters?.startDate, filters?.endDate, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    isLoading,
    totalCount,
    page,
    perPage,
    totalPages: Math.ceil(totalCount / perPage),
    setPage,
    refetch: fetchLogs,
  };
}
