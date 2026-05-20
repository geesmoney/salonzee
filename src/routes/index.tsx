import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { SalonCard } from "@/components/salon-card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Salonzee — The artistry of African beauty" },
      { name: "description", content: "Discover and book the finest salons in Accra, Kumasi, and beyond. Professional care, curated for Ghana." },
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
      <section className="px-6 md:px-10 py-20 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl leading-[0.9] mb-8">
            The artistry of <span className="italic text-accent">African</span> beauty.
          </h1>
          <p className="text-lg text-foreground/70 mb-10 max-w-md">
            Discover and book the finest salons in Accra, Kumasi, and beyond. Professional care, curated for you.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/salons"
              className="bg-accent text-white px-8 py-4 rounded-xl font-bold uppercase text-xs tracking-[0.2em] hover:brightness-110 transition-all text-center"
            >
              Browse Salons
            </Link>
            <Link
              to="/register-salon"
              className="border border-foreground/10 bg-card px-8 py-4 rounded-xl font-bold uppercase text-xs tracking-[0.2em] hover:border-accent transition-colors text-center"
            >
              Register Your Salon
            </Link>
          </div>
        </div>
        <div className="relative">
          <div className="w-full aspect-[4/5] bg-gradient-to-br from-secondary via-cream to-secondary rounded-3xl ring-1 ring-foreground/5 overflow-hidden grid place-items-center">
            <span className="font-serif text-7xl text-accent/30 italic">Salonzee</span>
          </div>
          <div className="absolute -bottom-6 -left-6 bg-clay p-8 rounded-2xl text-white shadow-2xl">
            <p className="text-3xl font-serif">{salons.length}+</p>
            <p className="text-[10px] uppercase tracking-widest opacity-80">Vetted Salons</p>
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="px-6 md:px-10 py-24 bg-card">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="font-serif text-4xl mb-2">Featured Partners</h2>
              <p className="text-foreground/50 uppercase tracking-widest text-[10px]">Discover Ghana's best</p>
            </div>
            <Link to="/salons" className="text-xs font-bold uppercase tracking-widest border-b border-accent pb-1">
              View All
            </Link>
          </div>

          {salons.length === 0 ? (
            <div className="py-20 text-center">
              <p className="font-serif text-2xl text-foreground/40 italic">
                The directory is opening. First salons coming soon.
              </p>
              <Link
                to="/register-salon"
                className="inline-block mt-6 text-xs font-bold uppercase tracking-[0.2em] border-b border-accent pb-1"
              >
                Be the first to register
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {salons.map((s) => <SalonCard key={s.id} salon={s} />)}
            </div>
          )}
        </div>
      </section>

      {/* For business CTA */}
      <section className="px-6 md:px-10 py-24 max-w-7xl mx-auto">
        <div className="bg-primary text-primary-foreground rounded-3xl p-12 md:p-20 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl">
            <h3 className="font-serif text-4xl md:text-5xl mb-4">Run your salon. Beautifully.</h3>
            <p className="text-primary-foreground/70 leading-relaxed">
              Manage bookings, services, and your calendar from one place. Get found by clients across Ghana.
            </p>
          </div>
          <Link
            to="/register-salon"
            className="bg-accent text-foreground px-10 py-4 rounded-xl font-bold uppercase text-xs tracking-[0.2em] hover:brightness-110 transition-all whitespace-nowrap"
          >
            Register Your Salon
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
