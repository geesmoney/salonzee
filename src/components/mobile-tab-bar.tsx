import { Link, useLocation } from "@tanstack/react-router";
import { Home, Search, LayoutDashboard, LifeBuoy, LogIn, Inbox, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

type Item = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match: (path: string) => boolean;
};

export function MobileTabBar() {
  const { user, isPlatformAdmin } = useAuth();
  const { pathname } = useLocation();

  const items: Item[] = isPlatformAdmin
    ? [
        { to: "/", label: "Home", icon: Home, match: (p) => p === "/" },
        { to: "/salons", label: "Discover", icon: Search, match: (p) => p.startsWith("/salons") },
        { to: "/admin/pending", label: "Review", icon: ShieldCheck, match: (p) => p.startsWith("/admin/pending") },
        { to: "/admin/support", label: "Inbox", icon: Inbox, match: (p) => p.startsWith("/admin/support") },
      ]
    : user
    ? [
        { to: "/", label: "Home", icon: Home, match: (p) => p === "/" },
        { to: "/salons", label: "Discover", icon: Search, match: (p) => p.startsWith("/salons") },
        { to: "/salon/dashboard", label: "Dashboard", icon: LayoutDashboard, match: (p) => p.startsWith("/salon/dashboard") },
        { to: "/salon/support", label: "Support", icon: LifeBuoy, match: (p) => p.startsWith("/salon/support") },
      ]
    : [
        { to: "/", label: "Home", icon: Home, match: (p) => p === "/" },
        { to: "/salons", label: "Discover", icon: Search, match: (p) => p.startsWith("/salons") },
        { to: "/register-salon", label: "For business", icon: LayoutDashboard, match: (p) => p.startsWith("/register-salon") },
        { to: "/login", label: "Sign in", icon: LogIn, match: (p) => p.startsWith("/login") },
      ];

  // Hide on auth-only entry pages where focus matters
  if (pathname === "/login") return null;

  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-4">
        {items.map((it) => {
          const active = it.match(pathname);
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 min-h-14 text-[11px] font-medium transition-colors ${
                  active ? "text-primary" : "text-foreground/60 hover:text-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
                <span className="leading-none truncate max-w-full px-1">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
