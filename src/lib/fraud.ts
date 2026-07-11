import { supabase } from '@/integrations/supabase/client';

export interface FraudFlag {
  id: string;
  user_id: string;
  flag_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string | null;
  auto_generated: boolean;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface IPReputation {
  id: string;
  ip_address: string;
  reputation_score: number;
  is_vpn: boolean;
  is_proxy: boolean;
  is_blacklisted: boolean;
  country: string | null;
  isp: string | null;
  last_checked: string;
}

export interface DeviceFingerprint {
  id: string;
  user_id: string;
  fingerprint_hash: string;
  device_info: Record<string, unknown>;
  ip_address: string | null;
  first_seen: string;
  last_seen: string;
}

const SUSPICIOUS_EMAIL_DOMAINS = ['tempmail.com', 'guerrillamail.com', 'mailinator.com', 'throwaway.email', '10minutemail.com'];
const BANNED_KEYWORDS = ['fake', 'counterfeit', 'replica', 'stolen', 'illegal'];

/**
 * Detect fake account patterns
 */
export async function detectFakeAccount(userId: string): Promise<{ isFake: boolean; reasons: string[] }> {
  const reasons: string[] = [];

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, created_at')
    .eq('user_id', userId)
    .maybeSingle();

  // Get user email
  const { data: authData } = await supabase.auth.getUser();
  const email = authData.user?.email || '';

  // New account with many listings
  const { count: listingCount } = await supabase
    .from('ads')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (profile?.created_at) {
    const ageDays = Math.floor(
      (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (ageDays < 7 && (listingCount || 0) > 5) {
      reasons.push('New account with many listings');
    }
  }

  // No profile photo
  if (!profile?.avatar_url) {
    reasons.push('No profile photo');
  }

  // Generic/temp email
  const emailDomain = email.split('@')[1]?.toLowerCase();
  if (emailDomain && SUSPICIOUS_EMAIL_DOMAINS.includes(emailDomain)) {
    reasons.push('Temporary email domain');
  }

  // No phone number
  const { data: fullProfile } = await supabase
    .from('profiles')
    .select('phone_number')
    .eq('user_id', userId)
    .maybeSingle();

  if (!fullProfile?.phone_number) {
    reasons.push('No phone number');
  }

  return { isFake: reasons.length >= 3, reasons };
}

/**
 * Detect multiple accounts on same device/IP
 */
export async function detectMultiAccount(userId: string): Promise<{ hasMultiple: boolean; accounts: string[] }> {
  const { data: fingerprints } = await supabase
    .from('device_fingerprints')
    .select('fingerprint_hash, ip_address')
    .eq('user_id', userId);

  if (!fingerprints || fingerprints.length === 0) {
    return { hasMultiple: false, accounts: [] };
  }

  const hashes = fingerprints.map((f) => f.fingerprint_hash);
  const ips = fingerprints.map((f) => f.ip_address).filter(Boolean);

  // Check for other users with same fingerprint
  const { data: otherUsers } = await supabase
    .from('device_fingerprints')
    .select('user_id')
    .in('fingerprint_hash', hashes)
    .neq('user_id', userId);

  // Check for other users with same IP
  if (ips.length > 0) {
    const { data: ipUsers } = await supabase
      .from('device_fingerprints')
      .select('user_id')
      .in('ip_address', ips)
      .neq('user_id', userId);

    if (ipUsers) {
      otherUsers?.push(...ipUsers);
    }
  }

  const uniqueAccounts = [...new Set(otherUsers?.map((u) => u.user_id) || [])];
  return { hasMultiple: uniqueAccounts.length > 0, accounts: uniqueAccounts };
}

/**
 * Check if IP is a VPN
 */
export async function detectVPN(ipAddress: string): Promise<boolean> {
  const { data } = await supabase
    .from('ip_reputation')
    .select('is_vpn')
    .eq('ip_address', ipAddress)
    .maybeSingle();

  return data?.is_vpn ?? false;
}

/**
 * Check if IP is a proxy
 */
export async function detectProxy(ipAddress: string): Promise<boolean> {
  const { data } = await supabase
    .from('ip_reputation')
    .select('is_proxy')
    .eq('ip_address', ipAddress)
    .maybeSingle();

  return data?.is_proxy ?? false;
}

/**
 * Detect suspicious login patterns
 */
export async function detectSuspiciousLogin(
  userId: string,
  ip: string,
  device: Record<string, unknown>
): Promise<{ isSuspicious: boolean; reasons: string[] }> {
  const reasons: string[] = [];

  // Check if IP is blacklisted
  const { data: ipRep } = await supabase
    .from('ip_reputation')
    .select('*')
    .eq('ip_address', ip)
    .maybeSingle();

  if (ipRep?.is_blacklisted) {
    reasons.push('Login from blacklisted IP');
  }
  if (ipRep?.is_vpn) {
    reasons.push('Login from VPN');
  }
  if (ipRep?.is_proxy) {
    reasons.push('Login from proxy');
  }

  // Check for new device
  const { data: knownDevices } = await supabase
    .from('device_fingerprints')
    .select('fingerprint_hash')
    .eq('user_id', userId)
    .eq('ip_address', ip);

  if (!knownDevices || knownDevices.length === 0) {
    reasons.push('Login from new IP address');
  }

  // Check for login from different country than usual
  if (ipRep?.country) {
    const { data: prevLogins } = await supabase
      .from('device_fingerprints')
      .select('ip_address')
      .eq('user_id', userId)
      .limit(5);

    if (prevLogins && prevLogins.length > 0) {
      const prevIps = prevLogins.map((l) => l.ip_address).filter(Boolean);
      if (prevIps.length > 0) {
        const { data: prevReps } = await supabase
          .from('ip_reputation')
          .select('country')
          .in('ip_address', prevIps);

        const prevCountries = new Set(prevReps?.map((r) => r.country).filter(Boolean));
        if (prevCountries.size > 0 && !prevCountries.has(ipRep.country)) {
          reasons.push(`Login from new country: ${ipRep.country}`);
        }
      }
    }
  }

  return { isSuspicious: reasons.length > 0, reasons };
}

/**
 * Detect suspicious listing patterns
 */
export async function detectSuspiciousListing(adId: string): Promise<{ isSuspicious: boolean; reasons: string[] }> {
  const reasons: string[] = [];

  const { data: ad } = await supabase
    .from('ads')
    .select('title, description, price, user_id, category_id')
    .eq('id', adId)
    .maybeSingle();

  if (!ad) return { isSuspicious: false, reasons };

  // Check for banned keywords
  const textToCheck = `${ad.title} ${ad.description || ''}`.toLowerCase();
  for (const keyword of BANNED_KEYWORDS) {
    if (textToCheck.includes(keyword)) {
      reasons.push(`Contains banned keyword: ${keyword}`);
    }
  }

  // Check for duplicate content
  const { data: duplicates } = await supabase
    .from('ads')
    .select('id, user_id')
    .eq('title', ad.title)
    .neq('id', adId)
    .limit(5);

  if (duplicates && duplicates.length > 0) {
    const sameUserDuplicates = duplicates.filter((d) => d.user_id === ad.user_id);
    if (sameUserDuplicates.length > 0) {
      reasons.push('Duplicate listing by same user');
    } else {
      reasons.push('Duplicate listing title found');
    }
  }

  // Check price anomaly
  if (ad.price && ad.price > 0) {
    const anomalyResult = await detectPriceAnomaly(adId);
    if (anomalyResult.isAnomaly) {
      reasons.push(`Price anomaly: ${anomalyResult.reason}`);
    }
  }

  // Check seller's account for fraud flags
  const { count: fraudFlags } = await supabase
    .from('fraud_flags')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', ad.user_id)
    .eq('resolved', false);

  if ((fraudFlags || 0) > 2) {
    reasons.push('Seller has multiple unresolved fraud flags');
  }

  return { isSuspicious: reasons.length > 0, reasons };
}

/**
 * Compare price to similar listings
 */
export async function detectPriceAnomaly(adId: string): Promise<{ isAnomaly: boolean; reason: string }> {
  const { data: ad } = await supabase
    .from('ads')
    .select('price, category_id, title')
    .eq('id', adId)
    .maybeSingle();

  if (!ad || !ad.price || ad.price <= 0) {
    return { isAnomaly: false, reason: '' };
  }

  // Get similar listings in same category
  const { data: similar } = await supabase
    .from('ads')
    .select('price')
    .eq('category_id', ad.category_id)
    .neq('id', adId)
    .gt('price', 0)
    .limit(20);

  if (!similar || similar.length < 3) {
    return { isAnomaly: false, reason: '' };
  }

  const prices = similar.map((s) => s.price).filter(Boolean) as number[];
  const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;

  // Check if price is significantly below average (potential scam)
  if (ad.price < avgPrice * 0.3) {
    return { isAnomaly: true, reason: `Price ${Math.round((1 - ad.price / avgPrice) * 100)}% below average` };
  }

  // Check if price is significantly above average (potential overpricing)
  if (ad.price > avgPrice * 3) {
    return { isAnomaly: true, reason: `Price ${Math.round((ad.price / avgPrice - 1) * 100)}% above average` };
  }

  return { isAnomaly: false, reason: '' };
}

/**
 * Calculate aggregate fraud risk score
 */
export async function calculateFraudRisk(userId: string): Promise<number> {
  let risk = 0;

  // Unresolved fraud flags
  const { count: unresolvedFlags } = await supabase
    .from('fraud_flags')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('resolved', false);

  risk += (unresolvedFlags || 0) * 5;

  // High severity flags
  const { count: highFlags } = await supabase
    .from('fraud_flags')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('severity', ['high', 'critical'])
    .eq('resolved', false);

  risk += (highFlags || 0) * 15;

  // Fake account detection
  const fakeCheck = await detectFakeAccount(userId);
  if (fakeCheck.isFake) {
    risk += 20;
  }

  // Multi-account detection
  const multiCheck = await detectMultiAccount(userId);
  if (multiCheck.hasMultiple) {
    risk += 15;
  }

  // Shadow banned
  const { data: shadowBan } = await supabase
    .from('shadow_bans')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (shadowBan) {
    risk += 30;
  }

  // Many listings from new account
  const { data: profile } = await supabase
    .from('profiles')
    .select('created_at')
    .eq('user_id', userId)
    .maybeSingle();

  const { count: listings } = await supabase
    .from('ads')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (profile?.created_at) {
    const ageDays = Math.floor(
      (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (ageDays < 7 && (listings || 0) > 10) {
      risk += 10;
    }
  }

  risk = Math.min(risk, 100);

  // Update seller_scores
  await supabase.from('seller_scores').upsert({
    user_id: userId,
    fraud_risk_score: risk,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  return risk;
}

/**
 * Auto-flag a suspicious account
 */
export async function autoFlagAccount(userId: string, reason: string): Promise<void> {
  await supabase.from('fraud_flags').insert({
    user_id: userId,
    flag_type: 'auto_flag',
    severity: 'medium',
    description: reason,
    auto_generated: true,
    resolved: false,
  });
}

/**
 * Auto shadow ban high-risk accounts
 */
export async function autoShadowBan(userId: string, reason: string): Promise<void> {
  const riskScore = await calculateFraudRisk(userId);

  if (riskScore >= 70) {
    // Check if already shadow banned
    const { data: existing } = await supabase
      .from('shadow_bans')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existing) {
      await supabase.from('shadow_bans').insert({
        user_id: userId,
        reason: `Auto shadow ban: ${reason} (risk score: ${riskScore})`,
      });

      await supabase.from('fraud_flags').insert({
        user_id: userId,
        flag_type: 'auto_shadow_ban',
        severity: 'critical',
        description: `Auto shadow banned due to high fraud risk score (${riskScore})`,
        auto_generated: true,
        resolved: false,
      });
    }
  }
}

/**
 * Check IP reputation against blacklist and reputation DB
 */
export async function checkIPReputation(ip: string): Promise<IPReputation | null> {
  const { data } = await supabase
    .from('ip_reputation')
    .select('*')
    .eq('ip_address', ip)
    .maybeSingle();

  return data as IPReputation | null;
}

/**
 * Check if an email, phone, or IP is blacklisted
 */
export async function checkBlacklisted(
  type: 'ip' | 'email' | 'phone',
  value: string
): Promise<boolean> {
  const { data } = await supabase
    .from('blacklisted_items')
    .select('id')
    .eq('type', type)
    .eq('value', value)
    .maybeSingle();

  return !!data;
}

/**
 * Add an item to the blacklist
 */
export async function addBlacklistItem(
  type: 'ip' | 'email' | 'phone',
  value: string,
  reason: string,
  addedBy: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.from('blacklisted_items').insert({
      type,
      value,
      reason,
      added_by: addedBy,
    });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}
