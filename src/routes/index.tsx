import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { SalonCard } from "@/components/salon-card";
import logo from "@/assets/salonzee-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Salonzee — Book Ghana's best salons" },
      { name: "description", content: "Discover and book the finest salons in Accra, Kumasi, and beyond. Simple, instant booking." },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: salons = [] } = useQuery({
    queryKey: ["featured-salons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salons")
        .select("id, name, location_city, location_area, salon_type, profile_photo_url, description")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      {/* Hero */}
      <section className="px-6 md:px-10 pt-20 pb-24 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-secondary text-primary px-4 py-1.5 rounded-full text-xs font-semibold mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Now booking across Ghana
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl mx-auto">
          Book your next salon visit in seconds.
        </h1>
        <p className="text-lg md:text-xl text-foreground/60 max-w-2xl mx-auto mb-10">
          Discover trusted salons in Accra, Kumasi and beyond. Browse services, pick a time, confirm — done.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/salons"
            className="bg-primary text-primary-foreground px-7 py-3.5 rounded-full text-base font-semibold shadow-sm hover:shadow-md transition-shadow"
          >
            Find a salon
          </Link>
          <Link
            to="/register-salon"
            className="bg-card border border-border px-7 py-3.5 rounded-full text-base font-semibold hover:bg-muted transition-colors"
          >
            List your salon
          </Link>
        </div>

        {/* Trust strip */}
        <div className="mt-16 flex items-center justify-center gap-8 text-sm text-foreground/50">
          <Stat n={`${salons.length}+`} label="Vetted salons" />
          <span className="w-px h-8 bg-border" />
          <Stat n="< 30s" label="To book" />
          <span className="hidden sm:block w-px h-8 bg-border" />
          <Stat n="Free" label="For customers" className="hidden sm:flex" />
        </div>
      </section>

      {/* Featured */}
      <section className="px-6 md:px-10 py-20 bg-muted/40 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-1">Featured salons</h2>
              <p className="text-foreground/60">Newly joined partners across Ghana</p>
            </div>
            <Link to="/salons" className="text-sm font-semibold text-primary hover:underline">
              View all →
            </Link>
          </div>

          {salons.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl py-16 text-center">
              <p className="text-foreground/60 mb-4">The directory is opening. First salons coming soon.</p>
              <Link
                to="/register-salon"
                className="inline-block bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-sm font-semibold"
              >
                Be the first to register
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {salons.map((s) => <SalonCard key={s.id} salon={s} />)}
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 md:px-10 py-24 max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-14">How Salonzee works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { n: "01", t: "Discover", d: "Browse vetted salons by city, area, and service type." },
            { n: "02", t: "Book a slot", d: "Pick a service and an open time — no calls, no waiting." },
            { n: "03", t: "Show up", d: "Get an SMS confirmation. The salon is ready for you." },
          ].map((s) => (
            <div key={s.n} className="bg-card border border-border rounded-2xl p-7 hover:shadow-md transition-shadow">
              <p className="text-primary font-bold text-sm mb-3">{s.n}</p>
              <h3 className="text-xl font-bold mb-2">{s.t}</h3>
              <p className="text-foreground/60">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* For business */}
      <section className="px-6 md:px-10 pb-24 max-w-6xl mx-auto">
        <div className="bg-foreground text-background rounded-3xl p-10 md:p-16 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl">
            <img src={logo} alt="" className="h-7 w-auto mb-5 invert brightness-0 opacity-90" />
            <h3 className="text-3xl md:text-4xl font-bold mb-3">Grow your salon with Salonzee.</h3>
            <p className="text-background/70 leading-relaxed">
              Manage bookings, services, and your calendar from one place. Get discovered by clients across Ghana.
            </p>
          </div>
          <Link
            to="/register-salon"
            className="bg-primary text-primary-foreground px-7 py-3.5 rounded-full text-base font-semibold hover:opacity-90 transition-opacity whitespace-nowrap shadow-lg"
          >
            Get started — free
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Stat({ n, label, className = "flex" }: { n: string; label: string; className?: string }) {
  return (
    <div className={`flex-col items-center ${className}`}>
      <p className="font-bold text-foreground text-lg">{n}</p>
      <p className="text-xs uppercase tracking-wide">{label}</p>
    </div>
  );
}
