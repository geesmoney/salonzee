import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
        <h1 className="font-serif text-4xl mb-1">My bookings</h1>
        <p className="text-sm text-foreground/60 mb-8">{user?.email}</p>

        <div className="grid grid-cols-3 gap-3 mb-10">
          <Stat label="Upcoming" value={String(summary.upcoming)} />
          <Stat label="Completed" value={String(summary.completed)} />
          <Stat label="Total spent" value={formatGhs(summary.spent)} />
        </div>

        {q.isLoading ? (
          <p className="text-sm text-foreground/50">Loading…</p>
        ) : q.isError ? (
          <p className="text-sm text-destructive">Couldn't load your bookings. Please refresh.</p>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border border-foreground/10 p-8 text-center">
            <p className="font-semibold mb-2">No bookings yet</p>
            <p className="text-sm text-foreground/60 mb-5">Bookings you make while signed in will show up here.</p>
            <Link to="/salons" className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-full text-sm font-semibold">
              Find a salon
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((b) => {
              const salon = b.salons as { name: string; slug: string | null } | null;
              const svc = b.services as { name: string } | null;
              return (
                <li key={b.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-2xl border border-foreground/10 bg-card p-4">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{salon?.name ?? "Salon"}</p>
                    <p className="text-sm text-foreground/60 truncate">{svc?.name ?? "Service"}</p>
                    <p className="text-xs text-foreground/50 mt-1">{b.booking_date} · {b.start_time.slice(0, 5)}</p>
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
    <div className="rounded-2xl bg-card border border-foreground/10 p-3 sm:p-4 min-w-0">
      <p className="text-[10px] uppercase tracking-widest text-foreground/50">{label}</p>
      <p className="font-semibold text-base sm:text-xl truncate">{value}</p>
    </div>
  );
}
