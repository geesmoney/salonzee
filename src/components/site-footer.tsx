import { Link } from "@tanstack/react-router";
import { InstallAppButton } from "@/components/install-app";

export function SiteFooter() {
  return (
    <footer className="px-6 md:px-10 pt-12 pb-28 sm:pb-12 border-t border-foreground/5 mt-20">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-foreground/30">
          Salonzee © {new Date().getFullYear()} • Accra, Ghana
        </p>
        <div
          id="install-app"
          role="group"
          aria-label="Install Salonzee app"
          tabIndex={-1}
          className="scroll-mt-8 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4"
        >
          <InstallAppButton />
        </div>
        <div className="flex flex-wrap justify-center gap-5 text-xs text-foreground/50">
          <Link to="/blog" className="hover:text-foreground transition-colors">Beauty & business guides</Link>
          <Link to="/register-salon" className="hover:text-foreground transition-colors">
            List your salon
          </Link>
          <Link to="/report-issue" className="hover:text-foreground transition-colors">
            Report a booking issue
          </Link>
        </div>
      </div>
    </footer>
  );
}
