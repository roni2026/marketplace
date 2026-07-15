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
  const roleList = useMemo(() => (roles || []).map((r) => String(r).toLowerCase()), [roles]);
  // Super admin, plain admin, or confirmed admin with no role rows yet (RPC lag)
  // all get the full sidebar — limited staff still go through tab grants.
  const isSuperAdmin = useMemo(
    () => roleList.includes('super_admin') || roleList.includes('admin'),
    [roleList],
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
      // Full access: super_admin / admin, or admin flag true with empty roles
      // (role select failed but is_admin RPC succeeded).
      if (isSuperAdmin || roleList.length === 0) {
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
  }, [user?.id, isAdmin, isSuperAdmin, roleList.length]);

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
