export function SiteFooter() {
  return (
    <footer className="px-6 md:px-10 py-12 text-center border-t border-foreground/5 mt-20">
      <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-foreground/30">
        Salonzee © {new Date().getFullYear()} • Accra, Ghana
      </p>
    </footer>
  );
}
