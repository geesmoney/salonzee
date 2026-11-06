import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Search, CalendarCheck, MessageSquare, Star, History, ShieldCheck, Smartphone, MessageCircle,
  Store, Bell, CalendarSync, Images, Wallet, Users, Gift, BadgeCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { FeatureWalkthrough } from "@/components/feature-walkthroughs";
import { Button } from "@/components/ui/button";

const TITLE = "Features for customers and beauty businesses — Salonzee";
const DESC = "See everything Salonzee does: book salons, barbers, nail techs and more in Ghana, and help beauty businesses fill chairs with SMS, calendar sync and reviews.";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://salonzee.com/features" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://salonzee.com/features" }],
  }),
  component: FeaturesPage,
});

type Feature = { icon: LucideIcon; title: string; body: string };

const customer: Feature[] = [
  { icon: Search, title: "Find the right place", body: "Browse hair salons, barbers, braiders, nail techs, makeup artists, lash and spa businesses, and filter by type." },
  { icon: CalendarCheck, title: "Book in under a minute", body: "Pick a service, date and open time. No account needed to book." },
  { icon: MessageSquare, title: "SMS confirmation", body: "Get a text with your booking details and the shop's name and number." },
  { icon: MessageCircle, title: "WhatsApp the shop", body: "One tap opens a WhatsApp chat with the shop, with your booking already written in." },
  { icon: Star, title: "Real reviews", body: "Ratings come only from customers who actually had an appointment." },
  { icon: History, title: "Booking history", body: "Sign in to see past bookings and how much you've spent." },
  { icon: ShieldCheck, title: "No double bookings", body: "Times that are already taken can't be booked again, so your slot is yours." },
  { icon: Smartphone, title: "Works like an app", body: "Add Salonzee to your phone's home screen. Built for mobile first." },
];

const business: Feature[] = [
  { icon: Store, title: "Your own booking page", body: "A public page with your services, prices, photos, location and reviews." },
  { icon: Bell, title: "Instant booking alerts", body: "Get an SMS the moment someone books, even if you're not in the app." },
  { icon: CalendarSync, title: "Calendar sync", body: "Bookings show up in Google, Apple or Outlook Calendar automatically." },
  { icon: Images, title: "Photo gallery", body: "Show off your work. Choose your cover photo in one tap." },
  { icon: Wallet, title: "Earnings at a glance", body: "See bookings and money earned from your dashboard." },
  { icon: Star, title: "Collect reviews", body: "After an appointment, customers get a text inviting them to rate you." },
  { icon: Users, title: "Fewer no-shows and fake bookings", body: "Confirmations, reminders and bot protection keep your chairs for real customers." },
  { icon: Gift, title: "Refer and earn", body: "Refer other shops and earn free months when they're approved." },
];

function Grid({ items }: { items: Feature[] }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map(({ icon: Icon, title, body }) => (
        <div key={title} className="bg-card border border-border rounded-2xl p-5">
          <div className="h-10 w-10 rounded-full bg-secondary text-primary grid place-items-center mb-3">
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <h3 className="font-semibold mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
        </div>
      ))}
    </div>
  );
}

function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-16 space-y-16">
        <header className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 bg-secondary text-primary px-3.5 py-1.5 rounded-full text-xs font-semibold mb-4">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Everything in Salonzee
          </span>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4">Built for customers and beauty businesses</h1>
          <p className="text-muted-foreground text-lg">Book your next look in seconds, or fill your chairs without the phone calls.</p>
        </header>

        <section id="customers" aria-labelledby="customers-h">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <h2 id="customers-h" className="font-display text-3xl font-bold tracking-tight">For customers</h2>
              <p className="text-muted-foreground">Hair, nails, grooming and more, booked easily.</p>
            </div>
            <Button asChild size="lg"><Link to="/salons">Find a shop</Link></Button>
          </div>
          <FeatureWalkthrough audience="customer" />
          <Grid items={customer} />
        </section>

        <section id="business" aria-labelledby="business-h">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <h2 id="business-h" className="font-display text-3xl font-bold tracking-tight">For business owners</h2>
              <p className="text-muted-foreground">Salons, barbers, nail techs, makeup artists and spas.</p>
            </div>
            <Button asChild size="lg"><Link to="/register-salon">List your business free</Link></Button>
          </div>
          <FeatureWalkthrough audience="business" />
          <Grid items={business} />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
