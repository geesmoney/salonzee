import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { BookingWidget } from "@/components/booking-widget";
import { formatGhs, SALON_TYPE_LABELS } from "@/lib/ghana";
import type { OperatingHours } from "@/lib/slots";

const salonBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["salon-slug", slug],
    queryFn: async () => {
      // Fetch salon first (need its id), then services in parallel-friendly shape.
      const { data: salon, error } = await supabase
        .from("salons")
        .select("*")
        .eq("slug", slug)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      if (!salon) throw notFound();

      const { data: services, error: svcErr } = await supabase
        .from("services")
        .select("id, name, duration_minutes, price_ghs")
        .eq("salon_id", salon.id)
        .eq("active", true)
        .order("price_ghs");
      if (svcErr) throw svcErr;

      return { salon, services: services ?? [] };
    },
    staleTime: 60_000,
  });

export const Route = createFileRoute("/$slug")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(salonBySlugQuery(params.slug)),
  head: ({ loaderData }) => ({
    meta: loaderData?.salon
      ? [
          { title: `${loaderData.salon.name} — Salonzee` },
          { name: "description", content: loaderData.salon.description ?? `Book ${loaderData.salon.name} in ${loaderData.salon.location_area}, ${loaderData.salon.location_city}.` },
          ...(loaderData.salon.profile_photo_url ? [{ property: "og:image", content: loaderData.salon.profile_photo_url }] : []),
        ]
      : [{ title: "Salon — Salonzee" }],
  }),
  notFoundComponent: () => (
    <div className="min-h-dvh bg-background">
      <SiteNav />
      <div className="px-6 py-20 max-w-7xl mx-auto">
        <h1 className="font-serif text-4xl mb-2">Salon not found</h1>
        <p className="text-foreground/60">This link doesn't match any active salon.</p>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-dvh bg-background">
      <SiteNav />
      <div className="px-6 py-20 max-w-7xl mx-auto">
        <h1 className="font-serif text-4xl mb-2">Something went wrong</h1>
        <p className="text-foreground/60">{error.message}</p>
      </div>
    </div>
  ),
  component: SalonBySlug,
});

function SalonBySlug() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(salonBySlugQuery(slug));
  const { salon, services } = data;

  return (
    <div className="min-h-dvh bg-background">
      <SiteNav />
      <section className="px-6 md:px-10 py-16 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7">
            <div className="mb-10">
              <span className="bg-secondary text-accent text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-4 inline-block">
                {SALON_TYPE_LABELS[salon.salon_type]} • {salon.location_area}, {salon.location_city}
              </span>
              <h1 className="font-serif text-5xl md:text-6xl mb-4">{salon.name}</h1>
              {salon.description && (
                <p className="text-foreground/70 leading-relaxed max-w-xl italic">"{salon.description}"</p>
              )}
            </div>

            {salon.profile_photo_url && (
              <div className="mb-10 aspect-[16/10] rounded-3xl overflow-hidden ring-1 ring-foreground/5">
                <img
                  src={salon.profile_photo_url}
                  alt={salon.name}
                  className="w-full h-full object-cover"
                  fetchPriority="high"
                  decoding="async"
                />
              </div>
            )}

            <div className="space-y-4">
              <h2 className="font-bold text-xs uppercase tracking-[0.2em] mb-6 text-foreground/40">Services</h2>
              {services.length === 0 ? (
                <p className="text-foreground/50 italic">No services published yet.</p>
              ) : (
                services.map((s) => (
                  <div
                    key={s.id}
                    className="flex justify-between items-center p-6 bg-card border border-foreground/5 rounded-xl"
                  >
                    <div>
                      <p className="font-medium text-foreground">{s.name}</p>
                      <p className="text-xs text-foreground/50">{s.duration_minutes} mins</p>
                    </div>
                    <p className="font-serif text-xl text-accent">{formatGhs(s.price_ghs)}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-5">
            <BookingWidget
              salonId={salon.id}
              services={services}
              operatingHours={salon.operating_hours as OperatingHours}
              slotDuration={salon.slot_duration_minutes}
            />
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
