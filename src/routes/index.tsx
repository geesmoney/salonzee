import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { Scissors, Sparkles, Brush, CalendarCheck, Star, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { SalonCard } from "@/components/salon-card";
import { BookingPulse } from "@/components/booking-pulse";
import heroImg from "@/assets/hero-salon.jpg";
import featBarber from "@/assets/feature-barber.jpg";
import featBraids from "@/assets/feature-braids.jpg";
import featNails from "@/assets/feature-nails.jpg";


const featuredSalonsQuery = queryOptions({
  queryKey: ["featured-salons"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("salons")
      .select("id, name, slug, location_city, location_area, salon_type, profile_photo_url, description")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(6);
    if (error) throw error;
    return data;
  },
  staleTime: 5 * 60_000,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Salonzee — Book Ghana's best salons in seconds" },
      { name: "description", content: "Discover and book vetted hair, braid, barber, and nail salons across Accra, Kumasi, Takoradi and beyond. Instant SMS confirmation. Free for customers." },
      { property: "og:title", content: "Salonzee — Book Ghana's best salons in seconds" },
      { property: "og:description", content: "Browse vetted salons, pick a time, get an SMS confirmation. Free for customers." },
    ],
    links: [
      { rel: "preload", as: "image", href: heroImg, fetchpriority: "high" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(featuredSalonsQuery),
  component: Index,
});

function Index() {
  const { data: salons = [] } = useQuery(featuredSalonsQuery);


  return (
    <div className="min-h-dvh bg-background">
      <SiteNav />

      {/* Hero */}
      <section className="px-6 md:px-10 pt-12 md:pt-20 pb-20 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-secondary text-primary px-4 py-1.5 rounded-full text-xs font-semibold mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Now booking across Ghana
            </div>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.05]">
              Your next salon visit, <span className="text-primary">booked in seconds.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mb-8">
              Discover trusted hair, braid, barber and nail salons in Accra, Kumasi and beyond. Pick a time, confirm by SMS — no calls, no waiting.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/salons"
                className="bg-primary text-primary-foreground px-7 py-3.5 rounded-full text-base font-semibold shadow-sm hover:shadow-md transition-shadow text-center"
              >
                Find a salon
              </Link>
              <Link
                to="/register-salon"
                className="bg-card border border-border px-7 py-3.5 rounded-full text-base font-semibold hover:bg-muted transition-colors text-center"
              >
                List your salon
              </Link>
            </div>

            <div className="mt-10 flex items-center gap-8 text-sm text-muted-foreground">
              <Stat n={salons.length > 0 ? `${salons.length}+` : "New"} label="Vetted salons" />
              <span className="w-px h-10 bg-border" />
              <Stat n="< 30s" label="To book" />
              <span className="hidden sm:block w-px h-10 bg-border" />
              <Stat n="Free" label="For customers" className="hidden sm:flex" />
            </div>
          </div>

          <div className="relative">
            <div className="aspect-[4/5] rounded-3xl overflow-hidden ring-1 ring-border shadow-2xl">
              <img
                src={heroImg}
                alt="A stylist working with a client in a modern Ghanaian salon"
                className="size-full object-cover"
                width={1600}
                height={1280}
              />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-card border border-border rounded-2xl shadow-lg p-4 flex items-center gap-3 max-w-[240px]">
              <div className="h-10 w-10 rounded-full bg-secondary grid place-items-center text-primary">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Just booked</p>
                <p className="text-sm font-semibold leading-tight">Silk press — 2:30 PM, East Legon</p>
              </div>
            </div>
            <div className="absolute -top-5 -right-3 bg-card border border-border rounded-full shadow-md px-4 py-2 flex items-center gap-2">
              <Star className="h-4 w-4 text-orange fill-orange" />
              <span className="text-sm font-semibold">4.9 average rating</span>
            </div>
          </div>
        </div>
      </section>

      {/* Category strip */}
      <section className="px-6 md:px-10 py-16 max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Every kind of look</h2>
            <p className="text-muted-foreground mt-1">From precision fades to protective styles, the directory has you covered.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Category img={featBarber} icon={<Scissors className="h-4 w-4" />} title="Barbering" caption="Fades, line-ups, beard sculpts." />
          <Category img={featBraids} icon={<Sparkles className="h-4 w-4" />} title="Braids & natural hair" caption="Cornrows, knotless, twists, locs." />
          <Category img={featNails} icon={<Brush className="h-4 w-4" />} title="Nails & beauty" caption="Manicures, pedicures, lash, brows." />
        </div>
      </section>

      {/* Featured salons */}
      <section className="px-6 md:px-10 py-20 bg-muted/40 border-y border-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-10 flex-wrap gap-4">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Featured salons</h2>
              <p className="text-muted-foreground mt-1">Newly joined partners across Ghana.</p>
            </div>
            <Link to="/salons" className="text-sm font-semibold text-primary hover:underline">
              View all →
            </Link>
          </div>

          {salons.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl py-16 text-center">
              <p className="text-muted-foreground mb-4">The directory is opening. First salons coming soon.</p>
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
      <section className="px-6 md:px-10 py-24 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-3">Booking, simplified</h2>
          <p className="text-muted-foreground text-lg">Three steps between you and a great chair. No phone tag, no deposits.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { n: "01", t: "Discover", d: "Browse vetted salons by city, neighbourhood, and service. Filter to your style." },
            { n: "02", t: "Book a slot", d: "Pick a service and an open time. Real-time availability — no calls, no waiting." },
            { n: "03", t: "Show up", d: "Get an SMS confirmation and a 24-hour reminder. The salon is ready for you." },
          ].map((s) => (
            <div key={s.n} className="bg-card border border-border rounded-2xl p-7 hover:shadow-md transition-shadow">
              <p className="text-primary font-bold text-sm mb-3 tracking-wider">{s.n}</p>
              <h3 className="font-display text-xl font-bold mb-2">{s.t}</h3>
              <p className="text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-6 md:px-10 py-24 bg-muted/40 border-y border-border">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-center mb-14">Loved across Ghana</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="bg-card border border-border rounded-2xl p-7 flex flex-col">
                <div className="flex gap-0.5 mb-4" aria-label={`${t.rating} out of 5 stars`}>
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-orange fill-orange" />
                  ))}
                </div>
                <blockquote className="text-foreground/90 leading-relaxed mb-6 flex-1">"{t.quote}"</blockquote>
                <figcaption>
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-sm text-muted-foreground">{t.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 md:px-10 py-24 max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-3">Frequently asked</h2>
          <p className="text-muted-foreground text-lg">Everything you need before your first booking.</p>
        </div>
        <dl className="divide-y divide-border border-y border-border">
          {FAQ.map((f) => (
            <div key={f.q} className="py-6 grid md:grid-cols-[1fr_2fr] gap-4">
              <dt className="font-display text-lg font-semibold">{f.q}</dt>
              <dd className="text-muted-foreground leading-relaxed">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* For business */}
      <section className="px-6 md:px-10 pb-24 max-w-7xl mx-auto">
        <div className="bg-foreground text-background rounded-3xl p-10 md:p-16 grid md:grid-cols-2 gap-10 md:gap-14 items-center overflow-hidden relative">
          <div>
            <img src={logo} alt="Salonzee" className="h-10 md:h-12 w-auto mb-6 invert dark:invert-0" />
            <h3 className="font-display text-3xl md:text-4xl font-bold mb-4 leading-tight">Grow your salon with Salonzee.</h3>
            <p className="text-background/70 leading-relaxed mb-6 max-w-md">
              Manage bookings, services, and your calendar from one dashboard. Get discovered by thousands of clients across Ghana — free until you're earning.
            </p>
            <ul className="space-y-2.5 mb-8 text-background/80 text-sm">
              {["Real-time online booking, no double-bookings", "Automated SMS confirmations and 24h reminders", "Searchable profile in our public directory"].map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/register-salon"
              className="inline-block bg-primary text-primary-foreground px-7 py-3.5 rounded-full text-base font-semibold hover:opacity-90 transition-opacity shadow-lg"
            >
              Get started — free
            </Link>
          </div>
          <div className="hidden md:block relative">
            <div className="aspect-[4/5] rounded-2xl overflow-hidden ring-1 ring-background/10">
              <img src={featBarber} alt="Barber giving a precision fade" className="size-full object-cover" loading="lazy" width={1280} height={1600} />
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
      <BookingPulse salons={salons} />
    </div>
  );
}

function Stat({ n, label, className = "flex" }: { n: string; label: string; className?: string }) {
  return (
    <div className={`flex-col items-start ${className}`}>
      <p className="font-bold text-foreground text-xl font-display">{n}</p>
      <p className="text-xs uppercase tracking-wide">{label}</p>
    </div>
  );
}

function Category({
  img,
  icon,
  title,
  caption,
}: {
  img: string;
  icon: React.ReactNode;
  title: string;
  caption: string;
}) {
  return (
    <Link
      to="/salons"
      className="group relative block aspect-[4/5] rounded-2xl overflow-hidden ring-1 ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <img src={img} alt="" className="size-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" width={1280} height={1280} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
        <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider mb-2">
          {icon}
          {title}
        </div>
        <p className="text-sm text-white/90">{caption}</p>
      </div>
    </Link>
  );
}

const TESTIMONIALS = [
  {
    name: "Ama Owusu",
    role: "Customer, Accra",
    rating: 5,
    quote: "Booked knotless braids on a Saturday morning — confirmed by SMS in seconds. Showed up and my stylist was ready. This is how it should always work.",
  },
  {
    name: "Kwame Mensah",
    role: "Customer, Kumasi",
    rating: 5,
    quote: "I used to call three barbers before finding an open chair. Now I just open Salonzee, pick a time, and go.",
  },
  {
    name: "Akosua Boateng",
    role: "Salon owner, Tema",
    rating: 5,
    quote: "We've doubled weekday bookings since joining. The reminders cut our no-shows almost completely.",
  },
];

const FAQ = [
  {
    q: "Is Salonzee free for customers?",
    a: "Yes. Browsing and booking are completely free. You pay the salon directly for services on the day of your appointment.",
  },
  {
    q: "Do I need to pay a deposit?",
    a: "Not on Salonzee. You confirm a slot with your name and phone number, and you settle with the salon in person.",
  },
  {
    q: "Which cities do you cover?",
    a: "We're live across Greater Accra and growing fast into Kumasi, Takoradi, Cape Coast, Tema, and Tamale.",
  },
  {
    q: "How will I be reminded of my appointment?",
    a: "You'll receive an SMS confirmation immediately after booking and a friendly reminder 24 hours before your slot.",
  },
  {
    q: "I run a salon. How do I join?",
    a: "Tap 'List your salon', register in under two minutes, and our team will review and activate your profile within one business day.",
  },
];
