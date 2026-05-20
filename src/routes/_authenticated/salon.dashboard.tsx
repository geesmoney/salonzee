import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];
import { useAuth } from "@/hooks/use-auth";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { formatGhs } from "@/lib/ghana";
import { formatTimeLabel } from "@/lib/slots";

export const Route = createFileRoute("/_authenticated/salon/dashboard")({
  head: () => ({ meta: [{ title: "Salon Dashboard — Salonzee" }] }),
  component: SalonDashboard,
});

type Tab = "overview" | "bookings" | "services";

function SalonDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["salon-dashboard", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: salon } = await supabase
        .from("salons")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (!salon) return { salon: null, bookings: [], services: [] };

      // Parallel fetch — no waterfall
      const [bookingsRes, servicesRes] = await Promise.all([
        supabase
          .from("bookings")
          .select("*, services(name)")
          .eq("salon_id", salon.id)
          .order("booking_date", { ascending: true })
          .order("start_time", { ascending: true }),
        supabase
          .from("services")
          .select("*")
          .eq("salon_id", salon.id)
          .order("created_at"),
      ]);
      return {
        salon,
        bookings: bookingsRes.data ?? [],
        services: servicesRes.data ?? [],
      };
    },
  });

  const salon = data?.salon ?? null;
  const bookings = data?.bookings ?? [];
  const services = data?.services ?? [];

  const invalidateDashboard = () =>
    qc.invalidateQueries({ queryKey: ["salon-dashboard", user?.id] });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BookingStatus }) => {
      const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Updated");
      invalidateDashboard();
    },
  });

  const addService = useMutation({
    mutationFn: async (s: { name: string; duration_minutes: number; price_ghs: number }) => {
      const { error } = await supabase.from("services").insert({ ...s, salon_id: salon!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Service added");
      invalidateDashboard();
    },
  });

  const toggleService = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("services").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateDashboard(),
  });

  const stats = useMemo(() => computeStats(bookings, services), [bookings, services]);

  if (loading || isLoading) return <DashboardSkeleton />;


  if (!salon) {
    return (
      <div className="min-h-dvh bg-background">
        <SiteNav />
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <h1 className="font-serif text-4xl mb-4">No salon yet</h1>
          <p className="text-foreground/60 mb-8">You haven't registered a salon. Submit one for review.</p>
          <a href="/register-salon" className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-[0.2em]">
            Register Salon
          </a>
        </div>
      </div>
    );
  }

  const publicUrl = salon.slug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/${salon.slug}`
    : null;

  return (
    <div className="min-h-dvh bg-background">
      <SiteNav />
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-12">
        <div className="flex items-baseline justify-between mb-8 gap-4 flex-wrap">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/40">Dashboard</p>
            <h1 className="font-serif text-5xl">{salon.name}</h1>
            <p className="text-sm text-foreground/60 mt-1">
              Status: <span className={`font-bold ${salon.status === "active" ? "text-green-700" : "text-clay"}`}>{salon.status}</span>
            </p>
          </div>
          <div className="flex gap-2">
            {publicUrl && salon.status === "active" && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(publicUrl);
                  toast.success("Link copied");
                }}
                className="text-xs font-bold uppercase tracking-[0.2em] border border-foreground/20 px-4 py-2 rounded-lg hover:bg-secondary"
              >
                Copy public link
              </button>
            )}
            <a href="/salon/settings" className="text-xs font-bold uppercase tracking-[0.2em] border border-foreground/20 px-4 py-2 rounded-lg hover:bg-secondary">
              Settings
            </a>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-foreground/10 mb-8">
          {(["overview", "bookings", "services"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] -mb-px border-b-2 ${
                tab === t ? "border-accent text-foreground" : "border-transparent text-foreground/40 hover:text-foreground"
              }`}
            >
              {t}
              {t === "bookings" && stats.pendingCount > 0 && (
                <span className="ml-2 bg-clay text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">{stats.pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <Overview stats={stats} bookings={bookings} salonSlug={salon.slug} publicUrl={publicUrl} />
        )}

        {tab === "bookings" && (
          <BookingsList bookings={bookings} onUpdate={(id, status) => updateStatus.mutate({ id, status })} />
        )}

        {tab === "services" && (
          <div>
            <ServiceForm onAdd={(s) => addService.mutate(s)} />
            <div className="space-y-3 mt-6">
              {services.map((s) => (
                <div key={s.id} className="bg-card border border-foreground/5 rounded-xl p-5 flex items-center gap-4">
                  <div className="flex-1">
                    <p className="font-bold">{s.name}</p>
                    <p className="text-sm text-foreground/60">{s.duration_minutes} mins • {formatGhs(s.price_ghs)}</p>
                  </div>
                  <button
                    onClick={() => toggleService.mutate({ id: s.id, active: !s.active })}
                    className={`text-xs font-bold uppercase tracking-[0.2em] px-3 py-2 rounded-lg ${
                      s.active ? "bg-secondary text-foreground" : "border border-foreground/20 text-foreground/40"
                    }`}
                  >
                    {s.active ? "Active" : "Inactive"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}

type Booking = {
  id: string;
  status: string;
  booking_date: string;
  start_time: string;
  customer_name: string;
  customer_phone: string;
  service_id: string | null;
  price_ghs_snapshot: number | string;
  services?: { name: string } | null;
};

type Service = {
  id: string;
  name: string;
  active: boolean;
  price_ghs: number | string;
  duration_minutes: number;
};

function computeStats(bookings: Booking[], services: Service[]) {
  const today = new Date();
  const todayKey = isoDate(today);
  const weekStart = isoDate(daysAgo(today, today.getDay() === 0 ? 6 : today.getDay() - 1));
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

  const revenue = (preds: (b: Booking) => boolean) =>
    bookings
      .filter((b) => b.status === "completed" && preds(b))
      .reduce((sum, b) => sum + Number(b.price_ghs_snapshot ?? 0), 0);

  const revenueToday = revenue((b) => b.booking_date === todayKey);
  const revenueWeek = revenue((b) => b.booking_date >= weekStart);
  const revenueMonth = revenue((b) => b.booking_date >= monthStart);
  const revenueTotal = revenue(() => true);

  const completed = bookings.filter((b) => b.status === "completed");
  const avgTicket = completed.length ? revenueTotal / completed.length : 0;

  const todayBookings = bookings
    .filter((b) => b.booking_date === todayKey && b.status !== "cancelled" && b.status !== "no_show")
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const upcoming = bookings
    .filter((b) => b.booking_date > todayKey && (b.status === "confirmed" || b.status === "pending"))
    .slice(0, 5);

  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const cancelledCount = bookings.filter((b) => b.status === "cancelled").length;
  const noShowCount = bookings.filter((b) => b.status === "no_show").length;
  const totalDone = completed.length + cancelledCount + noShowCount;
  const noShowRate = totalDone ? Math.round((noShowCount / totalDone) * 100) : 0;

  // Top services by completed-booking revenue
  const byService = new Map<string, { name: string; count: number; revenue: number }>();
  for (const b of completed) {
    const key = b.service_id ?? "unknown";
    const name = b.services?.name ?? "Unknown";
    const existing = byService.get(key) ?? { name, count: 0, revenue: 0 };
    existing.count += 1;
    existing.revenue += Number(b.price_ghs_snapshot ?? 0);
    byService.set(key, existing);
  }
  const topServices = Array.from(byService.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 3);

  // Unique customers (by phone)
  const phones = new Set<string>();
  const visitsByPhone = new Map<string, number>();
  for (const b of bookings) {
    if (b.status === "cancelled") continue;
    phones.add(b.customer_phone);
    visitsByPhone.set(b.customer_phone, (visitsByPhone.get(b.customer_phone) ?? 0) + 1);
  }
  const totalCustomers = phones.size;
  const repeatCustomers = Array.from(visitsByPhone.values()).filter((n) => n > 1).length;

  // Profile health
  const activeServices = services.filter((s) => s.active).length;

  return {
    revenueToday, revenueWeek, revenueMonth, revenueTotal,
    avgTicket, todayBookings, upcoming, pendingCount,
    noShowRate, topServices, totalCustomers, repeatCustomers,
    activeServices, totalServices: services.length,
    totalBookings: bookings.length, completedCount: completed.length,
  };
}

function Overview({
  stats, bookings, salonSlug, publicUrl,
}: {
  stats: ReturnType<typeof computeStats>;
  bookings: Booking[];
  salonSlug: string | null;
  publicUrl: string | null;
}) {
  return (
    <div className="space-y-10">
      {/* Revenue cards */}
      <div>
        <h2 className="text-[10px] uppercase tracking-[0.3em] text-foreground/40 mb-3">Revenue</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Today" value={formatGhs(stats.revenueToday)} accent />
          <StatCard label="This week" value={formatGhs(stats.revenueWeek)} />
          <StatCard label="This month" value={formatGhs(stats.revenueMonth)} />
          <StatCard label="All-time" value={formatGhs(stats.revenueTotal)} />
        </div>
      </div>

      {/* Operations cards */}
      <div>
        <h2 className="text-[10px] uppercase tracking-[0.3em] text-foreground/40 mb-3">Operations</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Pending bookings" value={stats.pendingCount} />
          <StatCard label="Avg ticket" value={formatGhs(stats.avgTicket)} />
          <StatCard label="No-show rate" value={`${stats.noShowRate}%`} />
          <StatCard label="Total bookings" value={stats.totalBookings} />
        </div>
      </div>

      {/* Customers */}
      <div>
        <h2 className="text-[10px] uppercase tracking-[0.3em] text-foreground/40 mb-3">Customers</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Unique customers" value={stats.totalCustomers} />
          <StatCard label="Repeat customers" value={stats.repeatCustomers} />
          <StatCard label="Active services" value={`${stats.activeServices} / ${stats.totalServices}`} />
          <StatCard label="Completed" value={stats.completedCount} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's schedule */}
        <div className="bg-card border border-foreground/5 rounded-2xl p-6">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-serif text-2xl">Today's schedule</h2>
            <span className="text-xs text-foreground/40">{stats.todayBookings.length} appointments</span>
          </div>
          {stats.todayBookings.length === 0 ? (
            <p className="text-foreground/40 italic text-sm py-8 text-center">Nothing on the books today.</p>
          ) : (
            <ul className="divide-y divide-foreground/5">
              {stats.todayBookings.map((b) => (
                <li key={b.id} className="py-3 flex items-center gap-3">
                  <span className="font-bold tabular-nums text-sm w-16">{formatTimeLabel(b.start_time)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{b.customer_name}</p>
                    <p className="text-xs text-foreground/50 truncate">{b.services?.name ?? "Service"}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Top services */}
        <div className="bg-card border border-foreground/5 rounded-2xl p-6">
          <h2 className="font-serif text-2xl mb-4">Top services</h2>
          {stats.topServices.length === 0 ? (
            <p className="text-foreground/40 italic text-sm py-8 text-center">No completed bookings yet — mark bookings as <em>Complete</em> to see revenue here.</p>
          ) : (
            <ul className="space-y-3">
              {stats.topServices.map((s) => (
                <li key={s.name} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{s.name}</p>
                    <p className="text-xs text-foreground/50">{s.count} {s.count === 1 ? "booking" : "bookings"}</p>
                  </div>
                  <p className="font-serif text-lg text-accent">{formatGhs(s.revenue)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Upcoming */}
      {stats.upcoming.length > 0 && (
        <div className="bg-card border border-foreground/5 rounded-2xl p-6">
          <h2 className="font-serif text-2xl mb-4">Coming up</h2>
          <ul className="divide-y divide-foreground/5">
            {stats.upcoming.map((b) => (
              <li key={b.id} className="py-3 flex items-center gap-3 text-sm">
                <span className="tabular-nums text-foreground/60 w-32">{b.booking_date} {formatTimeLabel(b.start_time)}</span>
                <span className="flex-1 truncate font-medium">{b.customer_name}</span>
                <span className="text-foreground/50 truncate hidden sm:inline">{b.services?.name}</span>
                <StatusBadge status={b.status} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Public link */}
      {publicUrl && (
        <div className="bg-secondary/40 border border-foreground/5 rounded-2xl p-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/40 mb-2">Your public booking link</p>
          <Link to="/$slug" params={{ slug: salonSlug! }} className="font-serif text-xl text-accent hover:underline break-all">
            {publicUrl}
          </Link>
          <p className="text-xs text-foreground/50 mt-2">Share this link on WhatsApp, Instagram, or anywhere customers find you.</p>
        </div>
      )}

      {/* Empty state nudge */}
      {bookings.length === 0 && stats.totalServices === 0 && (
        <div className="text-center py-10 text-foreground/50 text-sm">
          Start by adding your services in the Services tab so customers can book.
        </div>
      )}
    </div>
  );
}

function BookingsList({
  bookings, onUpdate,
}: {
  bookings: Booking[];
  onUpdate: (id: string, status: BookingStatus) => void;
}) {
  const [filter, setFilter] = useState<"all" | BookingStatus>("all");
  const filtered = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {(["all", "pending", "confirmed", "completed", "no_show", "cancelled"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-bold uppercase tracking-[0.15em] px-3 py-1.5 rounded-full ${
              filter === f ? "bg-foreground text-background" : "border border-foreground/15 text-foreground/60 hover:text-foreground"
            }`}
          >
            {f.replace("_", " ")}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {filtered.length === 0 && <p className="text-foreground/50 italic py-12 text-center">No bookings.</p>}
        {filtered.map((b) => (
          <div key={b.id} className="bg-card border border-foreground/5 rounded-xl p-5 flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <p className="font-bold">{b.customer_name}</p>
                <StatusBadge status={b.status} />
                {Number(b.price_ghs_snapshot) > 0 && (
                  <span className="text-xs text-foreground/50">{formatGhs(Number(b.price_ghs_snapshot))}</span>
                )}
              </div>
              <p className="text-sm text-foreground/60">
                {b.booking_date} • {formatTimeLabel(b.start_time)} • {b.services?.name ?? "Service"} • {b.customer_phone}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {b.status === "pending" && (
                <ActionBtn onClick={() => onUpdate(b.id, "confirmed")}>Confirm</ActionBtn>
              )}
              {b.status === "confirmed" && (
                <>
                  <ActionBtn onClick={() => onUpdate(b.id, "completed")}>Complete</ActionBtn>
                  <ActionBtn onClick={() => onUpdate(b.id, "no_show")}>No-show</ActionBtn>
                </>
              )}
              {(b.status === "pending" || b.status === "confirmed") && (
                <ActionBtn variant="ghost" onClick={() => onUpdate(b.id, "cancelled")}>Cancel</ActionBtn>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`border rounded-2xl p-5 ${accent ? "bg-accent/10 border-accent/30" : "bg-card border-foreground/5"}`}>
      <p className="text-[10px] uppercase tracking-widest text-foreground/40 mb-2">{label}</p>
      <p className="font-serif text-3xl break-words">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-900",
    confirmed: "bg-green-100 text-green-900",
    completed: "bg-secondary text-foreground",
    no_show: "bg-red-100 text-red-900",
    cancelled: "bg-foreground/10 text-foreground/60",
  };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${colors[status] ?? ""}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function ActionBtn({ children, onClick, variant }: { children: React.ReactNode; onClick: () => void; variant?: "ghost" }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-bold uppercase tracking-[0.18em] px-3 py-2 rounded-lg transition-colors ${
        variant === "ghost"
          ? "text-foreground/50 hover:text-destructive"
          : "bg-primary text-primary-foreground hover:bg-clay"
      }`}
    >
      {children}
    </button>
  );
}

function ServiceForm({ onAdd }: { onAdd: (s: { name: string; duration_minutes: number; price_ghs: number }) => void }) {
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(30);
  const [price, setPrice] = useState(0);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onAdd({ name: name.trim(), duration_minutes: duration, price_ghs: price });
        setName(""); setDuration(30); setPrice(0);
      }}
      className="bg-card border border-foreground/5 rounded-xl p-5 grid grid-cols-1 md:grid-cols-4 gap-3"
    >
      <div className="md:col-span-2">
        <label className="block text-[10px] uppercase tracking-widest text-foreground/40 mb-1">Service name</label>
        <input className="w-full bg-background border border-foreground/10 px-3 py-2 rounded-lg text-sm" placeholder="e.g. Hair braiding" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="block text-[10px] uppercase tracking-widest text-foreground/40 mb-1">Duration (minutes)</label>
        <input type="number" min={5} step={5} className="w-full bg-background border border-foreground/10 px-3 py-2 rounded-lg text-sm" placeholder="30" value={duration} onChange={(e) => setDuration(+e.target.value)} />
      </div>
      <div>
        <label className="block text-[10px] uppercase tracking-widest text-foreground/40 mb-1">Price (GHS)</label>
        <input type="number" min={0} step={1} className="w-full bg-background border border-foreground/10 px-3 py-2 rounded-lg text-sm" placeholder="0" value={price} onChange={(e) => setPrice(+e.target.value)} />
      </div>
      <button className="md:col-span-4 bg-primary text-primary-foreground py-3 rounded-lg font-bold uppercase text-xs tracking-[0.2em] hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">Add service</button>
    </form>
  );
}

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function daysAgo(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() - n);
  return x;
}

function DashboardSkeleton() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteNav />
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-12 animate-pulse">
        <div className="mb-8">
          <div className="h-3 w-20 bg-muted rounded mb-3" />
          <div className="h-12 w-72 bg-muted rounded mb-2" />
          <div className="h-4 w-40 bg-muted rounded" />
        </div>
        <div className="flex gap-2 border-b border-foreground/10 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 w-24 bg-muted rounded-t" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5">
              <div className="h-3 w-16 bg-muted rounded mb-3" />
              <div className="h-8 w-24 bg-muted rounded" />
            </div>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-2xl p-6 h-64" />
          <div className="bg-card border border-border rounded-2xl p-6 h-64" />
        </div>
      </section>
    </div>
  );
}
