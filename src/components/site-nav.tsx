import { Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import logo from "@/assets/salonzee-logo.png";

export function SiteNav() {
  const { user, isPlatformAdmin, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <nav className="flex items-center justify-between px-4 sm:px-6 md:px-8 lg:px-10 py-2 border-b border-border bg-background/90 backdrop-blur sticky top-0 z-40">
      <Link to="/" className="flex items-center -my-2 mr-2 md:mr-6 lg:mr-8" aria-label="Salonzee home">
        <img src={logo} alt="Salonzee" className="h-12 md:h-16 w-auto dark:invert" />
      </Link>

      {/* Desktop nav */}
      <div className="hidden md:flex gap-1 text-sm font-medium">
        <NavLink to="/salons">Discover</NavLink>
        <NavLink to="/register-salon">For business</NavLink>
        {!user && <NavLink to="/login">Sign in</NavLink>}
        {user && <NavLink to="/salon/dashboard">Dashboard</NavLink>}
        {user && <NavLink to="/salon/support">Support</NavLink>}
        {user && isPlatformAdmin && <NavLink to="/admin/pending">Admin</NavLink>}
        {user && isPlatformAdmin && <NavLink to="/admin/support">Inbox</NavLink>}
        {user && isPlatformAdmin && <NavLink to="/admin/revenue">Revenue</NavLink>}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <ThemeToggle />
        {/* Desktop sign-in/out / CTA */}
        <div className="hidden md:block">
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

        {/* Mobile menu trigger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            aria-label="Open menu"
            className="md:hidden inline-flex items-center justify-center h-11 w-11 rounded-full hover:bg-muted text-foreground"
          >
            <Menu className="h-6 w-6" />
          </SheetTrigger>
          <SheetContent side="right" className="w-[88vw] sm:w-96 p-0 flex flex-col">
            <SheetHeader className="px-5 pt-5 pb-3 border-b border-border flex flex-row items-center justify-between">
              <SheetTitle className="font-display text-lg">Menu</SheetTitle>
              <button
                onClick={close}
                aria-label="Close menu"
                className="inline-flex items-center justify-center h-9 w-9 rounded-full hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1 text-base">
              <MobileLink to="/" onSelect={close}>Home</MobileLink>
              <MobileLink to="/salons" onSelect={close}>Discover salons</MobileLink>
              <MobileLink to="/register-salon" onSelect={close}>For business</MobileLink>
              {user && <MobileLink to="/salon/dashboard" onSelect={close}>Dashboard</MobileLink>}
              {user && <MobileLink to="/salon/settings" onSelect={close}>Settings</MobileLink>}
              {user && <MobileLink to="/salon/support" onSelect={close}>Support</MobileLink>}
              {user && isPlatformAdmin && <MobileLink to="/admin/pending" onSelect={close}>Admin · Pending</MobileLink>}
              {user && isPlatformAdmin && <MobileLink to="/admin/support" onSelect={close}>Admin · Inbox</MobileLink>}
              {user && isPlatformAdmin && <MobileLink to="/admin/revenue" onSelect={close}>Admin · Revenue</MobileLink>}
              <MobileLink to="/report-issue" onSelect={close}>Report a booking issue</MobileLink>
            </div>
            <div className="border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {user ? (
                <button
                  onClick={async () => {
                    close();
                    await signOut();
                    router.navigate({ to: "/" });
                  }}
                  className="w-full text-center py-3.5 rounded-full border border-border font-semibold text-sm hover:bg-muted transition-colors"
                >
                  Sign out
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    to="/salons"
                    onClick={close}
                    className="block text-center bg-primary text-primary-foreground py-3.5 rounded-full font-semibold text-sm shadow-sm"
                  >
                    Find a salon
                  </Link>
                  <Link
                    to="/login"
                    onClick={close}
                    className="block text-center border border-border py-3.5 rounded-full font-semibold text-sm hover:bg-muted"
                  >
                    Sign in
                  </Link>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
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

function MobileLink({
  to,
  children,
  onSelect,
}: {
  to: string;
  children: React.ReactNode;
  onSelect: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onSelect}
      className="px-4 py-3.5 rounded-xl text-foreground/80 hover:text-foreground hover:bg-muted font-medium"
      activeProps={{ className: "px-4 py-3.5 rounded-xl bg-muted text-foreground font-semibold" }}
    >
      {children}
    </Link>
  );
}
