import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { SalonCard } from "@/components/salon-card";
import { GHANA_CITIES, SALON_TYPE_LABELS } from "@/lib/ghana";

export const Route = createFileRoute("/salons")({
  head: () => ({
    meta: [
      { title: "Discover salons — Salonzee" },
      { name: "description", content: "Browse and filter salons across Ghana. Hair, braids, barbering, nails, and beauty." },
    ],
  }),
  component: SalonsPage,
});

function SalonsPage() {
  const [city, setCity] = useState<string>("");
  const [type, setType] = useState<string>("");

  const { data: salons = [], isLoading } = useQuery({
    queryKey: ["salons", city, type],
    queryFn: async () => {
      let q = supabase
        .from("salons")
        .select("id, name, location_city, location_area, salon_type, profile_photo_url, description")
        .eq("status", "active")
        .order("name");
      if (city) q = q.eq("location_city", city);
      if (type) q = q.eq("salon_type", type as "male" | "female" | "unisex");
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-dvh bg-background">
      <SiteNav />
      <section className="px-6 md:px-10 py-16 max-w-7xl mx-auto">
        <h1 className="font-serif text-5xl md:text-6xl mb-3">Discover Salons</h1>
        <p className="text-foreground/60 mb-10 max-w-xl">
          Hand-picked spaces across Ghana. Find one that suits your style and location.
        </p>

        <div className="flex flex-wrap gap-3 mb-12">
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="bg-card border border-foreground/10 px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-accent"
          >
            <option value="">All cities</option>
            {GHANA_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="bg-card border border-foreground/10 px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-accent"
          >
            <option value="">All types</option>
            {Object.entries(SALON_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {(city || type) && (
            <button
              onClick={() => { setCity(""); setType(""); }}
              className="text-xs font-bold uppercase tracking-[0.2em] text-foreground/50 hover:text-accent"
            >
              Clear
            </button>
          )}
        </div>

        {isLoading ? (
          <p className="text-foreground/50">Loading...</p>
        ) : salons.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-serif text-2xl text-foreground/40 italic">
              No salons match those filters yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {salons.map((s) => <SalonCard key={s.id} salon={s} />)}
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
