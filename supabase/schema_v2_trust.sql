-- Trust & Verification, Fraud Detection, and Advanced Permission Schema
-- schema_v2_trust.sql

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Business Verifications
-- ============================================
CREATE TABLE IF NOT EXISTS public.business_verifications (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 business_name TEXT NOT NULL,
 business_type TEXT NOT NULL DEFAULT 'individual',
 license_number TEXT,
 tax_id TEXT,
 address TEXT,
 verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
 verified_at TIMESTAMPTZ,
 verified_by UUID REFERENCES auth.users(id),
 documents JSONB DEFAULT '[]'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_business_verifications_user_id ON public.business_verifications(user_id);
CREATE INDEX idx_business_verifications_status ON public.business_verifications(verification_status);
CREATE INDEX idx_business_verifications_created_at ON public.business_verifications(created_at DESC);

ALTER TABLE public.business_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own business verification" ON public.business_verifications
 FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own business verification" ON public.business_verifications
 FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own business verification" ON public.business_verifications
 FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all business verifications" ON public.business_verifications
 FOR SELECT USING (
 EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin'))
 );
CREATE POLICY "Admins can update business verifications" ON public.business_verifications
 FOR UPDATE USING (
 EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin'))
 );

-- ============================================
-- Address Verifications
-- ============================================
CREATE TABLE IF NOT EXISTS public.address_verifications (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 address TEXT NOT NULL,
 verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
 verified_at TIMESTAMPTZ,
 coordinates JSONB,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_address_verifications_user_id ON public.address_verifications(user_id);
CREATE INDEX idx_address_verifications_status ON public.address_verifications(verification_status);

ALTER TABLE public.address_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own address verification" ON public.address_verifications
 FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own address verification" ON public.address_verifications
 FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own address verification" ON public.address_verifications
 FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all address verifications" ON public.address_verifications
 FOR SELECT USING (
 EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin'))
 );
CREATE POLICY "Admins can update address verifications" ON public.address_verifications
 FOR UPDATE USING (
 EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin'))
 );

-- ============================================
-- Seller Scores
-- ============================================
CREATE TABLE IF NOT EXISTS public.seller_scores (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
 trust_score NUMERIC(5,2) NOT NULL DEFAULT 50.00,
 fraud_risk_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
 reputation_score NUMERIC(5,2) NOT NULL DEFAULT 50.00,
 factors JSONB DEFAULT '{}'::jsonb,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_seller_scores_user_id ON public.seller_scores(user_id);
CREATE INDEX idx_seller_scores_trust_score ON public.seller_scores(trust_score DESC);
CREATE INDEX idx_seller_scores_fraud_risk ON public.seller_scores(fraud_risk_score DESC);

ALTER TABLE public.seller_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own seller scores" ON public.seller_scores
 FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all seller scores" ON public.seller_scores
 FOR SELECT USING (
 EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'moderator'))
 );
CREATE POLICY "Admins can update seller scores" ON public.seller_scores
 FOR UPDATE USING (
 EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin'))
 );
CREATE POLICY "System can insert seller scores" ON public.seller_scores
 FOR INSERT WITH CHECK (true);

-- ============================================
-- Fraud Flags
-- ============================================
CREATE TABLE IF NOT EXISTS public.fraud_flags (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 flag_type TEXT NOT NULL,
 severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
 description TEXT,
 auto_generated BOOLEAN NOT NULL DEFAULT true,
 resolved BOOLEAN NOT NULL DEFAULT false,
 resolved_by UUID REFERENCES auth.users(id),
 resolved_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fraud_flags_user_id ON public.fraud_flags(user_id);
CREATE INDEX idx_fraud_flags_severity ON public.fraud_flags(severity);
CREATE INDEX idx_fraud_flags_resolved ON public.fraud_flags(resolved);
CREATE INDEX idx_fraud_flags_created_at ON public.fraud_flags(created_at DESC);

ALTER TABLE public.fraud_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fraud flags" ON public.fraud_flags
 FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all fraud flags" ON public.fraud_flags
 FOR SELECT USING (
 EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'moderator'))
 );
CREATE POLICY "Admins can update fraud flags" ON public.fraud_flags
 FOR UPDATE USING (
 EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'moderator'))
 );
CREATE POLICY "System can insert fraud flags" ON public.fraud_flags
 FOR INSERT WITH CHECK (true);

