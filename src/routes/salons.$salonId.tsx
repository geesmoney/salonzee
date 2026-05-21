import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { BookingWidget } from "@/components/booking-widget";
import { SalonGallery } from "@/components/salon-gallery";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { formatGhs, SALON_TYPE_LABELS } from "@/lib/ghana";
import type { OperatingHours } from "@/lib/slots";

const salonByIdQuery = (salonId: string) =>
  queryOptions({
    queryKey: ["salon", salonId],
    queryFn: async () => {
      const { data: salon, error } = await supabase
        .from("salons")
        .select("*")
        .eq("id", salonId)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      if (!salon) throw notFound();

      const { data: services } = await supabase
        .from("services")
        .select("id, name, duration_minutes, price_ghs")
        .eq("salon_id", salonId)
        .eq("active", true)
        .order("price_ghs");

      return { salon, services: services ?? [] };
    },
    staleTime: 60_000,
  });

export const Route = createFileRoute("/salons/$salonId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(salonByIdQuery(params.salonId)),
  head: ({ loaderData, params }) => {
    const salon = loaderData?.salon;
    const url = `https://salonzee.lovable.app/salons/${params.salonId}`;
    if (!salon) return { meta: [{ title: "Salon — Salonzee" }] };
    const description =
      salon.description ??
      `Book ${salon.name} in ${salon.location_area}, ${salon.location_city}. Real-time availability and instant SMS confirmation on Salonzee.`;
    const trimmed = description.length > 160 ? `${description.slice(0, 157)}…` : description;
    return {
      meta: [
        { title: `${salon.name} — ${salon.location_area}, ${salon.location_city} | Salonzee` },
        { name: "description", content: trimmed },
        { property: "og:title", content: `${salon.name} — Book on Salonzee` },
        { property: "og:description", content: trimmed },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        ...(salon.profile_photo_url
          ? [
              { property: "og:image", content: salon.profile_photo_url },
              { name: "twitter:image", content: salon.profile_photo_url },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BeautySalon",
            name: salon.name,
            description: salon.description ?? undefined,
            url,
            image: salon.profile_photo_url ?? undefined,
            telephone: salon.phone ?? undefined,
            address: {
              "@type": "PostalAddress",
              addressLocality: salon.location_area,
              addressRegion: salon.location_city,
              addressCountry: "GH",
            },
          }),
        },
      ],
    };
  },
  component: SalonPage,
});

function SalonPage() {
  const { salonId } = Route.useParams();
  const [bookingOpen, setBookingOpen] = useState(false);

  const { data } = useSuspenseQuery(salonByIdQuery(salonId));
  if (!data) return null;

  const { salon, services } = data;
  const cheapest = services.length
    ? services.reduce((min, s) => (Number(s.price_ghs) < Number(min.price_ghs) ? s : min))
    : null;

  return (
    <div className="min-h-dvh bg-background">
      <SiteNav />
      <section className="px-5 sm:px-6 md:px-10 pt-8 pb-32 md:py-16 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Info */}
          <div className="lg:col-span-7">
            <div className="mb-8">
              <span className="bg-secondary text-accent text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-4 inline-block">
                {SALON_TYPE_LABELS[salon.salon_type]} • {salon.location_area}, {salon.location_city}
              </span>
              <h1 className="font-serif text-[2.25rem] sm:text-5xl md:text-6xl leading-[1.05] mb-4">{salon.name}</h1>
              {salon.description && (
                <p className="text-foreground/70 leading-relaxed max-w-xl italic">"{salon.description}"</p>
              )}
            </div>

            <SalonGallery salonId={salon.id} salonName={salon.name} fallbackUrl={salon.profile_photo_url} />

            <div className="space-y-3">
              <h2 className="font-bold text-xs uppercase tracking-[0.2em] mb-4 text-foreground/40">Services</h2>
              {services.length === 0 ? (
                <p className="text-foreground/50 italic">No services published yet.</p>
              ) : (
                services.map((s) => (
                  <div
                    key={s.id}
                    className="flex justify-between items-center gap-4 p-4 sm:p-6 bg-card border border-foreground/5 rounded-xl"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{s.name}</p>
                      <p className="text-xs text-foreground/50">{s.duration_minutes} mins</p>
                    </div>
                    <p className="font-serif text-lg sm:text-xl text-accent shrink-0">{formatGhs(s.price_ghs)}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Booking widget — desktop only */}
          <div className="hidden lg:block lg:col-span-5">
            <BookingWidget
              salonId={salon.id}
              services={services}
              operatingHours={salon.operating_hours as OperatingHours}
              slotDuration={salon.slot_duration_minutes}
            />
          </div>
        </div>
      </section>

      {/* Mobile sticky booking bar */}
      {services.length > 0 && (
        <div className="lg:hidden fixed bottom-16 inset-x-0 z-30 px-3 pb-2">
          <div className="mx-auto max-w-md bg-card border border-border shadow-2xl rounded-2xl p-3 flex items-center gap-3 backdrop-blur">
            <div className="flex-1 min-w-0 pl-1">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">From</p>
              <p className="font-display font-bold text-base truncate">
                {cheapest ? formatGhs(cheapest.price_ghs) : "Book now"}
              </p>
            </div>
            <button
              onClick={() => setBookingOpen(true)}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold text-sm px-5 h-12 rounded-full shadow-sm active:scale-[0.98] transition-transform"
            >
              <CalendarCheck className="h-4 w-4" />
              Book a slot
            </button>
          </div>
        </div>
      )}

      <Drawer open={bookingOpen} onOpenChange={setBookingOpen}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader className="text-left pb-2">
            <DrawerTitle className="font-display text-xl">Book {salon.name}</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <BookingWidget
              variant="plain"
              salonId={salon.id}
              services={services}
              operatingHours={salon.operating_hours as OperatingHours}
              slotDuration={salon.slot_duration_minutes}
            />
          </div>
        </DrawerContent>
      </Drawer>

      <div className="hidden md:block">
        <SiteFooter />
      </div>
    </div>
  );
}
