import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  FileText,
  FolderTree,
  Users,
  Flag,
  LogOut,
  Home,
  Menu,
  TrendingUp,
  Shield,
  LifeBuoy,
  Settings,
  ShieldCheck,
  AlertTriangle,
  Key,
  Image,
  Star,
  MessageSquare,
  Layout,
  Search,
  Zap,
  Wrench,
  BarChart3,
  Terminal,
  Activity,
  FileCheck,
  Database,
  Code,
  HardDrive,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { title: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      { title: 'Analytics', href: '/admin/analytics', icon: TrendingUp },
      { title: 'Reporting', href: '/admin/reporting', icon: BarChart3 },
    ],
  },
  {
    label: 'Moderation',
    items: [
      { title: 'Ad Moderation', href: '/admin/ads', icon: FileText },
      { title: 'Review Moderation', href: '/admin/reviews', icon: Star },
      { title: 'Message Monitoring', href: '/admin/messages', icon: MessageSquare },
      { title: 'Reports', href: '/admin/reports', icon: Flag },
    ],
  },
  {
    label: 'User Management',
    items: [
      { title: 'Users', href: '/admin/users', icon: Users },
      { title: 'Permissions', href: '/admin/permissions', icon: Key },
      { title: 'Trust Verification', href: '/admin/trust', icon: ShieldCheck },
      { title: 'Fraud Detection', href: '/admin/fraud', icon: AlertTriangle },
    ],
  },
  {
    label: 'Content',
    items: [
      { title: 'Categories', href: '/admin/categories', icon: FolderTree },
      { title: 'CMS', href: '/admin/cms', icon: Layout },
      { title: 'SEO', href: '/admin/seo', icon: Search },
      { title: 'Media Library', href: '/admin/media', icon: Image },
    ],
  },
  {
    label: 'Support',
    items: [
      { title: 'Support Tickets', href: '/admin/support', icon: LifeBuoy },
    ],
  },
  {
    label: 'System',
    items: [
      { title: 'Audit Logs', href: '/admin/audit', icon: Shield },
      { title: 'Workflow Automation', href: '/admin/workflow', icon: Zap },
      { title: 'Admin Tools', href: '/admin/tools', icon: Wrench },
      { title: 'System Monitoring', href: '/admin/monitoring', icon: Activity },
      { title: 'API Logs', href: '/admin/api-logs', icon: Terminal },
      { title: 'Compliance', href: '/admin/compliance', icon: FileCheck },
      { title: 'Backup & Recovery', href: '/admin/backup', icon: HardDrive },
      { title: 'Developer', href: '/admin/developer', icon: Code },
      { title: 'Settings', href: '/admin/settings', icon: Settings },
    ],
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, signOut } = useAuth();
  const location = useLocation();

  return (
    <div className="flex h-full flex-col p-4 overflow-y-auto">
      <div className="mb-6 shrink-0">
        <Link to="/" className="text-2xl font-bold text-primary" onClick={onNavigate}>
          BazarBD
        </Link>
        <p className="text-sm text-muted-foreground">Admin Panel</p>
      </div>

      <nav className="flex-1 space-y-4">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  item.href === '/admin'
                    ? location.pathname === '/admin'
                    : location.pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'hover:bg-accent text-foreground/80'
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.title}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="pt-4 border-t space-y-2 shrink-0">
        {user?.email && (
          <div className="px-3 pb-1">
            <p className="text-xs text-muted-foreground">Signed in as</p>
            <p className="text-sm font-medium truncate" title={user.email}>
              {user.email}
            </p>
          </div>
        )}
        <Link to="/" onClick={onNavigate}>
          <Button variant="ghost" className="w-full justify-start gap-3">
            <Home className="h-5 w-5" />
            Back to Site
          </Button>
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-destructive hover:text-destructive"
          onClick={() => {
            onNavigate?.();
            signOut();
          }}
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-64 min-h-screen bg-card border-r sticky top-0 h-screen overflow-y-auto">
          <SidebarContent />
        </aside>

        {/* Main column */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Mobile top bar */}
          <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b bg-card px-4 py-3">
            <div className="flex items-center gap-2">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Open menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0 overflow-y-auto">
                  <SidebarContent onNavigate={() => setMobileOpen(false)} />
                </SheetContent>
              </Sheet>
              <span className="text-lg font-bold text-primary">BazarBD Admin</span>
            </div>
            <ThemeToggle />
          </header>

          {/* Desktop theme toggle */}
          <div className="hidden md:flex justify-end px-8 pt-4">
            <ThemeToggle />
          </div>

          <main className="flex-1 p-4 sm:p-6 md:px-8 md:pb-8 md:pt-2">{children}</main>
        </div>
      </div>
    </div>
  );
}
