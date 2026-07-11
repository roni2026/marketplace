import { supabase } from '@/integrations/supabase/client';

export async function createAPIToken(userId: string, name: string, scopes: string[]) {
  // Generate a random token
  const token = `mk_${crypto.randomUUID().replace(/-/g, '')}`;
  // Hash the token for storage (simplified - in production use proper hashing)
  const tokenHash = btoa(token);

  const { data, error } = await supabase
    .from('api_tokens')
    .insert({ user_id: userId, name, token_hash: tokenHash, scopes })
    .select()
    .single();
  if (error) throw error;
  return { ...data, token };
}

export async function getAPITokens(userId: string) {
  const { data, error } = await supabase
    .from('api_tokens')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function revokeAPIToken(tokenId: string) {
  const { data, error } = await supabase
    .from('api_tokens')
    .update({ is_active: false })
    .eq('id', tokenId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function logAPICall(
  userId: string | null,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTime: number,
  request?: unknown,
  response?: unknown
) {
  const { data, error } = await supabase
    .from('api_logs')
    .insert({
      user_id: userId,
      endpoint,
      method,
      status_code: statusCode,
      response_time_ms: responseTime,
      request_body: request as never,
      response_body: response as never,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getAPILogs(filters?: {
  userId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  limit?: number;
}) {
  let query = supabase.from('api_logs').select('*').order('created_at', { ascending: false });
  if (filters?.userId) query = query.eq('user_id', filters.userId);
  if (filters?.endpoint) query = query.ilike('endpoint', `%${filters.endpoint}%`);
  if (filters?.method) query = query.eq('method', filters.method);
  if (filters?.statusCode) query = query.eq('status_code', filters.statusCode);
  const limit = filters?.limit ?? 100;
  const { data, error } = await query.limit(limit);
  if (error) throw error;
  return data;
}

export async function createWebhook(userId: string, url: string, events: string[], secret: string) {
  const { data, error } = await supabase
    .from('webhooks')
    .insert({ user_id: userId, url, events, secret })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getWebhooks(userId: string) {
  const { data, error } = await supabase
    .from('webhooks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function triggerWebhook(webhookId: string, event: string, data: Record<string, unknown>) {
  const { data: webhook, error: whError } = await supabase
    .from('webhooks')
    .select('*')
    .eq('id', webhookId)
    .single();
  if (whError) throw whError;

  // Update last triggered
  await supabase
    .from('webhooks')
    .update({ last_triggered: new Date().toISOString() })
    .eq('id', webhookId);

  // In production, this would make an HTTP request to webhook.url
  return { webhook, event, payload: data, triggeredAt: new Date().toISOString() };
}

export async function getAPIRateLimit(userId: string) {
  // Placeholder: rate limit tracking
  const { count } = await supabase
    .from('api_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 3600000).toISOString());

  return {
    userId,
    requestsInLastHour: count ?? 0,
    limit: 1000,
    remaining: Math.max(0, 1000 - (count ?? 0)),
    resetAt: new Date(Date.now() + 3600000).toISOString(),
  };
}

export async function checkRateLimit(userId: string, _endpoint: string) {
  const rateLimit = await getAPIRateLimit(userId);
  return {
    allowed: rateLimit.remaining > 0,
    remaining: rateLimit.remaining,
    limit: rateLimit.limit,
  };
}

export async function getAPIDocs() {
  return {
    version: 'v1',
    baseUrl: '/api/v1',
    endpoints: [
      { method: 'GET', path: '/ads', description: 'List all ads', auth: false },
      { method: 'GET', path: '/ads/:id', description: 'Get a single ad', auth: false },
      { method: 'POST', path: '/ads', description: 'Create a new ad', auth: true },
      { method: 'PUT', path: '/ads/:id', description: 'Update an ad', auth: true },
      { method: 'DELETE', path: '/ads/:id', description: 'Delete an ad', auth: true },
      { method: 'GET', path: '/categories', description: 'List categories', auth: false },
      { method: 'GET', path: '/users/:id', description: 'Get user profile', auth: true },
      { method: 'POST', path: '/messages', description: 'Send a message', auth: true },
      { method: 'POST', path: '/offers', description: 'Make an offer', auth: true },
      { method: 'GET', path: '/reports', description: 'List reports (admin)', auth: true },
    ],
  };
}

export async function getAPIVersion() {
  return { version: 'v1.2.0', releasedAt: '2024-01-15', deprecated: ['v0'] };
}
