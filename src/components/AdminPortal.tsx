import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, ShieldCheck, Lock, Mail, ArrowLeft, LayoutDashboard, Users, Flag, FolderTree, FileCheck, BarChart3, Settings, LifeBuoy, ScrollText, Globe, Ban, KeyRound, Image, Star, MessageSquare, FileText, Search, Zap, Wrench, Database, Server, ShieldAlert, Download, Code, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface AdminStats {
  totalUsers: number;
  pendingAds: number;
  approvedAds: number;
  pendingReports: number;
}

export default function AdminPortal() {
  const { user, session, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [adminRole, setAdminRole] = useState<boolean | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Check if current user is admin
  useEffect(() => {
    if (!authLoading && !user) {
      setAdminRole(false);
      setCheckingRole(false);
      return;
    }
    if (!authLoading && user) {
      checkAdminRole(user.id);
    }
  }, [user, authLoading]);

  const checkAdminRole = async (userId: string) => {
    setCheckingRole(true);
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .in('role', ['admin', 'super_admin', 'moderator']);
      
      if (data && data.length > 0) {
        setAdminRole(true);
        fetchStats();
      } else {
        setAdminRole(false);
      }
    } catch {
      setAdminRole(false);
    }
    setCheckingRole(false);
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const [usersRes, pendingRes, approvedRes, reportsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('ads').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('ads').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('reports').select('id', { count: 'exact', head: true }).eq('is_resolved', false),
      ]);
      setStats({
        totalUsers: usersRes.count ?? 0,
        pendingAds: pendingRes.count ?? 0,
        approvedAds: approvedRes.count ?? 0,
        pendingReports: reportsRes.count ?? 0,
      });
    } catch {
      // Stats are optional - don't block login
    }
    setLoadingStats(false);
  };

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
      // The useEffect will pick up the auth state change and check role
    } catch (err: any) {
      toast.error(err?.message || 'Invalid credentials');
    }
    setIsSigningIn(false);
  };

  // Loading state
  if (authLoading || checkingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading admin portal...</p>
        </div>
      </div>
    );
  }

  // Not an admin
  if (user && adminRole === false) {
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
              You are signed in, but your account does not have admin privileges.
              Please contact a super admin if you believe this is an error.
            </p>
            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={() => { supabase.auth.signOut(); }}>
                Sign Out
              </Button>
              <a href="https://bazarbd.onrender.com" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                ← Back to Marketplace
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin login page
  if (!user || adminRole === false) {
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
              <a href="https://bazarbd.onrender.com" className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" />
                Back to Marketplace
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin is logged in - show admin dashboard with sidebar
  const adminPages = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { label: 'Ad Moderation', icon: FileCheck, path: '/admin/ads' },
    { label: 'User Management', icon: Users, path: '/admin/users' },
    { label: 'Reports', icon: Flag, path: '/admin/reports' },
    { label: 'Categories', icon: FolderTree, path: '/admin/categories' },
    { label: 'Trust & Verification', icon: ShieldCheck, path: '/admin/trust' },
    { label: 'Fraud Detection', icon: Ban, path: '/admin/fraud' },
    { label: 'Permissions', icon: KeyRound, path: '/admin/permissions' },
    { label: 'Analytics', icon: BarChart3, path: '/admin/analytics' },
    { label: 'Audit Log', icon: ScrollText, path: '/admin/audit' },
    { label: 'Support', icon: LifeBuoy, path: '/admin/support' },
    { label: 'Review Moderation', icon: Star, path: '/admin/reviews' },
    { label: 'Message Monitoring', icon: MessageSquare, path: '/admin/messages' },
    { label: 'Media Library', icon: Image, path: '/admin/media' },
    { label: 'CMS', icon: FileText, path: '/admin/cms' },
    { label: 'SEO', icon: Globe, path: '/admin/seo' },
    { label: 'Workflow', icon: Zap, path: '/admin/workflow' },
    { label: 'Admin Tools', icon: Wrench, path: '/admin/tools' },
    { label: 'Reporting', icon: BarChart3, path: '/admin/reporting' },
    { label: 'API Logs', icon: Search, path: '/admin/api-logs' },
    { label: 'System Monitor', icon: Server, path: '/admin/monitoring' },
    { label: 'Compliance', icon: ShieldAlert, path: '/admin/compliance' },
    { label: 'Developer', icon: Code, path: '/admin/developer' },
    { label: 'Backup & Recovery', icon: Database, path: '/admin/backup' },
    { label: 'Settings', icon: Settings, path: '/admin/settings' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0 overflow-y-auto no-scrollbar">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">BazarBD</h1>
              <p className="text-xs text-muted-foreground">Admin Portal</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {adminPages.map((page) => {
            const Icon = page.icon;
            const isActive = window.location.pathname === page.path;
            return (
              <Link
                key={page.path}
                to={page.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-slate-800 hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {page.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-800">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={() => { supabase.auth.signOut(); }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur border-b border-slate-800 px-6 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {adminPages.find(p => p.path === window.location.pathname)?.label || 'Dashboard'}
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <a href="https://bazarbd.onrender.com" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              View Marketplace →
            </a>
          </div>
        </div>

        {/* Content area */}
        <div className="p-6">
          {/* Dashboard overview */}
          {window.location.pathname === '/admin' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Dashboard Overview</h1>
                <p className="text-muted-foreground text-sm mt-1">Welcome to the BazarBD admin portal</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {loadingStats ? (
                  [...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
                ) : (
                  <>
                    <Card className="bg-slate-900 border-slate-800">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                            <Users className="h-6 w-6 text-blue-500" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-foreground">{stats?.totalUsers ?? 0}</p>
                            <p className="text-sm text-muted-foreground">Total Users</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-900 border-slate-800">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
                            <FileCheck className="h-6 w-6 text-amber-500" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-foreground">{stats?.pendingAds ?? 0}</p>
                            <p className="text-sm text-muted-foreground">Pending Ads</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-900 border-slate-800">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
                            <FileText className="h-6 w-6 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-foreground">{stats?.approvedAds ?? 0}</p>
                            <p className="text-sm text-muted-foreground">Approved Ads</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-900 border-slate-800">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/10">
                            <Flag className="h-6 w-6 text-red-500" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-foreground">{stats?.pendingReports ?? 0}</p>
                            <p className="text-sm text-muted-foreground">Pending Reports</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {adminPages.slice(1, 9).map((page) => {
                      const Icon = page.icon;
                      return (
                        <Link
                          key={page.path}
                          to={page.path}
                          className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-800 hover:border-primary/50 hover:bg-slate-800/50 transition-colors"
                        >
                          <Icon className="h-6 w-6 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground text-center">{page.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* For other admin pages, render the route content */}
          {window.location.pathname !== '/admin' && (
            <div className="text-center py-20">
              <p className="text-muted-foreground">Loading {adminPages.find(p => p.path === window.location.pathname)?.label || 'page'}...</p>
              <p className="text-xs text-muted-foreground mt-2">
                <Link to={window.location.pathname} className="text-primary hover:underline">
                  Click here if page doesn't load
                </Link>
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
