import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="px-6 md:px-10 py-12 border-t border-foreground/5 mt-20">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-foreground/30">
          Salonzee © {new Date().getFullYear()} • Accra, Ghana
        </p>
        <div className="flex gap-5 text-xs text-foreground/50">
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
