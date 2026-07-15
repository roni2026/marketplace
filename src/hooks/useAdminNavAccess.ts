import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { hrefToPermissionKey, isAlwaysVisibleForAnyAdmin } from '@/lib/adminNavAccess';

/**
 * Loads per-user admin tab grants. Super admins see everything.
 * Limited admins only see tabs explicitly granted in admin_tab_permissions.
 */
export function useAdminNavAccess() {
  const { user, roles, isAdmin } = useAuth();
  const isSuperAdmin = useMemo(
    () => (roles || []).includes('super_admin' as any) || (roles || []).includes('super_admin'),
    [roles],
  );
  const [allowed, setAllowed] = useState<Set<string> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id || isAdmin !== true) {
        setAllowed(new Set());
        setLoading(false);
        return;
      }
      if (isSuperAdmin) {
        setAllowed(null); // null => all
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('admin_tab_permissions')
          .select('permission_key')
          .eq('user_id', user.id);
        if (error) throw error;
        if (!cancelled) {
          setAllowed(new Set((data || []).map((r: any) => r.permission_key)));
        }
      } catch {
        if (!cancelled) setAllowed(new Set());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, isAdmin, isSuperAdmin]);

  const canAccessHref = useCallback(
    (href: string) => {
      if (isSuperAdmin) return true;
      if (isAlwaysVisibleForAnyAdmin(href)) return true;
      if (!allowed) return false;
      const key = hrefToPermissionKey(href);
      if (!key) return false;
      return allowed.has(key);
    },
    [allowed, isSuperAdmin],
  );

  return { canAccessHref, isSuperAdmin, loading, allowedKeys: allowed };
}
