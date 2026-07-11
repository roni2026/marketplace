import { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutDashboard, TrendingUp, BarChart3, Package, FileText, FolderTree,
  Star, Boxes, ShoppingCart, CreditCard, Banknote, Percent, RotateCcw,
  Ticket, Tag, Users, Store, ShieldCheck, Key, AlertTriangle,
  MessageSquare, LifeBuoy, Flag, Layout, Image, Search, Newspaper,
  Mail, Bell, Settings, Shield, Zap, Wrench, Activity, Terminal,
  FileCheck, HardDrive, Code, Home, LogOut, Menu, ChevronLeft,
  ChevronRight, X, Database, Globe, Receipt, Wallet, Gift, Crown,
  Building2, UserCheck, FileClock, Truck, PercentSquare, Plug,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
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
      { title: 'Reports', href: '/admin/reporting', icon: BarChart3 },
    ],
  },
  {
    label: 'Marketplace',
    items: [
      { title: 'Products', href: '/admin/products', icon: Package },
      { title: 'Listing Management', href: '/admin/listing-management', icon: FolderTree },
      { title: 'Listing Analytics', href: '/admin/listing-analytics', icon: BarChart3 },
      { title: 'Search & Discovery', href: '/admin/search-analytics', icon: Search },
      { title: 'Ad Moderation', href: '/admin/ads', icon: FileText },
      { title: 'Categories', href: '/admin/categories', icon: FolderTree },
      { title: 'Reviews', href: '/admin/reviews', icon: Star },
      { title: 'Inventory', href: '/admin/inventory', icon: Boxes },
    ],
  },
  {
    label: 'Orders & Finance',
    items: [
      { title: 'Orders', href: '/admin/orders', icon: ShoppingCart },
      { title: 'Transactions', href: '/admin/transactions', icon: CreditCard },
      { title: 'Payouts', href: '/admin/payouts', icon: Banknote },
      { title: 'Commissions', href: '/admin/commissions', icon: Percent },
      { title: 'Refunds', href: '/admin/refunds', icon: RotateCcw },
      { title: 'Coupons', href: '/admin/coupons', icon: Ticket },
      { title: 'Promotions', href: '/admin/promotions', icon: Tag },
    ],
  },
  {
    label: 'Users',
    items: [
      { title: 'Customers', href: '/admin/customers', icon: Users },
      { title: 'Sellers', href: '/admin/sellers', icon: Store },
      { title: 'Shops', href: '/admin/shops', icon: Store },
      { title: 'Shop Verifications', href: '/admin/shop-verifications', icon: ShieldCheck },
      { title: 'Vendor Verification', href: '/admin/trust', icon: ShieldCheck },
      { title: 'User Management', href: '/admin/users', icon: UserCheck },
      { title: 'Permissions', href: '/admin/permissions', icon: Key },
      { title: 'Fraud Detection', href: '/admin/fraud', icon: AlertTriangle },
    ],
  },
  {
    label: 'Communication',
    items: [
      { title: 'Messages', href: '/admin/messages', icon: MessageSquare },
      { title: 'Support Tickets', href: '/admin/support', icon: LifeBuoy },
      { title: 'Reports & Disputes', href: '/admin/reports', icon: Flag },
    ],
  },
  {
    label: 'Content',
    items: [
      { title: 'CMS', href: '/admin/cms', icon: Layout },
      { title: 'Media Library', href: '/admin/media', icon: Image },
      { title: 'SEO', href: '/admin/seo', icon: Search },
      { title: 'Blog', href: '/admin/blog', icon: Newspaper },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { title: 'Campaigns', href: '/admin/campaigns', icon: Mail },
      { title: 'Push Notifications', href: '/admin/push', icon: Bell },
    ],
  },
  {
    label: 'System',
    items: [
      { title: 'Settings', href: '/admin/settings', icon: Settings },
      { title: 'Audit Logs', href: '/admin/audit', icon: Shield },
      { title: 'Workflow Automation', href: '/admin/workflow', icon: Zap },
      { title: 'Admin Tools', href: '/admin/tools', icon: Wrench },
      { title: 'System Monitoring', href: '/admin/monitoring', icon: Activity },
      { title: 'API Logs', href: '/admin/api-logs', icon: Terminal },
      { title: 'Compliance', href: '/admin/compliance', icon: FileCheck },
      { title: 'Backup & Recovery', href: '/admin/backup', icon: HardDrive },
      { title: 'Developer', href: '/admin/developer', icon: Code },
    ],
  },
];

