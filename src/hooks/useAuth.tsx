import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, fetchUserRoles, hasPermission as checkPermission, isAdminRole, isStaffRole, Permission } from '@/lib/permissions';
import { logLogin, logLogout, logLoginAttempt } from '@/lib/audit';

interface ProfileData {
  full_name: string | null;
  phone_number: string | null;
  division: string | null;
  district: string | null;
  area: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  is_suspended: boolean | null;
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
      .select('full_name, phone_number, division, district, area, avatar_url, is_verified, is_suspended')
      .eq('user_id', userId)
      .maybeSingle();

    if (data) {
      setProfile(data as ProfileData);
    }
  }, []);

  const checkRoles = useCallback(async (userId: string) => {
    const userRoles = await fetchUserRoles(userId);
    setRoles(userRoles);
    setIsAdmin(isAdminRole(userRoles) ? true : false);
  }, []);

  const calculateProfileCompletion = (p: ProfileData | null): number => {
    if (!p) return 0;
    const fields = [
      { key: 'full_name', weight: 20 },
      { key: 'phone_number', weight: 20 },
      { key: 'division', weight: 15 },
      { key: 'district', weight: 15 },
      { key: 'area', weight: 10 },
      { key: 'avatar_url', weight: 20 },
    ];
    let score = 0;
    for (const field of fields) {
      const value = p[field.key as keyof ProfileData];
      if (value && String(value).trim()) {
        score += field.weight;
      }
    }
    return score;
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setIsAdmin(null);
        setTimeout(() => {
          checkRoles(session.user.id);
          fetchProfile(session.user.id);
        }, 0);
      } else {
        setIsAdmin(false);
        setRoles([]);
        setProfile(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkRoles(session.user.id);
        fetchProfile(session.user.id);
      } else {
        setIsAdmin(false);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
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