-- ============================================
-- Device Fingerprints
-- ============================================
CREATE TABLE IF NOT EXISTS public.device_fingerprints (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 fingerprint_hash TEXT NOT NULL,
 device_info JSONB DEFAULT '{}'::jsonb,
 ip_address TEXT,
 first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
 last_seen TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_device_fingerprints_user_id ON public.device_fingerprints(user_id);
CREATE INDEX idx_device_fingerprints_hash ON public.device_fingerprints(fingerprint_hash);
CREATE INDEX idx_device_fingerprints_ip ON public.device_fingerprints(ip_address);

ALTER TABLE public.device_fingerprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own device fingerprints" ON public.device_fingerprints
 FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all device fingerprints" ON public.device_fingerprints
 FOR SELECT USING (
 EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'moderator'))
 );
CREATE POLICY "System can insert device fingerprints" ON public.device_fingerprints
 FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update device fingerprints" ON public.device_fingerprints
 FOR UPDATE USING (true);

-- ============================================
-- IP Reputation
-- ============================================
CREATE TABLE IF NOT EXISTS public.ip_reputation (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 ip_address TEXT NOT NULL UNIQUE,
 reputation_score NUMERIC(5,2) NOT NULL DEFAULT 100.00,
 is_vpn BOOLEAN NOT NULL DEFAULT false,
 is_proxy BOOLEAN NOT NULL DEFAULT false,
 is_blacklisted BOOLEAN NOT NULL DEFAULT false,
 country TEXT,
 isp TEXT,
 last_checked TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ip_reputation_ip ON public.ip_reputation(ip_address);
CREATE INDEX idx_ip_reputation_blacklisted ON public.ip_reputation(is_blacklisted);

ALTER TABLE public.ip_reputation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view IP reputation" ON public.ip_reputation
 FOR SELECT USING (
 EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'moderator'))
 );
CREATE POLICY "Admins can update IP reputation" ON public.ip_reputation
 FOR UPDATE USING (
 EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin'))
 );
CREATE POLICY "System can insert IP reputation" ON public.ip_reputation
 FOR INSERT WITH CHECK (true);

-- ============================================
-- Blacklisted Items
-- ============================================
CREATE TABLE IF NOT EXISTS public.blacklisted_items (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 type TEXT NOT NULL CHECK (type IN ('ip', 'email', 'phone')),
 value TEXT NOT NULL,
 reason TEXT,
 added_by UUID REFERENCES auth.users(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(type, value)
);

CREATE INDEX idx_blacklisted_items_type ON public.blacklisted_items(type);
CREATE INDEX idx_blacklisted_items_value ON public.blacklisted_items(value);

ALTER TABLE public.blacklisted_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view blacklist" ON public.blacklisted_items
 FOR SELECT USING (
 EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'moderator'))
 );
CREATE POLICY "Admins can manage blacklist" ON public.blacklisted_items
 FOR ALL USING (
 EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin'))
 );

-- ============================================
-- Shadow Bans
-- ============================================
CREATE TABLE IF NOT EXISTS public.shadow_bans (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
 reason TEXT,
 banned_by UUID REFERENCES auth.users(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shadow_bans_user_id ON public.shadow_bans(user_id);

ALTER TABLE public.shadow_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view shadow bans" ON public.shadow_bans
 FOR SELECT USING (
 EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'moderator'))
 );
CREATE POLICY "Admins can manage shadow bans" ON public.shadow_bans
 FOR ALL USING (
 EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin'))
 );