function SidebarContent({
  collapsed,
  onNavigate,
  searchQuery,
  setSearchQuery,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}) {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const filteredSections = useMemo(() => {
    if (!searchQuery) return navSections;
    const q = searchQuery.toLowerCase();
    return navSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          item.title.toLowerCase().includes(q)
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [searchQuery]);

  return (
    <div className="flex h-full flex-col">
      {/* Logo / Brand */}
      <div className={`flex items-center gap-2 px-4 h-16 border-b shrink-0 ${collapsed ? 'justify-center' : ''}`}>
        <Link to="/admin" onClick={onNavigate} className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
            B
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold leading-tight">BazarBD</span>
              <span className="text-[10px] text-muted-foreground leading-tight">Admin Console</span>
            </div>
          )}
        </Link>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 py-2 border-b shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search menu..."
              className="h-8 pl-8 text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Nav Items */}
      <ScrollArea className="flex-1">
        <nav className="px-2 py-3 space-y-4">
          {filteredSections.length === 0 && !collapsed && (
            <p className="text-xs text-muted-foreground text-center py-4">No results found</p>
          )}
          {filteredSections.map((section) => (
            <div key={section.label}>
              {!collapsed && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                  {section.label}
                </p>
              )}
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
                      title={collapsed ? item.title : undefined}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all ${
                        collapsed ? 'justify-center' : ''
                      } ${
                        isActive
                          ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.title}</span>}
                      {!collapsed && item.badge && (
                        <Badge variant="destructive" className="ml-auto h-4 px-1 text-[10px]">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* User Profile & Actions */}
      <div className="border-t shrink-0 p-3 space-y-2">
        {!collapsed && user?.email && (
          <div className="px-2 pb-1">
            <p className="text-[10px] text-muted-foreground">Signed in as</p>
            <p className="text-xs font-medium truncate" title={user.email}>
              {user.email}
            </p>
          </div>
        )}
        <Link to="/" onClick={onNavigate} title={collapsed ? 'Back to Site' : undefined}>
          <Button variant="ghost" size="sm" className={`w-full ${collapsed ? 'px-0' : 'justify-start gap-3'}`}>
            <Home className="h-4 w-4 shrink-0" />
            {!collapsed && 'Back to Site'}
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className={`w-full text-destructive hover:text-destructive ${collapsed ? 'px-0' : 'justify-start gap-3'}`}
          onClick={() => {
            onNavigate?.();
            signOut();
          }}
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && 'Sign Out'}
        </Button>
      </div>
    </div>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Desktop sidebar */}
        <aside
          className={`hidden md:flex flex-col bg-card border-r sticky top-0 h-screen transition-all duration-200 ${
            collapsed ? 'w-16' : 'w-60'
          }`}
        >
          <SidebarContent
            collapsed={collapsed}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        </aside>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex absolute top-20 z-40 items-center justify-center h-6 w-6 rounded-full bg-card border shadow-sm hover:bg-accent transition-colors"
          style={{ left: collapsed ? '52px' : '236px' }}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Main column */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Mobile top bar */}
          <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b bg-card px-4 h-14">
            <div className="flex items-center gap-2">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Open menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                  <SidebarContent
                    collapsed={false}
                    onNavigate={() => setMobileOpen(false)}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                  />
                </SheetContent>
              </Sheet>
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
                  B
                </div>
                <span className="text-sm font-bold">BazarBD Admin</span>
              </div>
            </div>
            <ThemeToggle />
          </header>

          {/* Desktop top bar */}
          <header className="hidden md:flex items-center justify-between px-6 h-14 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-20">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Admin Console</span>
              <span>/</span>
              <span>Dashboard</span>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                  A
                </div>
                <span className="text-sm font-medium">Admin</span>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 md:p-6 overflow-x-hidden">{children}</main>
        </div>
      </div>
    </div>
  );
}
