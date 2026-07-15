import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { checkIsAdmin } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShieldCheck, Lock, Mail, ArrowLeft, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

/**
 * AdminRoute - Gate for /admin routes.
 * 
 * Instead of redirecting to the customer /auth page, this shows a dedicated
 * admin login portal when the user is not authenticated. This gives admins
 * a separate login screen from regular customers.
 * 
 * Flow:
 *   1. Session loading OR admin role not yet resolved  -> loader
 *   2. No user                                         -> show AdminLogin
 *   3. User but confirmed non-admin (isAdmin === false)-> show AccessDenied
 *   4. Confirmed admin                                 -> render children
 */

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter your credentials');
      return;
    }
    setIsSigningIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success('Welcome back, Admin');
      // The AdminRoute will re-render and check the role automatically
    } catch (err: any) {
      toast.error(err?.message || 'Invalid credentials');
    }
    setIsSigningIn(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <Card className="max-w-md w-full border-slate-800 bg-slate-900/50 backdrop-blur">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">BazarBD Admin</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Sign in to the admin portal</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Admin Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@bazarbd.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isSigningIn}>
              {isSigningIn ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
              Sign In to Admin Portal
            </Button>
          </form>
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to Marketplace
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AccessDenied({
  onRecheck,
  roles,
  userId,
}: {
  onRecheck: () => void;
  roles: string[];
  userId?: string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Access Denied</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            You are signed in, but this browser session could not load an admin role
            from <code className="text-xs">user_roles</code>.
          </p>
          <p className="text-xs text-muted-foreground text-left rounded-md border border-slate-800 bg-slate-900/60 p-3 font-mono break-all">
            user_id: {userId || '—'}
            <br />
            roles loaded: {roles.length ? roles.join(', ') : '(none)'}
            <br />
            Fix: run supabase/18_fix_super_admin_access.sql in Supabase SQL Editor
            (paste your UUID), then click Re-check roles.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={onRecheck}>Re-check roles</Button>
            <Button variant="outline" onClick={() => supabase.auth.signOut()}>
              Sign Out
            </Button>
            <a href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              ← Back to Marketplace
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FullScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading admin portal...</p>
      </div>
    </div>
  );
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isLoading, isAdmin, roles, refreshRoles } = useAuth();
  const [rechecking, setRechecking] = useState(false);
  const [fallbackAdmin, setFallbackAdmin] = useState<boolean | null>(null);

  const runChecks = async () => {
    if (!user) return;
    setRechecking(true);
    try {
      await refreshRoles();
      const result = await checkIsAdmin(user.id);
      setFallbackAdmin(result);
    } finally {
      setRechecking(false);
    }
  };

  // When visiting /admin, re-check roles (SQL grants often happen after login).
  useEffect(() => {
    if (!user || isLoading) return;
    if (isAdmin === true) return;
    void runChecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isLoading]);

  if (isLoading || (user && isAdmin === null) || rechecking) {
    return <FullScreenLoader />;
  }

  if (!user) {
    return <AdminLogin />;
  }

  if (isAdmin === true || fallbackAdmin === true) {
    return <>{children}</>;
  }

  return (
    <AccessDenied
      userId={user.id}
      roles={(roles || []).map(String)}
      onRecheck={() => void runChecks()}
    />
  );
}
