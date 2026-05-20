import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

export function SiteNav() {
  const { user, isPlatformAdmin, signOut } = useAuth();
  const router = useRouter();

  return (
    <nav className="flex items-center justify-between px-6 md:px-10 py-5 border-b border-foreground/5 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
      <Link to="/" className="font-serif text-2xl font-bold tracking-tight text-foreground">
        SALONZEE
      </Link>
      <div className="hidden md:flex gap-8 text-xs font-medium uppercase tracking-[0.18em]">
        <Link to="/salons" className="hover:text-accent transition-colors">Discover</Link>
        <Link to="/register-salon" className="hover:text-accent transition-colors">For Business</Link>
        {!user && (
          <Link to="/login" className="hover:text-accent transition-colors">Login</Link>
        )}
        {user && isPlatformAdmin && (
          <Link to="/admin/pending" className="hover:text-accent transition-colors">Admin</Link>
        )}
        {user && !isPlatformAdmin && (
          <Link to="/salon/dashboard" className="hover:text-accent transition-colors">Dashboard</Link>
        )}
      </div>
      <div className="flex items-center gap-3">
        {user ? (
          <button
            onClick={async () => {
              await signOut();
              router.navigate({ to: "/" });
            }}
            className="text-xs font-bold uppercase tracking-[0.2em] text-foreground/60 hover:text-foreground"
          >
            Sign out
          </button>
        ) : (
          <Link
            to="/salons"
            className="bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-clay transition-colors"
          >
            Book Now
          </Link>
        )}
      </div>
    </nav>
  );
}
