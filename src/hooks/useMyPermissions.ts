import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  getPermissionsForUser,
  type AdvancedPermission,
} from '@/lib/permissions_v2';

/**
 * Loads the signed-in user's effective advanced permissions
 * (role defaults + individual overrides). Used to gate admin UI actions.
 * Backend RPCs independently re-check the same permissions, so this is
 * purely for hiding controls the user cannot use.
 */
export function useMyPermissions() {
  const { user, roles } = useAuth();
  const [perms, setPerms] = useState<Record<AdvancedPermission, boolean> | null>(null);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = (roles || []).map((r) => String(r).toLowerCase()).includes('super_admin');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) {
        setPerms(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const p = await getPermissionsForUser(user.id);
        if (!cancelled) setPerms(p);
      } catch {
        if (!cancelled) setPerms(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const can = useCallback(
    (permission: AdvancedPermission): boolean => {
      if (isSuperAdmin) return true;
      return !!perms?.[permission];
    },
    [perms, isSuperAdmin],
  );

  return { can, perms, loading, isSuperAdmin };
}
