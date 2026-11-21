import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck2, Search, WalletCards } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteNav } from "@/components/site-nav";
import { claimPendingBooking } from "@/lib/customer-account";
import { formatGhs } from "@/lib/ghana";
import { summariseCustomerBookings } from "@/lib/customer-bookings";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "My bookings — Salonzee" }, { name: "robots", content: "noindex" }] }),
  component: AccountPage,
});

function AccountPage() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["my-bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      await claimPendingBooking();
      const { data, error } = await supabase
        .from("bookings")
        .select("id, booking_date, start_time, status, price_ghs_snapshot, salons(name, slug), services(name)")
        .eq("customer_user_id", user!.id)
        .order("booking_date", { ascending: false })
        .order("start_time", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = q.data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const summary = summariseCustomerBookings(rows, today);

  return (
    <div className="min-h-dvh bg-background">
      <SiteNav />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">Customer account</p>
        <h1 className="font-display text-4xl font-bold tracking-tight mb-2">My bookings</h1>
        <p className="text-sm text-muted-foreground mb-8 break-all">{user?.email}</p>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-8">
          <Stat label="Upcoming" value={String(summary.upcoming)} />
          <Stat label="Completed" value={String(summary.completed)} />
          <Stat label="Total spent" value={formatGhs(summary.spent)} />
        </div>

        {q.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading your bookings…</p>
        ) : q.isError ? (
          <p className="text-sm text-destructive">Couldn't load your bookings. Please refresh.</p>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold mb-2">Your account is ready</h2>
            <p className="text-sm text-muted-foreground mb-7 leading-relaxed">You have no bookings here yet. Make your first booking while signed in and it will appear automatically.</p>
            <ol className="space-y-4 mb-8">
              <Step number="1" icon={<Search className="h-5 w-5" />} title="Find your service" text="Choose a salon, barber, nail technician or beauty professional." />
              <Step number="2" icon={<CalendarCheck2 className="h-5 w-5" />} title="Book while signed in" text="Your appointment will be saved to this page after booking." />
              <Step number="3" icon={<WalletCards className="h-5 w-5" />} title="Come back anytime" text="View upcoming visits, past appointments and completed spending." />
            </ol>
            <Link to="/salons" className="block sm:inline-block text-center bg-primary text-primary-foreground px-6 py-3.5 rounded-full text-sm font-semibold">
              Find a salon
            </Link>
            <p className="mt-6 text-xs text-muted-foreground leading-relaxed">Just booked without an account? Use the account offer on that booking confirmation within 24 hours to save it here.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((b) => {
              const salon = b.salons as { name: string; slug: string | null } | null;
              const svc = b.services as { name: string } | null;
              return (
                <li key={b.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-2xl border border-border bg-card p-4">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{salon?.name ?? "Salon"}</p>
                    <p className="text-sm text-muted-foreground truncate">{svc?.name ?? "Service"}</p>
                    <p className="text-xs text-muted-foreground mt-1">{b.booking_date} · {b.start_time.slice(0, 5)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{formatGhs(Number(b.price_ghs_snapshot))}</p>
                    <span className="inline-block mt-1 text-[10px] uppercase tracking-widest px-2 py-1 rounded-full bg-muted">{b.status}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-3 sm:p-4 min-w-0">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="font-semibold text-base sm:text-xl truncate">{value}</p>
    </div>
  );
}

function Step({ number, icon, title, text }: { number: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <li className="flex gap-3">
      <span className="relative h-10 w-10 rounded-full bg-secondary text-primary grid place-items-center shrink-0">
        {icon}
        <span className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center">{number}</span>
      </span>
      <div>
        <h3 className="font-semibold text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{text}</p>
      </div>
    </li>
  );
}
