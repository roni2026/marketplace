import { useState, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useAdminNavAccess } from '@/hooks/useAdminNavAccess';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Package, Shield, Store, Flag, CreditCard,
  Wallet, FolderTree, FileText, Megaphone, HeadphonesIcon, BarChart3,
  Lock, ScrollText, ToggleRight, Server, Settings, Database, Search,
  Bell, Menu, ChevronLeft, ChevronRight, X, LogOut, Home, Send,
  ShoppingCart, Tag, Ticket, Percent, RotateCcw, Star, MessageSquare,
  Image, Globe, Zap, Wrench, Activity, Code, HardDrive,
  Building2, UserCheck, FileCheck, Truck, Crown, Gift,
  TrendingUp, AlertTriangle, ShieldCheck, Key, FileSearch, Inbox,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  badge?: number;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: 'Work',
    items: [
      { title: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      { title: 'Moderation inbox', href: '/admin/moderation', icon: Inbox },
      { title: 'Support tickets', href: '/admin/support', icon: HeadphonesIcon },
      { title: 'Global search', href: '/admin/search', icon: Search },
    ],
  },
  {
    label: 'Moderation',
    items: [
      { title: 'Ad queue', href: '/admin/ads', icon: FileCheck },
      { title: 'User reports', href: '/admin/reports', icon: Flag },
      { title: 'Reviews', href: '/admin/reviews', icon: Star },
      { title: 'Messages', href: '/admin/messages', icon: MessageSquare },
      { title: 'Fraud', href: '/admin/fraud', icon: AlertTriangle },
      { title: 'Trust & KYC', href: '/admin/trust', icon: ShieldCheck },
      { title: 'Media library', href: '/admin/media', icon: Image },
    ],
  },
  {
    label: 'People',
    items: [
      { title: 'Users', href: '/admin/users', icon: Users },
      { title: 'Sellers', href: '/admin/sellers', icon: Store },
      { title: 'Shops', href: '/admin/shops', icon: Building2 },
      { title: 'Shop verifications', href: '/admin/shop-verifications', icon: UserCheck },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { title: 'Listings', href: '/admin/listing-management', icon: Package },
      { title: 'Ad search', href: '/admin/ads/search', icon: FileSearch },
      { title: 'Categories', href: '/admin/categories', icon: FolderTree },
      { title: 'Brands', href: '/admin/brands', icon: Tag },
      { title: 'Promotions', href: '/admin/ad-promotions', icon: Megaphone },
      { title: 'Sponsored', href: '/admin/sponsored-listings', icon: Star },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { title: 'Orders', href: '/admin/orders', icon: ShoppingCart },
      { title: 'Payouts', href: '/admin/payouts', icon: Wallet },
      { title: 'Transactions', href: '/admin/transactions', icon: CreditCard },
      { title: 'Coupons', href: '/admin/coupons', icon: Ticket },
      { title: 'Campaigns', href: '/admin/campaigns', icon: Gift },
      { title: 'Revenue', href: '/admin/revenue-analytics', icon: TrendingUp },
    ],
  },
  {
    label: 'Content',
    items: [
      { title: 'CMS', href: '/admin/cms', icon: FileText },
      { title: 'SEO', href: '/admin/seo', icon: Globe },
    ],
  },
  {
    label: 'Insights',
    items: [
      { title: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
      { title: 'Listing analytics', href: '/admin/listing-analytics', icon: Activity },
      { title: 'Search analytics', href: '/admin/search-analytics', icon: Search },
      { title: 'Activity log', href: '/admin/activity-log', icon: ScrollText },
      { title: 'Bulk operations', href: '/admin/bulk-operations', icon: Zap },
    ],
  },
  {
    label: 'System',
    items: [
      { title: 'Health', href: '/admin/system-health', icon: Activity },
      { title: 'Monitoring', href: '/admin/monitoring', icon: Server },
      { title: 'Email queue', href: '/admin/email-queue', icon: Send },
      { title: 'Failed jobs', href: '/admin/failed-jobs', icon: AlertTriangle },
      { title: 'Webhooks', href: '/admin/webhooks', icon: Code },
      { title: 'Feature flags', href: '/admin/feature-flags', icon: ToggleRight },
      { title: 'Permissions', href: '/admin/permissions', icon: Key },
      { title: 'Audit log', href: '/admin/audit', icon: ScrollText },
      { title: 'Settings', href: '/admin/settings', icon: Settings },
      { title: 'More tools', href: '/admin/tools', icon: Wrench },
    ],
  },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { canAccessHref, isSuperAdmin, loading: accessLoading } = useAdminNavAccess();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return navSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (!canAccessHref(item.href)) return false;
          if (!q) return true;
          return item.title.toLowerCase().includes(q);
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [searchQuery, canAccessHref]);

  const isActive = useCallback(
    (href: string) => {
      if (href === '/admin') return location.pathname === '/admin';
      return location.pathname.startsWith(href);
    },
    [location.pathname],
  );

  const currentTitle = useMemo(() => {
    for (const section of navSections) {
      for (const item of section.items) {
        if (isActive(item.href)) return item.title;
      }
    }
    return 'Dashboard';
  }, [isActive]);

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className={cn('flex h-12 items-center border-b border-border px-3', collapsed && 'justify-center')}>
        {!collapsed ? (
          <Link to="/admin" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/10">
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-bold tracking-tight">BazarBD Admin</span>
          </Link>
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/10">
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto hidden md:flex items-center justify-center rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 py-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter navigation..."
              className="h-7 pl-7 pr-3 text-xs"
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="px-2 py-2" aria-label="Admin navigation">
          {filteredSections.map((section) => (
            <div key={section.label} className="mb-2">
              {!collapsed && (
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {section.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        to={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                          active
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                          collapsed && 'justify-center px-2',
                        )}
                        title={collapsed ? item.title : undefined}
                      >
                        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                        {!collapsed && <span className="truncate">{item.title}</span>}
                        {!collapsed && item.badge && (
                          <Badge variant="secondary" className="ml-auto h-4 px-1 text-[9px]">
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-border p-2">
        {!collapsed ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-2 py-1">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                {(user?.email?.[0] || 'A').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium truncate">{user?.email || 'Admin'}</p>
                <p className="text-[9px] text-muted-foreground">{isSuperAdmin ? 'Super admin' : accessLoading ? '…' : 'Limited admin'}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-xs h-7"
              onClick={() => supabase.auth.signOut()}
            >
              <LogOut className="h-3 w-3" />
              Sign Out
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center h-7"
            onClick={() => supabase.auth.signOut()}
            title="Sign Out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <div
        className={cn(
          'hidden md:flex flex-shrink-0 transition-all duration-200 border-r border-border bg-card',
          collapsed ? 'w-14' : 'w-56',
        )}
      >
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Topbar */}
          <header className="flex h-12 flex-shrink-0 items-center justify-between border-b border-border bg-card px-3">
            <div className="flex items-center gap-2">
              <SheetTrigger asChild>
                <button
                  className="md:hidden rounded p-1 text-muted-foreground hover:bg-accent"
                  aria-label="Open menu"
                >
                  <Menu className="h-4 w-4" />
                </button>
              </SheetTrigger>
              <h1 className="text-sm font-semibold tracking-tight">{currentTitle}</h1>
            </div>
            <div className="flex items-center gap-1">
              <Link to="/" className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" title="View Marketplace">
                <Home className="h-3.5 w-3.5" />
              </Link>
              <ThemeToggle />
              <button className="relative rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" title="Notifications">
                <Bell className="h-3.5 w-3.5" />
              </button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[1600px] p-3 md:p-4">{children}</div>
          </main>
        </div>

        <SheetContent side="left" className="w-56 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </div>
  );
}
