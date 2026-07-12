import { NavLink } from "@/components/NavLink";
import { Home, Grid3x3, PlusCircle, Heart, MessageCircle } from "lucide-react";
import { useMessages } from "@/hooks/useMessages";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/**
 * App-like bottom tab bar shown on small screens (including the Capacitor
 * Android build). Hidden on lg+ where the desktop header nav takes over.
 */
export function MobileNav() {
  const { unreadCount: unreadMessages } = useMessages();
  const { t } = useTranslation();

  const items = [
    { to: "/", label: t('nav.home'), icon: Home, end: true },
    { to: "/categories", label: t('nav.categories'), icon: Grid3x3 },
    { to: "/post-ad", label: t('nav.sell'), icon: PlusCircle, primary: true },
    { to: "/favorites", label: t('nav.saved'), icon: Heart },
    { to: "/messages", label: t('nav.messages'), icon: MessageCircle, badge: unreadMessages },
    // Profile intentionally omitted here — it lives in the top header (see Header.tsx)
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur border-t border-border pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <div className="grid grid-cols-5">
        {items.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.end}
            className="flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground transition-colors"
            activeClassName="!text-primary"
          >
            <span
              className={cn(
                "flex items-center justify-center rounded-full transition-colors relative",
                item.primary ? "h-9 w-9 -mt-4 bg-primary text-primary-foreground shadow-lg" : "h-6 w-6"
              )}
            >
              <item.icon className={cn(item.primary ? "h-5 w-5" : "h-5 w-5")} />
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] font-bold min-w-[14px] h-[14px] flex items-center justify-center rounded-full px-0.5">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </span>
            {!item.primary && <span>{item.label}</span>}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
