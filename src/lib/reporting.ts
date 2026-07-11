import { supabase } from '@/integrations/supabase/client';

export async function createCustomReport(name: string, config: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('custom_reports')
    .insert({ name, config })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getCustomReports() {
  const { data, error } = await supabase
    .from('custom_reports')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function generateReport(reportId: string) {
  const { data: report, error: reportError } = await supabase
    .from('custom_reports')
    .select('*')
    .eq('id', reportId)
    .single();
  if (reportError) throw reportError;

  // Generate data based on config
  const config = report.config as Record<string, unknown> | null;
  const table = (config?.table as string) ?? 'ads';
  const { data: reportData, error: dataError } = await supabase
    .from(table)
    .select('*')
    .limit(1000);
  if (dataError) throw dataError;

  // Update report with generated data
  const { data: updated, error: updateError } = await supabase
    .from('custom_reports')
    .update({ data: reportData })
    .eq('id', reportId)
    .select()
    .single();
  if (updateError) throw updateError;
  return updated;
}

export async function scheduleReport(
  name: string,
  config: Record<string, unknown>,
  frequency: string,
  recipients: string[]
) {
  const { data, error } = await supabase
    .from('scheduled_reports')
    .insert({ name, config, frequency, recipients })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getScheduledReports() {
  const { data, error } = await supabase
    .from('scheduled_reports')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function exportDashboard(dashboardId: string, format: string) {
  // Placeholder: fetch dashboard data and format
  const { data, error } = await supabase
    .from('custom_reports')
    .select('*')
    .eq('id', dashboardId)
    .single();
  if (error) throw error;
  return { format, data: data.data, generatedAt: new Date().toISOString() };
}

export async function getFunnelAnalysis(steps: string[]) {
  // Placeholder: would track user journey through funnel steps
  const results = steps.map((step, i) => ({
    step: i + 1,
    name: step,
    count: Math.floor(Math.random() * 1000 * (1 - i * 0.15)),
    conversionRate: (1 - i * 0.15) * 100,
  }));
  return results;
}

export async function getCohortAnalysis(cohortType: string, period: string) {
  // Placeholder: would group users by signup cohort
  const cohorts = [];
  for (let i = 0; i < 6; i++) {
    const cohort = {
      cohort: `Cohort ${i + 1}`,
      size: Math.floor(Math.random() * 500) + 100,
      retention: Array.from({ length: 8 }, (_, j) => ({
        week: j + 1,
        rate: Math.max(0, 100 - j * 10 - Math.random() * 5),
      })),
    };
    cohorts.push(cohort);
  }
  return { cohortType, period, cohorts };
}

export async function getRetentionAnalysis(period: string) {
  // Placeholder: retention over time
  const data = Array.from({ length: 12 }, (_, i) => ({
    period: `Week ${i + 1}`,
    retention: Math.max(20, 100 - i * 6 - Math.random() * 3),
    users: Math.floor(Math.random() * 800) + 200,
  }));
  return { period, data };
}

export async function getChurnMetrics(period: string) {
  // Placeholder: churn rate calculation
  return {
    period,
    churnRate: 4.2 + Math.random() * 2,
    lostUsers: Math.floor(Math.random() * 50) + 10,
    totalUsers: Math.floor(Math.random() * 2000) + 500,
    newUsers: Math.floor(Math.random() * 100) + 30,
    netGrowth: Math.floor(Math.random() * 50) + 5,
  };
}

export async function getLifetimeValue() {
  // Placeholder: LTV calculation
  return {
    averageLTV: 2450,
    medianLTV: 1800,
    topDecileLTV: 8500,
    totalRevenue: 125000,
    totalCustomers: 3200,
    avgPurchaseValue: 350,
    avgPurchaseFrequency: 7,
    customerLifespan: 18,
  };
}

export async function getUserActivityTimeline(userId: string) {
  const [ads, offers, messages, favs] = await Promise.all([
    supabase.from('ads').select('id, title, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
    supabase.from('offers').select('id, amount, status, created_at').eq('buyer_id', userId).order('created_at', { ascending: false }).limit(20),
    supabase.from('messages').select('id, content, created_at').eq('sender_id', userId).order('created_at', { ascending: false }).limit(20),
    supabase.from('favorites').select('ad_id, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
  ]);

  const timeline: { type: string; id: string; detail: string; created_at: string }[] = [];

  (ads.data ?? []).forEach((a) =>
    timeline.push({ type: 'ad_created', id: a.id, detail: a.title, created_at: a.created_at })
  );
  (offers.data ?? []).forEach((o) =>
    timeline.push({ type: 'offer_made', id: o.id, detail: `৳${o.amount} (${o.status})`, created_at: o.created_at })
  );
  (messages.data ?? []).forEach((m) =>
    timeline.push({ type: 'message_sent', id: m.id, detail: m.content?.substring(0, 50) ?? '', created_at: m.created_at })
  );
  (favs.data ?? []).forEach((f) =>
    timeline.push({ type: 'favorite_added', id: f.ad_id, detail: '', created_at: f.created_at })
  );

  timeline.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return timeline;
}

export async function getHeatmapData(pageUrl: string) {
  // Placeholder: would return click/interaction heatmap data
  return {
    pageUrl,
    totalClicks: Math.floor(Math.random() * 5000) + 500,
    hotspots: Array.from({ length: 10 }, (_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      intensity: Math.random(),
      clicks: Math.floor(Math.random() * 300) + 10,
    })),
  };
}
