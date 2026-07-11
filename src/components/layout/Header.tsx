import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, User, Heart, Menu, X, LogOut, Settings, Bell, MessageCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useMessages } from '@/hooks/useMessages';
import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface HeaderProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSearch?: () => void;
}

export function Header({ searchQuery = '', onSearchChange, onSearch }: HeaderProps) {
  const { user, isAdmin, signOut } = useAuth();
  const { unreadCount: unreadNotifications } = useNotifications();
  const { unreadCount: unreadMessages } = useMessages();
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.();
  };

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      <Link 
        to="/" 
        className="text-foreground/80 hover:text-primary transition-colors"
        onClick={() => mobile && setIsOpen(false)}
      >
        {t('nav.home')}
      </Link>
      <Link 
        to="/categories" 
        className="text-foreground/80 hover:text-primary transition-colors"
        onClick={() => mobile && setIsOpen(false)}
      >
        {t('nav.categories')}
      </Link>
      {user && (
        <Link 
          to="/favorites" 
          className="text-foreground/80 hover:text-primary transition-colors flex items-center gap-1"
          onClick={() => mobile && setIsOpen(false)}
        >
          <Heart className="h-4 w-4" />
          {t('nav.favorites')}
        </Link>
      )}
      {isAdmin && (
        <Link 
          to="/admin" 
          className="text-foreground/80 hover:text-primary transition-colors flex items-center gap-1"
          onClick={() => mobile && setIsOpen(false)}
        >
          <Settings className="h-4 w-4" />
          {t('nav.admin')}
        </Link>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img
              src="/brand/logo-light.png"
              alt="BazarBD"
              className="h-8 w-auto dark:hidden"
            />
            <img
              src="/brand/logo-dark.png"
              alt="BazarBD"
              className="h-8 w-auto hidden dark:block"
            />
          </Link>

          {/* Search Bar - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl">
            <div className="relative w-full">
              <Input
                type="text"
                placeholder={t('search.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="pr-10"
              />
              <Button 
                type="submit" 
                size="icon" 
                variant="ghost" 
                className="absolute right-0 top-0 h-full"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </form>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            <NavLinks />
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <LanguageSwitcher />

            {/* Notification Bell */}
            {user && (
              <Link to="/notifications" className="relative">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold min-w-[16px] h-[16px] flex items-center justify-center rounded-full px-1">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  )}
                </Button>
              </Link>
            )}

            {/* Messages Icon */}
            {user && (
              <Link to="/messages" className="relative">
                <Button variant="ghost" size="icon" className="relative">
                  <MessageCircle className="h-5 w-5" />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold min-w-[16px] h-[16px] flex items-center justify-center rounded-full px-1">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </Button>
              </Link>
            )}

            {user ? (
              <>
                <Link to="/post-ad">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('nav.postAd')}</span>
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <User className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {t('nav.profile')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/my-ads" className="flex items-center gap-2">
                        {t('nav.myAds')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/saved-searches" className="flex items-center gap-2">
                        {t('nav.savedSearches')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/messages" className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" />
                        {t('nav.messages')}
                        {unreadMessages > 0 && (
                          <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
                            {unreadMessages}
                          </Badge>
                        )}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="flex items-center gap-2 text-destructive">
                      <LogOut className="h-4 w-4" />
                      {t('nav.logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link to="/auth">
                <Button variant="outline" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('nav.login')}</span>
                </Button>
              </Link>
            )}

            {/* Mobile Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="flex flex-col gap-6 mt-8">
                  <form onSubmit={handleSearch} className="relative">
                    <Input
                      type="text"
                      placeholder={t('search.searchMobile')}
                      value={searchQuery}
                      onChange={(e) => onSearchChange?.(e.target.value)}
                      className="pr-10"
                    />
                    <Button 
                      type="submit" 
                      size="icon" 
                      variant="ghost" 
                      className="absolute right-0 top-0 h-full"
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </form>
                  <nav className="flex flex-col gap-4">
                    <NavLinks mobile />
                  </nav>
                  {user && (
                    <nav className="flex flex-col gap-4 border-t border-border pt-4">
                      <Link 
                        to="/notifications" 
                        className="text-foreground/80 hover:text-primary transition-colors flex items-center gap-2"
                        onClick={() => setIsOpen(false)}
                      >
                        <Bell className="h-4 w-4" />
                        {t('nav.notifications')}
                        {unreadNotifications > 0 && (
                          <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5">
                            {unreadNotifications}
                          </Badge>
                        )}
                      </Link>
                      <Link 
                        to="/messages" 
                        className="text-foreground/80 hover:text-primary transition-colors flex items-center gap-2"
                        onClick={() => setIsOpen(false)}
                      >
                        <MessageCircle className="h-4 w-4" />
                        {t('nav.messages')}
                        {unreadMessages > 0 && (
                          <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5">
                            {unreadMessages}
                          </Badge>
                        )}
                      </Link>
                      <Link 
                        to="/saved-searches" 
                        className="text-foreground/80 hover:text-primary transition-colors"
                        onClick={() => setIsOpen(false)}
                      >
                        {t('nav.savedSearches')}
                      </Link>
                    </nav>
                  )}
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <span className="text-sm text-foreground/80">{t('common.theme')}</span>
                    <ThemeToggle />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
