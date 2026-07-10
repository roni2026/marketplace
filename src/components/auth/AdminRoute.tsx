import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { FullScreenLoader } from './ProtectedRoute';

/**
 * Gate for /admin routes.
 * Three-phase logic that avoids the "instant redirect" bug:
 *   1. Session loading OR admin role not yet resolved  -> loader (never redirect)
 *   2. No user                                         -> /auth
 *   3. User but confirmed non-admin (isAdmin === false)-> home
 *   4. Confirmed admin                                 -> render children
 */
export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isLoading, isAdmin } = useAuth();
  const location = useLocation();

  // Still resolving the session, or the admin check hasn't returned yet.
  if (isLoading || (user && isAdmin === null)) {
    return <FullScreenLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  if (isAdmin === false) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
