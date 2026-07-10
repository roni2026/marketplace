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
} from 'lucide-react';

const navItems = [
  { title: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { title: 'Ad Moderation', href: '/admin/ads', icon: FileText },
  { title: 'Categories', href: '/admin/categories', icon: FolderTree },
  { title: 'Users', href: '/admin/users', icon: Users },
  { title: 'Reports', href: '/admin/reports', icon: Flag },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, signOut } = useAuth();
  const location = useLocation();

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-8">
        <Link to="/" className="text-2xl font-bold text-primary" onClick={onNavigate}>
          BazarBD
        </Link>
        <p className="text-sm text-muted-foreground">Admin Panel</p>
      </div>

      <nav className="space-y-1 flex-1">
        {navItems.map((item) => {
          const isActive =
            item.href === '/admin'
              ? location.pathname === '/admin'
              : location.pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      <div className="pt-4 border-t space-y-2">
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
        <aside className="hidden md:flex w-64 min-h-screen bg-card border-r sticky top-0 h-screen">
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
                <SheetContent side="left" className="w-72 p-0">
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
