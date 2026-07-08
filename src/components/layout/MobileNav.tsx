import { NavLink } from "@/components/NavLink";
import { Home, Grid3x3, PlusCircle, Heart, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

/**
 * App-like bottom tab bar shown on small screens (including the Capacitor
 * Android build). Hidden on lg+ where the desktop header nav takes over.
 */
export function MobileNav() {
  const { user } = useAuth();

  const items = [
    { to: "/", label: "Home", icon: Home, end: true },
    { to: "/categories", label: "Categories", icon: Grid3x3 },
    { to: "/post-ad", label: "Sell", icon: PlusCircle, primary: true },
    { to: "/favorites", label: "Saved", icon: Heart },
    { to: user ? "/profile" : "/auth", label: user ? "Profile" : "Login", icon: User },
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
            className="flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground transition-colors"
            activeClassName="!text-primary"
          >
            <span
              className={cn(
                "flex items-center justify-center rounded-full transition-colors",
                item.primary ? "h-9 w-9 -mt-4 bg-primary text-primary-foreground shadow-lg" : "h-6 w-6"
              )}
            >
              <item.icon className={cn(item.primary ? "h-5 w-5" : "h-5 w-5")} />
            </span>
            {!item.primary && <span>{item.label}</span>}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