-- ============================================
-- Permission Overrides
-- ============================================
CREATE TABLE IF NOT EXISTS public.permission_overrides (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 permission TEXT NOT NULL,
 granted BOOLEAN NOT NULL DEFAULT true,
 granted_by UUID REFERENCES auth.users(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(user_id, permission)
);

CREATE INDEX idx_permission_overrides_user_id ON public.permission_overrides(user_id);
CREATE INDEX idx_permission_overrides_permission ON public.permission_overrides(permission);

ALTER TABLE public.permission_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own permission overrides" ON public.permission_overrides
 FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all permission overrides" ON public.permission_overrides
 FOR SELECT USING (
 EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin'))
 );
CREATE POLICY "Admins can manage permission overrides" ON public.permission_overrides
 FOR ALL USING (
 EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin'))
 );

-- ============================================
-- Helper Functions
-- ============================================

-- Calculate trust score for a user
CREATE OR REPLACE FUNCTION public.calculate_trust_score(target_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
 v_score NUMERIC := 50.00;
 v_business_verified BOOLEAN;
 v_address_verified BOOLEAN;
 v_account_age_days INTEGER;
 v_completed_txns INTEGER;
 v_positive_reviews INTEGER;
 v_response_rate NUMERIC;
 v_profile_complete BOOLEAN;
BEGIN
 -- Check business verification
 SELECT EXISTS(
 SELECT 1 FROM public.business_verifications
 WHERE user_id = target_user_id AND verification_status = 'approved'
 ) INTO v_business_verified;
 IF v_business_verified THEN
 v_score := v_score + 15;
 END IF;

 -- Check address verification
 SELECT EXISTS(
 SELECT 1 FROM public.address_verifications
 WHERE user_id = target_user_id AND verification_status = 'approved'
 ) INTO v_address_verified;
 IF v_address_verified THEN
 v_score := v_score + 10;
 END IF;

 -- Account age
 SELECT EXTRACT(DAY FROM now() - MIN(created_at)) INTO v_account_age_days
 FROM public.business_verifications WHERE user_id = target_user_id;
 IF v_account_age_days IS NULL THEN
 v_account_age_days := 0;
 END IF;
 IF v_account_age_days > 90 THEN
 v_score := v_score + 10;
 ELSIF v_account_age_days > 30 THEN
 v_score := v_score + 5;
 END IF;

 -- Completed transactions
 SELECT COUNT(*) INTO v_completed_txns
 FROM public.offers WHERE seller_id = target_user_id AND status = 'accepted';
 v_score := v_score + LEAST(v_completed_txns * 2, 10);

 -- Positive reviews
 SELECT COUNT(*) INTO v_positive_reviews
 FROM public.reviews WHERE seller_id = target_user_id AND rating >= 4;
 v_score := v_score + LEAST(v_positive_reviews, 5);

 -- Cap at 100
 v_score := LEAST(v_score, 100.00);

 RETURN v_score;
END;
$$;

-- Calculate fraud risk score for a user
CREATE OR REPLACE FUNCTION public.calculate_fraud_risk(target_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
 v_risk NUMERIC := 0.00;
 v_unresolved_flags INTEGER;
 v_high_severity_flags INTEGER;
 v_account_age_days INTEGER;
 v_listing_count INTEGER;
 v_shadow_banned BOOLEAN;
 v_blacklisted_ip BOOLEAN;
BEGIN
 -- Unresolved fraud flags
 SELECT COUNT(*) INTO v_unresolved_flags
 FROM public.fraud_flags WHERE user_id = target_user_id AND resolved = false;
 v_risk := v_risk + (v_unresolved_flags * 5);

 -- High severity flags
 SELECT COUNT(*) INTO v_high_severity_flags
 FROM public.fraud_flags WHERE user_id = target_user_id AND severity IN ('high', 'critical') AND resolved = false;
 v_risk := v_risk + (v_high_severity_flags * 15);

 -- New account with many listings
 SELECT COUNT(*) INTO v_listing_count
 FROM public.ads WHERE user_id = target_user_id;
 IF v_listing_count > 10 THEN
 v_risk := v_risk + 10;
 END IF;

 -- Shadow banned
 SELECT EXISTS(
 SELECT 1 FROM public.shadow_bans WHERE user_id = target_user_id
 ) INTO v_shadow_banned;
 IF v_shadow_banned THEN
 v_risk := v_risk + 30;
 END IF;

 -- Cap at 100
 v_risk := LEAST(v_risk, 100.00);

 RETURN v_risk;
END;
$$;

-- Check if a user is shadow banned
CREATE OR REPLACE FUNCTION public.check_shadow_ban(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
 v_banned BOOLEAN;
BEGIN
 SELECT EXISTS(
 SELECT 1 FROM public.shadow_bans WHERE user_id = target_user_id
 ) INTO v_banned;
 RETURN v_banned;
END;
$$;

-- ============================================
-- Auto-update updated_at triggers
-- ============================================
drop trigger if exists trg_seller_scores_updated_at on public.seller_scores;
create trigger trg_seller_scores_updated_at
  before update on public.seller_scores
  for each row execute procedure public.set_updated_at();
