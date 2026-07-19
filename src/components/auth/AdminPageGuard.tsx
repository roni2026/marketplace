import { ReactNode, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAdminNavAccess } from '@/hooks/useAdminNavAccess';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Forbidden } from '@/components/auth/Forbidden';

interface AdminPageGuardProps {
  /** The /admin href used to resolve the tab permission key. */
  href: string;
  /** When true, only super_admin may open the page (403 for everyone else). */
  superAdminOnly?: boolean;
  children: ReactNode;
}

/**
 * Enforces per-page admin authorization. Must be rendered INSIDE <AdminRoute>
 * (which already guarantees the user is a confirmed admin). This guard adds the
 * second layer: tab-level grants and super-admin-only pages. Unauthorized users
 * — including those typing the URL directly — get a 403 instead of the page.
 *
 * This is defense-in-depth only: the backend independently enforces the same
 * rules via RLS policies and SECURITY DEFINER RPCs.
 */
export function AdminPageGuard({ href, superAdminOnly, children }: AdminPageGuardProps) {
  const { roles } = useAuth();
  const { canAccessHref, loading } = useAdminNavAccess();

  const isStrictSuperAdmin = useMemo(
    () => (roles || []).map((r) => String(r).toLowerCase()).includes('super_admin'),
    [roles],
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (superAdminOnly && !isStrictSuperAdmin) {
    return (
      <AdminLayout>
        <Forbidden message="This page is restricted to Super Admins only." />
      </AdminLayout>
    );
  }

  if (!canAccessHref(href)) {
    return (
      <AdminLayout>
        <Forbidden />
      </AdminLayout>
    );
  }

  return <>{children}</>;
}

export default AdminPageGuard;
