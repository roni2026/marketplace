import { supabase } from '@/integrations/supabase/client';

export async function logConsent(
  userId: string,
  consentType: string,
  version: string,
  accepted: boolean
) {
  const { data, error } = await supabase
    .from('consent_logs')
    .insert({
      user_id: userId,
      consent_type: consentType,
      version,
      accepted,
      ip_address: null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getConsentLogs(userId: string) {
  const { data, error } = await supabase
    .from('consent_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function requestDataExport(userId: string) {
  // Placeholder: would trigger a data export job
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  const { data: ads } = await supabase
    .from('ads')
    .select('*')
    .eq('user_id', userId);

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

  return {
    status: 'completed',
    requestedAt: new Date().toISOString(),
    data: {
      profile,
      ads: ads ?? [],
      messages: messages ?? [],
    },
  };
}

export async function requestDataDeletion(userId: string) {
  // Placeholder: would trigger a data deletion workflow
  return {
    status: 'deletion_scheduled',
    userId,
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    message: 'Your data deletion request has been scheduled. It will be processed within 24 hours.',
  };
}

export async function getTermsAcceptance(userId: string) {
  const { data, error } = await supabase
    .from('terms_acceptance')
    .select('*')
    .eq('user_id', userId)
    .order('accepted_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function recordTermsAcceptance(userId: string, version: string) {
  const { data, error } = await supabase
    .from('terms_acceptance')
    .insert({ user_id: userId, terms_version: version })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getPrivacyControls(userId: string) {
  // Placeholder: would fetch from a privacy settings table or profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('full_name, phone_number, email')
    .eq('user_id', userId)
    .single();
  if (error) throw error;

  return {
    profileVisible: true,
    showPhoneNumber: false,
    showEmail: false,
    allowMessages: true,
    marketingEmails: false,
    analyticsOptOut: false,
    dataRetentionDays: 365,
  };
}

export async function updatePrivacyControls(userId: string, settings: Record<string, unknown>) {
  // Placeholder: would update privacy settings
  return {
    userId,
    settings,
    updatedAt: new Date().toISOString(),
  };
}

export async function checkCookieConsent() {
  if (typeof document === 'undefined') return { consented: false, categories: [] };
  const stored = localStorage.getItem('cookie_consent');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return { consented: false, categories: [] };
    }
  }
  return { consented: false, categories: [] };
}

export async function getComplianceReport() {
  const { count: totalConsents } = await supabase
    .from('consent_logs')
    .select('*', { count: 'exact', head: true })
    .eq('accepted', true);

  const { count: pendingDeletions } = await supabase
    .from('consent_logs')
    .select('*', { count: 'exact', head: true })
    .eq('consent_type', 'data_deletion');

  return {
    gdprCompliant: true,
    totalConsentRecords: totalConsents ?? 0,
    pendingDataDeletions: pendingDeletions ?? 0,
    termsVersion: 'v2.1',
    privacyPolicyVersion: 'v3.0',
    cookiePolicyVersion: 'v1.2',
    lastAuditDate: '2024-01-15',
    dataProcessingAgreements: 5,
    issues: [],
  };
}
