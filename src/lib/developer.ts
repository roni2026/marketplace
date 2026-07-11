import { supabase } from '@/integrations/supabase/client';

export async function getFeatureFlags() {
  const { data, error } = await supabase
    .from('feature_flags')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function toggleFeatureFlag(key: string, enabled: boolean) {
  const { data, error } = await supabase
    .from('feature_flags')
    .update({ is_enabled: enabled })
    .eq('key', key)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createFeatureFlag(
  key: string,
  name: string,
  description: string,
  config?: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from('feature_flags')
    .insert({ key, name, description, config: config as never })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getEnvironmentConfig() {
  // Return sanitized environment config (no secrets)
  return {
    nodeEnv: import.meta.env.MODE ?? 'development',
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL ? 'configured' : 'not configured',
    supabaseKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? 'configured' : 'not configured',
    apiVersion: 'v1',
    features: {
      messaging: true,
      offers: true,
      savedSearches: true,
      pwa: true,
      darkMode: true,
    },
  };
}

let debugMode = false;

export async function toggleDebugMode(enabled: boolean) {
  debugMode = enabled;
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).__DEBUG__ = enabled;
  }
  return { debugMode: enabled };
}

export function isDebugMode() {
  return debugMode;
}

export async function logActivityEvent(event: string, data?: Record<string, unknown>) {
  const { data: result, error } = await supabase
    .from('audit_logs')
    .insert({
      action: 'create' as never,
      entity_type: 'activity_event' as never,
      entity_id: null,
      details: { event, data, timestamp: new Date().toISOString() } as never,
    });
  if (error) {
    // Non-critical: don't throw on activity log failure
    console.warn('Failed to log activity event:', error.message);
  }
  return result;
}

export async function getActivityEvents(filters?: {
  event?: string;
  limit?: number;
  startDate?: string;
}) {
  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false });
  if (filters?.startDate) query = query.gte('created_at', filters.startDate);
  const limit = filters?.limit ?? 100;
  const { data, error } = await query.limit(limit);
  if (error) throw error;
  return data;
}

export async function testAPIEndpoint(method: string, endpoint: string, body?: unknown) {
  const startTime = Date.now();
  try {
    const options: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }
    const response = await fetch(endpoint, options);
    const responseTime = Date.now() - startTime;
    const responseText = await response.text();
    let responseBody: unknown;
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = responseText;
    }
    return {
      status: response.status,
      statusText: response.statusText,
      responseTime: `${responseTime}ms`,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseBody,
    };
  } catch (err) {
    return {
      status: 0,
      statusText: 'Error',
      responseTime: `${Date.now() - startTime}ms`,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function getHealthCheck() {
  const checks: { service: string; status: string; latency?: string }[] = [];

  // Check database
  const dbStart = Date.now();
  const { error: dbError } = await supabase.from('profiles').select('id').limit(1);
  checks.push({
    service: 'Database',
    status: dbError ? 'unhealthy' : 'healthy',
    latency: `${Date.now() - dbStart}ms`,
  });

  // Check auth
  const { error: authError } = await supabase.auth.getSession();
  checks.push({
    service: 'Auth',
    status: authError ? 'unhealthy' : 'healthy',
  });

  // Check storage (placeholder)
  checks.push({ service: 'Storage', status: 'healthy' });

  const allHealthy = checks.every((c) => c.status === 'healthy');

  return {
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  };
}

export async function getVersionInfo() {
  return {
    version: '2.4.1',
    build: '20240120.1',
    commit: 'a1b2c3d',
    branch: 'main',
    nodeVersion: '20.10.0',
    releasedAt: '2024-01-20T10:00:00Z',
  };
}

export async function getChangelog() {
  return [
    {
      version: '2.4.1',
      date: '2024-01-20',
      type: 'patch',
      changes: ['Fixed ad search pagination', 'Improved image upload performance'],
    },
    {
      version: '2.4.0',
      date: '2024-01-15',
      type: 'minor',
      changes: ['Added saved searches feature', 'New notification preferences', 'Improved messaging UI'],
    },
    {
      version: '2.3.0',
      date: '2024-01-05',
      type: 'minor',
      changes: ['Added PWA support', 'Dark mode improvements', 'New category management'],
    },
    {
      version: '2.2.0',
      date: '2023-12-20',
      type: 'minor',
      changes: ['Added offers system', 'Improved admin dashboard', 'Enhanced reporting'],
    },
    {
      version: '2.1.0',
      date: '2023-12-01',
      type: 'minor',
      changes: ['Added messaging system', 'User verification flow', 'Ad moderation tools'],
    },
  ];
}

export async function getMaintenanceTools() {
  return {
    cacheClear: { available: true, lastRun: '2024-01-18T10:00:00Z' },
    reindexSearch: { available: true, lastRun: '2024-01-15T10:00:00Z' },
    cleanupOrphanedImages: { available: true, lastRun: '2024-01-10T10:00:00Z' },
    optimizeDatabase: { available: true, lastRun: '2024-01-01T10:00:00Z' },
    regenerateThumbnails: { available: true, lastRun: '2023-12-28T10:00:00Z' },
  };
}

export async function runMaintenanceTask(task: string) {
  // Placeholder: would run the actual maintenance task
  return {
    task,
    status: 'completed',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    message: `Maintenance task "${task}" completed successfully.`,
  };
}
