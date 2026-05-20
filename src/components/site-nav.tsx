import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import logo from "@/assets/salonzee-logo.png";

export function SiteNav() {
  const { user, isPlatformAdmin, signOut } = useAuth();
  const router = useRouter();

  return (
    <nav className="flex items-center justify-between px-6 md:px-8 lg:px-10 py-2 border-b border-border bg-background/90 backdrop-blur sticky top-0 z-40">
      <Link to="/" className="flex items-center -my-2 mr-4 md:mr-6 lg:mr-8" aria-label="Salonzee home">
        <img src={logo} alt="Salonzee" className="h-14 md:h-16 w-auto" />
      </Link>
      <div className="hidden md:flex gap-1 text-sm font-medium">
        <NavLink to="/salons">Discover</NavLink>
        <NavLink to="/register-salon">For business</NavLink>
        {!user && <NavLink to="/login">Sign in</NavLink>}
        {user && <NavLink to="/salon/dashboard">Dashboard</NavLink>}
        {user && isPlatformAdmin && <NavLink to="/admin/pending">Admin</NavLink>}
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        {user ? (
          <button
            onClick={async () => {
              await signOut();
              router.navigate({ to: "/" });
            }}
            className="text-sm font-medium text-foreground/70 hover:text-foreground px-4 py-2 rounded-full hover:bg-muted transition-colors"
          >
            Sign out
          </button>
        ) : (
          <Link
            to="/salons"
            className="bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
          >
            Book now
          </Link>
        )}
      </div>
    </nav>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="px-4 py-2 rounded-full text-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
      activeProps={{ className: "px-4 py-2 rounded-full text-foreground bg-muted" }}
    >
      {children}
    </Link>
  );
}
