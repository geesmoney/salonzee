import { Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Home, Search, LayoutDashboard, LifeBuoy, Inbox, ShieldCheck, UserRound, CalendarDays } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { accountAreaFor } from "@/lib/customer-account";

type Item = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match: (path: string) => boolean;
};

export function MobileTabBar() {
  const { user, isPlatformAdmin } = useAuth();
  const { pathname } = useLocation();
  const ownsSalon = useQuery({
    queryKey: ["owns-salon", user?.id],
    enabled: !!user && !isPlatformAdmin,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.from("salons").select("id").eq("user_id", user!.id).limit(1);
      return (data?.length ?? 0) > 0;
    },
  }).data === true;

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
        ownsSalon
          ? { to: "/salon/dashboard", label: "Dashboard", icon: LayoutDashboard, match: (p: string) => p.startsWith("/salon/dashboard") }
          : { to: "/account", label: "My bookings", icon: CalendarDays, match: (p: string) => p.startsWith("/account") },
        { to: "/salon/support", label: "Support", icon: LifeBuoy, match: (p) => p.startsWith("/salon/support") },
      ]
    : [
        { to: "/", label: "Home", icon: Home, match: (p) => p === "/" },
        { to: "/salons", label: "Discover", icon: Search, match: (p) => p.startsWith("/salons") },
        { to: "/register-salon", label: "For business", icon: LayoutDashboard, match: (p) => p.startsWith("/register-salon") },
        { to: "/login", label: "Account", icon: UserRound, match: (p) => p.startsWith("/login") || p.startsWith("/account") },
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
                search={!user && it.to === "/login" ? { mode: "signup" } : {}}
                aria-label={!user && it.to === "/login" ? "Create customer account" : undefined}
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
