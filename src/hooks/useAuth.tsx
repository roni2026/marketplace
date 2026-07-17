import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, fetchUserRoles, checkIsAdmin, hasPermission as checkPermission, isAdminRole, isStaffRole, Permission, clearAdminCache, readAdminCache } from '@/lib/permissions';
import { isAllowlistedAdmin } from '@/lib/adminAllowlist';
import { logLogin, logLogout, logLoginAttempt } from '@/lib/audit';

interface ProfileData {
  full_name: string | null;
  phone_number: string | null;
  secondary_phone: string | null;
  division: string | null;
  district: string | null;
  area: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  website: string | null;
  social_links: Record<string, string> | null;
  preferred_language: string | null;
  preferred_currency: string | null;
  is_verified: boolean | null;
  is_suspended: boolean | null;
  is_public: boolean | null;
  last_active_at: string | null;
  seller_rating: number | null;
  buyer_rating: number | null;
  total_sales: number | null;
  total_purchases: number | null;
  total_followers: number | null;
  total_following: number | null;
  total_reviews: number | null;
  response_rate: number | null;
  avg_response_time_hours: number | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  /**
   * Admin flag with three states:
   *  - null  => the admin role check has not resolved yet (still loading)
   *  - false => confirmed NOT an admin
   *  - true  => confirmed admin
   */
  isAdmin: boolean | null;
  roles: AppRole[];
  profile: ProfileData | null;
  profileCompletion: number;
  hasPermission: (permission: Permission) => boolean;
  isStaff: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, phone_number, secondary_phone, division, district, area, avatar_url, banner_url, bio, website, social_links, preferred_language, preferred_currency, is_verified, is_suspended, is_public, last_active_at, seller_rating, buyer_rating, total_sales, total_purchases, total_followers, total_following, total_reviews, response_rate, avg_response_time_hours')
      .eq('user_id', userId)
      .maybeSingle();

    if (data) {
      setProfile(data as ProfileData);
    }
  }, []);

  const checkRoles = useCallback(async (userId: string) => {
    // Optimistic: if we already confirmed admin this session, don't flash false.
    const cached = readAdminCache(userId);
    if (cached === true) setIsAdmin(true);
    // Emergency env allowlist (works even when DB roles cannot be read)
    if (isAllowlistedAdmin({ id: userId })) {
      setIsAdmin(true);
    }

    try {
      const userRoles = await fetchUserRoles(userId);
      setRoles(userRoles);
      if (
        isAdminRole(userRoles) ||
        userRoles.includes('super_admin') ||
        userRoles.includes('admin') ||
        userRoles.includes('moderator')
      ) {
        setIsAdmin(true);
        return;
      }
      // Role list empty/incomplete (RLS or missing RPC) — use security-definer checks.
      const admin = await checkIsAdmin(userId);
      setIsAdmin(admin);
    } catch (err) {
      console.warn('checkRoles failed:', err);
      try {
        const admin = await checkIsAdmin(userId);
        setIsAdmin(admin);
      } catch {
        setIsAdmin(cached === true ? true : false);
      }
    }
  }, []);

  const calculateProfileCompletion = (p: ProfileData | null): number => {
    if (!p) return 0;
    const fields = [
      { key: 'full_name', weight: 15 },
      { key: 'phone_number', weight: 15 },
      { key: 'division', weight: 10 },
      { key: 'district', weight: 10 },
      { key: 'area', weight: 5 },
      { key: 'avatar_url', weight: 15 },
      { key: 'banner_url', weight: 5 },
      { key: 'bio', weight: 10 },
      { key: 'website', weight: 5 },
      { key: 'social_links', weight: 5 },
      { key: 'preferred_language', weight: 3 },
      { key: 'preferred_currency', weight: 2 },
    ];
    let score = 0;
    for (const field of fields) {
      const value = p[field.key as keyof ProfileData];
      if (value && String(value).trim() && value !== '{}') {
        score += field.weight;
      }
    }
    return score;
  };

  useEffect(() => {
    let mounted = true;
    let bootstrapped = false;

    const applySession = async (session: Session | null, opts?: { resetAdmin?: boolean }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Only clear isAdmin on real sign-in so TOKEN_REFRESHED does not
        // flash the admin UI / bounce /admin back to a loader.
        if (opts?.resetAdmin) setIsAdmin(null);
        await Promise.all([
          checkRoles(session.user.id),
          fetchProfile(session.user.id),
        ]);
      } else {
        setIsAdmin(false);
        setRoles([]);
        setProfile(null);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Ignore noisy token refreshes for role state — session token is updated
      // by setSession but roles stay put.
      if (event === 'TOKEN_REFRESHED') {
        setSession(session);
        setUser(session?.user ?? null);
        return;
      }

      const resetAdmin = event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED';
      void (async () => {
        await applySession(session, { resetAdmin });
        if (mounted && !bootstrapped) {
          bootstrapped = true;
          setIsLoading(false);
        }
      })();
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      await applySession(session, { resetAdmin: true });
      if (mounted) {
        bootstrapped = true;
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [checkRoles, fetchProfile]);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      await logLoginAttempt(email, false, error.message);
    } else if (data.user) {
      await logLoginAttempt(email, true);
      await logLogin(data.user.id);

      // Record session
      try {
        await supabase.from('user_sessions').insert({
          user_id: data.user.id,
          is_active: true,
        });
      } catch {
        // Non-critical
      }
    }

    return { error };
  };

  const signOut = async () => {
    if (user) {
      await logLogout(user.id);
      try {
        await supabase
          .from('user_sessions')
          .update({ is_active: false })
          .eq('user_id', user.id)
          .eq('is_active', true);
      } catch {
        // Non-critical
      }
    }
    await supabase.auth.signOut();
    clearAdminCache();
    setIsAdmin(false);
    setRoles([]);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const refreshRoles = async () => {
    if (user) {
      await checkRoles(user.id);
    }
  };

  const hasPermission = useCallback(
    (permission: Permission) => checkPermission(roles, permission),
    [roles]
  );

  const profileCompletion = calculateProfileCompletion(profile);
  const isStaff = isStaffRole(roles);

  return (
    <AuthContext.Provider value={{
      user, session, isLoading, isAdmin, roles, profile, profileCompletion,
      hasPermission, isStaff,
      signUp, signIn, signOut, refreshProfile, refreshRoles,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
