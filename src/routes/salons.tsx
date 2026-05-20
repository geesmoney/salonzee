import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { SalonCard } from "@/components/salon-card";
import { GHANA_CITIES, SALON_TYPE_LABELS } from "@/lib/ghana";

const salonsListQuery = (filters: { city: string; type: string; search: string }) =>
  queryOptions({
    queryKey: ["salons", filters.city, filters.type, filters.search],
    queryFn: async () => {
      let q = supabase
        .from("salons")
        .select("id, name, slug, location_city, location_area, salon_type, profile_photo_url, description")
        .eq("status", "active")
        .order("name");
      if (filters.city) q = q.eq("location_city", filters.city);
      if (filters.type) q = q.eq("salon_type", filters.type as "male" | "female" | "unisex");
      const term = filters.search.trim().replace(/[%,()]/g, "");
      if (term) {
        const like = `%${term}%`;
        q = q.or(`name.ilike.${like},location_area.ilike.${like}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

export const Route = createFileRoute("/salons")({
  head: () => ({
    meta: [
      { title: "Discover salons — Salonzee" },
      { name: "description", content: "Browse and filter salons across Ghana. Hair, braids, barbering, nails, and beauty." },
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(salonsListQuery({ city: "", type: "", search: "" })),
  component: SalonsPage,
});

function SalonsPage() {
  const [city, setCity] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  const { data: salons = [], isLoading, isFetching } = useQuery({
    ...salonsListQuery({ city, type, search }),
    placeholderData: (prev) => prev,
  });


  const hasFilters = Boolean(city || type || search.trim());

  return (
    <div className="min-h-dvh bg-background">
      <SiteNav />

      {/* Page header */}
      <header className="px-6 md:px-10 pt-14 pb-10 max-w-7xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">The Directory</p>
        <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight mb-3 max-w-3xl">
          Hand-picked salons across Ghana.
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Already know the salon you want? Search by name. Or browse vetted partners by city, neighbourhood, and service.
        </p>
      </header>

      <section className="px-6 md:px-10 pb-24 max-w-7xl mx-auto">
        {/* Filter bar */}
        <div className="bg-card border border-border rounded-2xl p-4 md:p-5 flex flex-wrap gap-3 items-center mb-10 shadow-sm">
          <div className="flex flex-col gap-1 flex-[2] min-w-[240px]">
            <label htmlFor="search" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Search</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                id="search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by salon name or neighbourhood"
                className="w-full bg-background border border-border h-10 pl-9 pr-3 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
            <label htmlFor="city" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">City</label>
            <select
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="bg-background border border-border h-10 px-3 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All cities</option>
              {GHANA_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
            <label htmlFor="type" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Salon type</label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="bg-background border border-border h-10 px-3 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All types</option>
              {Object.entries(SALON_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          {hasFilters && (
            <button
              onClick={() => { setCity(""); setType(""); setSearch(""); }}
              className="self-end h-10 px-4 rounded-full text-sm font-semibold text-primary hover:bg-secondary transition-colors"
            >
              Clear filters
            </button>
          )}
          <div className="self-end ml-auto text-sm text-muted-foreground">
            {isFetching ? "Updating…" : `${salons.length} ${salons.length === 1 ? "salon" : "salons"}`}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/5] bg-muted rounded-2xl mb-4" />
                <div className="h-5 bg-muted rounded w-2/3 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : salons.length === 0 ? (
          <div className="py-20 text-center bg-card border border-border rounded-2xl">
            <p className="font-display text-2xl font-semibold mb-2">No salons match those filters yet.</p>
            <p className="text-muted-foreground mb-6">Try clearing the filters or check back as more partners join.</p>
            <button
              onClick={() => { setCity(""); setType(""); setSearch(""); }}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-sm font-semibold"
            >
              Show all salons
            </button>
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
